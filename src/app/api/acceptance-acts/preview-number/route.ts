import { eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("ADMIN");
  const invoiceId = new URL(req.url).searchParams.get("invoiceId")?.trim();
  if (!invoiceId) {
    return Response.json({ data: { number: null } });
  }
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!invoice) {
    return Response.json({ error: "INVOICE_NOT_FOUND" }, { status: 404 });
  }
  return Response.json({ data: { number: invoice.number } });
}
