import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    shortName: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    contacts: z.array(z.object({ type: z.string().min(1), value: z.string().min(1) })).optional(),
    edrpouCode: z.string().min(1).optional(),
    vatIdTin: z.string().optional().nullable(),
    taxStatus: z.string().min(1).optional(),
    iban: z.string().min(1).optional(),
    bank: z.string().min(1).optional(),

    contractSignerFullNameNom: z.string().min(1).optional(),
    contractSignerFullNameGen: z.string().min(1).optional(),
    contractSignerPositionNom: z.string().min(1).optional(),
    contractSignerPositionGen: z.string().min(1).optional(),
    contractSignerActingUnder: z.string().min(1).optional(),

    actSignerFullNameNom: z.string().min(1).optional(),
    actSignerFullNameGen: z.string().min(1).optional(),
    actSignerPositionNom: z.string().min(1).optional(),
    actSignerPositionGen: z.string().min(1).optional(),

    invoiceSignerFullNameNom: z.string().min(1).optional(),
    invoiceSignerPositionNom: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;
  const row = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ data: row });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/companies/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const before = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const updates: any = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.contacts) updates.contacts = JSON.stringify(parsed.data.contacts);

  const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
  if (!updated) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  await writeAuditEvent({
    entityType: "COMPANY",
    entityId: id,
    action: "UPDATE",
    actorUserId: userId,
    diff: { before, after: updated },
  });

  return Response.json({ data: updated });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/companies/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const [deleted] = await db.delete(companies).where(eq(companies.id, id)).returning();
  if (!deleted) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  await writeAuditEvent({
    entityType: "COMPANY",
    entityId: id,
    action: "DELETE",
    actorUserId: userId,
    diff: { before: deleted },
  });

  return Response.json({ ok: true });
}

