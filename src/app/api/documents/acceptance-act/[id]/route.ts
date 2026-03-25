import { eq } from "drizzle-orm";

import { db } from "@/db";
import { acceptanceActs, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { renderDocxFromTextTemplate } from "@/lib/docx-template";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/acceptance-act/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const act = await db.query.acceptanceActs.findFirst({ where: eq(acceptanceActs.id, id) });
  if (!act) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.acceptanceActId, id) });

  const buffer = renderDocxFromTextTemplate({
    title: `Акт ${act.number}`,
    bodyLines: [
      `Дата: ${new Date(act.date).toLocaleDateString("uk-UA")}`,
      `Місце складання: ${act.signingLocation}`,
      `Дата завершення: ${new Date(act.completionDate).toLocaleDateString("uk-UA")}`,
      "",
      "Перелік робіт/послуг:",
      ...items.map((it, idx) => `${idx + 1}. ${it.title} (${it.unit}) — ${it.quantity} × ${it.price}`),
      "",
      `Разом (без ПДВ): ${act.totalWithoutVat}`,
      `ПДВ 20%: ${act.vat20}`,
      `Разом з ПДВ: ${act.totalWithVat}`,
    ],
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="acceptance-act-${act.number.replaceAll("/", "_")}.docx"`,
    },
  });
}

