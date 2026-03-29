import { eq } from "drizzle-orm";

import { db } from "@/db";
import { acceptanceActs, invoices, lineItems } from "@/db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * If an acceptance act exists for this invoice, updates its companies, contract,
 * totals, and line items to mirror the invoice (same shape as creating an act from invoice).
 */
export async function syncAcceptanceActFromInvoice(tx: Transaction, invoiceId: string) {
  const act = await tx.query.acceptanceActs.findFirst({
    where: eq(acceptanceActs.invoiceId, invoiceId),
  });
  if (!act) return;

  const inv = await tx.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv) return;

  const invItems = await tx.query.lineItems.findMany({
    where: eq(lineItems.invoiceId, invoiceId),
  });

  const now = new Date();

  await tx
    .update(acceptanceActs)
    .set({
      customerCompanyId: inv.customerCompanyId,
      contractorCompanyId: inv.contractorCompanyId,
      contractId: inv.contractId,
      totalWithoutVat: inv.totalWithoutVat,
      vat20: inv.vat20,
      totalWithVat: inv.totalWithVat,
      updatedAt: now,
    })
    .where(eq(acceptanceActs.id, act.id));

  await tx.delete(lineItems).where(eq(lineItems.acceptanceActId, act.id));

  if (invItems.length > 0) {
    await tx.insert(lineItems).values(
      invItems.map((it) => ({
        acceptanceActId: act.id,
        title: it.title,
        unit: it.unit,
        quantity: it.quantity,
        price: it.price,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
}
