import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { acceptanceActs, invoices, lineItems } from "@/db/schema";
import { nextDocumentNumber } from "@/db/numbering";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const createSchema = z.object({
  invoiceId: z.string().uuid(),
  date: z.string().min(1),
  signingLocation: z.string().min(1),
  completionDate: z.string().min(1),
  signerFullNameNom: z.string().min(1),
  signerFullNameGen: z.string().min(1),
  signerPositionNom: z.string().min(1),
  signerPositionGen: z.string().min(1),
  isSigned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET() {
  await requireRole("MANAGER");
  const rows = await db.select().from(acceptanceActs).orderBy(desc(acceptanceActs.date));
  return Response.json({ data: rows });
}

export async function POST(req: Request) {
  const { userId } = await requireRole("ADMIN");
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, parsed.data.invoiceId) });
  if (!invoice) return Response.json({ error: "INVOICE_NOT_FOUND" }, { status: 404 });

  const actForInvoice = await db.query.acceptanceActs.findFirst({
    where: eq(acceptanceActs.invoiceId, invoice.id),
  });
  if (actForInvoice) {
    return Response.json(
      {
        error: "ACCEPTANCE_ACT_ALREADY_EXISTS",
        acceptanceActId: actForInvoice.id,
      },
      { status: 409 },
    );
  }

  const invItems = await db.query.lineItems.findMany({ where: eq(lineItems.invoiceId, invoice.id) });

  const date = new Date(parsed.data.date);
  const completionDate = new Date(parsed.data.completionDate);
  if (Number.isNaN(date.getTime()) || Number.isNaN(completionDate.getTime())) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const number = await nextDocumentNumber({ documentType: "ACCEPTANCE_ACT", at: date });
  const now = new Date();

  const [created] = await db
    .insert(acceptanceActs)
    .values({
      number,
      date,
      signingLocation: parsed.data.signingLocation,
      completionDate,
      customerCompanyId: invoice.customerCompanyId,
      contractorCompanyId: invoice.contractorCompanyId,
      contractId: invoice.contractId,
      invoiceId: invoice.id,
      signerFullNameNom: parsed.data.signerFullNameNom,
      signerFullNameGen: parsed.data.signerFullNameGen,
      signerPositionNom: parsed.data.signerPositionNom,
      signerPositionGen: parsed.data.signerPositionGen,
      isSigned: parsed.data.isSigned ?? false,
      isArchived: parsed.data.isArchived ?? false,
      totalWithoutVat: invoice.totalWithoutVat,
      vat20: invoice.vat20,
      totalWithVat: invoice.totalWithVat,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(lineItems).values(
    invItems.map((it) => ({
      acceptanceActId: created!.id,
      title: it.title,
      unit: it.unit,
      quantity: it.quantity,
      price: it.price,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await writeAuditEvent({
    entityType: "ACCEPTANCE_ACT",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { after: created, fromInvoiceId: invoice.id },
  });

  return Response.json({ data: created }, { status: 201 });
}

