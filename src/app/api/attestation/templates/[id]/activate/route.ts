import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documentTemplates } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const row = await db.query.documentTemplates.findFirst({
    where: eq(documentTemplates.id, id),
  });
  if (!row) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(documentTemplates)
      .set({ isActive: false })
      .where(eq(documentTemplates.templateType, row.templateType));
    await tx.update(documentTemplates).set({ isActive: true }).where(eq(documentTemplates.id, id));
  });

  return Response.json({ ok: true });
}
