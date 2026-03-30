import { eq } from "drizzle-orm";

import { db } from "@/db";
import { acceptanceActs, companies, contracts, invoices, lineItems } from "@/db/schema";
import { buildAcceptanceActDocxBuffer } from "@/lib/acceptance-act-docx";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/acceptance-act/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const act = await db.query.acceptanceActs.findFirst({ where: eq(acceptanceActs.id, id) });
  if (!act) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, act.invoiceId) });
  if (!invoice) return Response.json({ error: "INVOICE_NOT_FOUND" }, { status: 404 });
  const customer = await db.query.companies.findFirst({ where: eq(companies.id, invoice.customerCompanyId) });
  const contractor = await db.query.companies.findFirst({
    where: eq(companies.id, invoice.contractorCompanyId),
  });
  if (!customer || !contractor) return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });

  const linkedContract = invoice.contractId
    ? await db.query.contracts.findFirst({
        where: eq(contracts.id, invoice.contractId),
        columns: { number: true, date: true },
      })
    : null;
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.acceptanceActId, id) });

  const buffer = buildAcceptanceActDocxBuffer({
    act,
    invoice,
    customer,
    contractor,
    linkedContract,
    items: items.map((it) => ({
      title: it.title,
      unit: it.unit,
      quantity: Number(it.quantity),
      price: Number(it.price),
    })),
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="acceptance-act-${act.number.replaceAll("/", "_")}.docx"`,
    },
  });
}

