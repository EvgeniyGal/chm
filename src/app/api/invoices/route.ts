import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { contracts, invoices, lineItems } from "@/db/schema";
import { nextDocumentNumber } from "@/db/numbering";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { calcTotals } from "@/lib/totals";
import { invoiceApiLineItemSchema } from "@/lib/invoice-api-item-schema";

export const runtime = "nodejs";

const createSchema = z
  .object({
    date: z.string().min(1),
    customerCompanyId: z.string().uuid(),
    contractorCompanyId: z.string().uuid(),
    contractId: z.string().uuid().optional().nullable(),
    workType: z.enum(["WORKS", "SERVICES"]).optional(),
    isExternalContract: z.boolean().default(false),
    externalContractNumber: z.string().optional().nullable(),
    externalContractDate: z.string().optional().nullable(),
    signerFullNameNom: z.string().min(1),
    signerPositionNom: z.string().min(1),
    items: z.array(invoiceApiLineItemSchema).min(1),
  })
  .refine((data) => data.customerCompanyId !== data.contractorCompanyId, {
    message: "CUSTOMER_AND_CONTRACTOR_MUST_DIFFER",
    path: ["contractorCompanyId"],
  });

export async function GET() {
  await requireRole("MANAGER");
  const rows = await db.select().from(invoices).orderBy(desc(invoices.date));
  return Response.json({ data: rows });
}

export async function POST(req: Request) {
  const { userId } = await requireRole("ADMIN");
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });

  if (parsed.data.isExternalContract) {
    if (!parsed.data.externalContractNumber || !parsed.data.externalContractDate) {
      return Response.json({ error: "EXTERNAL_CONTRACT_FIELDS_REQUIRED" }, { status: 400 });
    }
  }

  let workType: "WORKS" | "SERVICES" = parsed.data.workType ?? "WORKS";

  if (parsed.data.contractId) {
    const linkedContract = await db.query.contracts.findFirst({ where: eq(contracts.id, parsed.data.contractId) });
    if (!linkedContract) {
      return Response.json({ error: "CONTRACT_NOT_FOUND" }, { status: 400 });
    }
    if (
      linkedContract.customerCompanyId !== parsed.data.customerCompanyId ||
      linkedContract.contractorCompanyId !== parsed.data.contractorCompanyId
    ) {
      return Response.json({ error: "INVOICE_COMPANIES_MISMATCH_CONTRACT" }, { status: 400 });
    }
    workType = linkedContract.workType;

    // Enforce remaining-quantity constraints by sourceContractLineItemId.
    const invoiceItemsBySource = new Map<string, number>();
    for (const it of parsed.data.items) {
      if (!it.sourceContractLineItemId) continue;
      invoiceItemsBySource.set(
        it.sourceContractLineItemId,
        (invoiceItemsBySource.get(it.sourceContractLineItemId) ?? 0) + it.quantity,
      );
    }

    for (const [sourceId, qty] of invoiceItemsBySource) {
      const contractItem = await db.query.lineItems.findFirst({ where: eq(lineItems.id, sourceId) });
      if (!contractItem || contractItem.contractId !== parsed.data.contractId) {
        return Response.json({ error: "INVALID_SOURCE_LINE_ITEM" }, { status: 400 });
      }

      const already = await db.execute<{ sum: string | null }>(
        sql`select coalesce(sum(quantity), 0) as sum
            from line_items
            where invoice_id is not null
              and source_contract_line_item_id = ${sourceId}`,
      );
      const used = Number(already.rows[0]?.sum ?? 0);
      const contractQty = Number(contractItem.quantity);
      if (used + qty > contractQty + 1e-9) {
        return Response.json({ error: "QUANTITY_EXCEEDS_REMAINING", sourceId, remaining: contractQty - used }, { status: 400 });
      }
    }
  }

  const totals = calcTotals(parsed.data.items);
  const number = await nextDocumentNumber({ documentType: "INVOICE", at: date });
  const now = new Date();

  const externalDate = parsed.data.externalContractDate ? new Date(parsed.data.externalContractDate) : null;
  if (externalDate && Number.isNaN(externalDate.getTime())) {
    return Response.json({ error: "INVALID_EXTERNAL_CONTRACT_DATE" }, { status: 400 });
  }

  const [created] = await db
    .insert(invoices)
    .values({
      number,
      date,
      workType,
      customerCompanyId: parsed.data.customerCompanyId,
      contractorCompanyId: parsed.data.contractorCompanyId,
      contractId: parsed.data.contractId ?? null,
      isExternalContract: parsed.data.isExternalContract,
      externalContractNumber: parsed.data.externalContractNumber ?? null,
      externalContractDate: externalDate,
      signerFullNameNom: parsed.data.signerFullNameNom,
      signerPositionNom: parsed.data.signerPositionNom,
      totalWithoutVat: String(totals.totalWithoutVat),
      vat20: String(totals.vat20),
      totalWithVat: String(totals.totalWithVat),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(lineItems).values(
    parsed.data.items.map((it) => ({
      invoiceId: created!.id,
      title: it.title,
      unit: it.unit,
      quantity: String(it.quantity),
      price: String(it.price),
      sourceContractLineItemId: it.sourceContractLineItemId ?? null,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await writeAuditEvent({
    entityType: "INVOICE",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { after: created, items: parsed.data.items },
  });

  return Response.json({ data: created }, { status: 201 });
}

