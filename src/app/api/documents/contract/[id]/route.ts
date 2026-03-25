import { eq } from "drizzle-orm";

import { db } from "@/db";
import { contracts, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { renderDocxFromTextTemplate } from "@/lib/docx-template";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/contract/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });

  const buffer = renderDocxFromTextTemplate({
    title: `Договір ${contract.number}`,
    bodyLines: [
      `Дата: ${new Date(contract.date).toLocaleDateString("uk-UA")}`,
      `Місце складання: ${contract.signingLocation}`,
      "",
      "Перелік робіт/послуг:",
      ...items.map((it, idx) => `${idx + 1}. ${it.title} (${it.unit}) — ${it.quantity} × ${it.price}`),
      "",
      `Разом (без ПДВ): ${contract.totalWithoutVat}`,
      `ПДВ 20%: ${contract.vat20}`,
      `Разом з ПДВ: ${contract.totalWithVat}`,
    ],
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="contract-${contract.number.replaceAll("/", "_")}.docx"`,
    },
  });
}

