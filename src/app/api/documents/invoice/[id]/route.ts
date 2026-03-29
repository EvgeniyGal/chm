import { eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { renderDocxFromTextTemplate } from "@/lib/docx-template";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/invoice/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.invoiceId, id) });

  const worksOrServicesLabel = inv.workType === "SERVICES" ? "Перелік послуг:" : "Перелік робіт:";

  const buffer = renderDocxFromTextTemplate({
    title: `Рахунок ${inv.number}`,
    bodyLines: [
      `Дата: ${new Date(inv.date).toLocaleDateString("uk-UA")}`,
      "",
      worksOrServicesLabel,
      ...items.map((it, idx) => `${idx + 1}. ${it.title} (${it.unit}) — ${it.quantity} × ${it.price}`),
      "",
      `Разом (без ПДВ): ${inv.totalWithoutVat}`,
      `ПДВ 20%: ${inv.vat20}`,
      `Разом з ПДВ: ${inv.totalWithVat}`,
    ],
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="invoice-${inv.number.replaceAll("/", "_")}.docx"`,
    },
  });
}

