import { eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices, lineItems } from "@/db/schema";
import { nextDocumentNumber } from "@/db/numbering";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: RouteContext<"/api/invoices/[id]/analogue">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;

  const source = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!source) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (source.contractId) {
    return Response.json({ error: "SOURCE_NOT_PRIMARY_INVOICE" }, { status: 400 });
  }

  const sourceItems = await db.query.lineItems.findMany({ where: eq(lineItems.invoiceId, id) });
  if (sourceItems.length === 0) {
    return Response.json({ error: "SOURCE_HAS_NO_ITEMS" }, { status: 400 });
  }

  const now = new Date();
  const number = await nextDocumentNumber({ documentType: "INVOICE", at: now });

  const [created] = await db
    .insert(invoices)
    .values({
      number,
      date: now,
      workType: source.workType,
      customerCompanyId: source.customerCompanyId,
      contractorCompanyId: source.contractorCompanyId,
      contractId: source.contractId,
      isExternalContract: Boolean(source.isExternalContract),
      externalContractNumber: source.externalContractNumber,
      externalContractDate: source.externalContractDate,
      signerFullNameNom: source.signerFullNameNom,
      signerPositionNom: source.signerPositionNom,
      totalWithoutVat: String(source.totalWithoutVat),
      vat20: String(source.vat20),
      totalWithVat: String(source.totalWithVat),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(lineItems).values(
    sourceItems.map((it) => ({
      invoiceId: created!.id,
      title: it.title,
      unit: it.unit,
      quantity: String(it.quantity),
      price: String(it.price),
      sourceContractLineItemId: it.sourceContractLineItemId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await writeAuditEvent({
    entityType: "INVOICE",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { sourceInvoiceId: source.id, after: created },
    note: "Generated analogue",
  });

  return Response.json({ data: created }, { status: 201 });
}

