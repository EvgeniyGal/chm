import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    signerFullNameNom: z.string().min(1).optional(),
    signerPositionNom: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export async function PATCH(req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const before = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const [after] = await db
    .update(invoices)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(invoices.id, id))
    .returning();

  await writeAuditEvent({
    entityType: "INVOICE",
    entityId: id,
    action: "UPDATE",
    actorUserId: userId,
    diff: { before, after },
  });

  return Response.json({ data: after });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const before = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  const [deleted] = await db.delete(invoices).where(eq(invoices.id, id)).returning();
  if (!deleted) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  await writeAuditEvent({
    entityType: "INVOICE",
    entityId: id,
    action: "DELETE",
    actorUserId: userId,
    diff: { before },
  });

  return Response.json({ ok: true });
}

