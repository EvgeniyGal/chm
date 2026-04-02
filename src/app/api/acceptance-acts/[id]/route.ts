import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { acceptanceActs } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    signingLocation: z.string().min(1).optional(),
    completionDate: z.union([z.string(), z.null()]).optional(),
    signerFullNameNom: z.string().min(1).optional(),
    signerFullNameGen: z.string().min(1).optional(),
    signerPositionNom: z.string().min(1).optional(),
    signerPositionGen: z.string().min(1).optional(),
    isSigned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export async function PATCH(req: Request, ctx: RouteContext<"/api/acceptance-acts/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const before = await db.query.acceptanceActs.findFirst({ where: eq(acceptanceActs.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const { completionDate, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (completionDate !== undefined) {
    if (completionDate === null || completionDate === "") {
      updates.completionDate = null;
    } else {
      const d = new Date(completionDate);
      if (Number.isNaN(d.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });
      updates.completionDate = d;
    }
  }

  const [after] = await db.update(acceptanceActs).set(updates).where(eq(acceptanceActs.id, id)).returning();

  await writeAuditEvent({
    entityType: "ACCEPTANCE_ACT",
    entityId: id,
    action: "UPDATE",
    actorUserId: userId,
    diff: { before, after },
  });

  return Response.json({ data: after });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/acceptance-acts/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const before = await db.query.acceptanceActs.findFirst({ where: eq(acceptanceActs.id, id) });
  const [deleted] = await db.delete(acceptanceActs).where(eq(acceptanceActs.id, id)).returning();
  if (!deleted) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  await writeAuditEvent({
    entityType: "ACCEPTANCE_ACT",
    entityId: id,
    action: "DELETE",
    actorUserId: userId,
    diff: { before },
  });

  return Response.json({ ok: true });
}

