import { eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, contracts, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { buildInvoiceDocxBuffer } from "@/lib/invoice-docx";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/invoice/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const itemRows = await db.query.lineItems.findMany({ where: eq(lineItems.invoiceId, id) });

  const [customer, contractor] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, inv.customerCompanyId) }),
    db.query.companies.findFirst({ where: eq(companies.id, inv.contractorCompanyId) }),
  ]);
  if (!customer || !contractor) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 500 });
  }

  const linkedContract =
    inv.contractId != null
      ? await db.query.contracts.findFirst({ where: eq(contracts.id, inv.contractId) })
      : null;

  const buffer = buildInvoiceDocxBuffer({
    invoice: inv,
    customer,
    contractor,
    linkedContract: linkedContract
      ? { number: linkedContract.number, date: new Date(linkedContract.date) }
      : null,
    items: itemRows.map((it) => ({
      title: it.title,
      unit: it.unit,
      quantity: Number(it.quantity),
      price: Number(it.price),
    })),
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="invoice-${inv.number.replaceAll("/", "_")}.docx"`,
    },
  });
}

