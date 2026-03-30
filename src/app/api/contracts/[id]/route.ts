import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { contracts, lineItems } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { deleteContractAndRelatedRecords } from "@/lib/contract-delete-cascade";
import { calcTotals } from "@/lib/totals";
import { DROPDOWN_SCOPE, saveDropdownOption } from "@/lib/dropdown-options";

export const runtime = "nodejs";

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().min(0),
  price: z.number().min(0),
});

const patchSchema = z
  .object({
    date: z.string().min(1).optional(),
    signingLocation: z.string().min(1).optional(),
    customerCompanyId: z.string().uuid().optional(),
    contractorCompanyId: z.string().uuid().optional(),
    projectTimeline: z.string().min(1).optional(),
    contractDuration: z.string().min(1).optional(),
    signerFullNameNom: z.string().min(1).optional(),
    signerFullNameGen: z.string().min(1).optional(),
    signerPositionNom: z.string().min(1).optional(),
    signerPositionGen: z.string().min(1).optional(),
    signerActingUnder: z.string().min(1).optional(),
    isSigned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    items: z.array(itemSchema).min(1).optional(),
  })
  .refine((v) => {
    if (!v.customerCompanyId || !v.contractorCompanyId) return true;
    return v.customerCompanyId !== v.contractorCompanyId;
  }, { message: "CUSTOMER_AND_CONTRACTOR_SAME" })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

/** List quick-actions: only paper/cupboard flags; allowed for MANAGER+. */
const flagsOnlySchema = z
  .object({
    isSigned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.isSigned !== undefined || v.isArchived !== undefined, { message: "No fields to update" });

export async function GET(_req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;
  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });
  return Response.json({ data: { contract, items } });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);

  const flagsParsed = flagsOnlySchema.safeParse(json);
  if (flagsParsed.success) {
    const { userId } = await requireRole("MANAGER");
    const before = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
    if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (flagsParsed.data.isSigned !== undefined) updates.isSigned = flagsParsed.data.isSigned;
    if (flagsParsed.data.isArchived !== undefined) updates.isArchived = flagsParsed.data.isArchived;

    const [after] = await db.update(contracts).set(updates as Record<string, unknown>).where(eq(contracts.id, id)).returning();

    await writeAuditEvent({
      entityType: "CONTRACT",
      entityId: id,
      action: "UPDATE",
      actorUserId: userId,
      diff: { before, after },
    });

    return Response.json({ data: after });
  }

  const { userId } = await requireRole("ADMIN");
  const before = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const { items: itemsPayload, ...contractPatch } = parsed.data;
  const updates: Record<string, unknown> = { ...contractPatch, updatedAt: new Date() };
  if (parsed.data.date) {
    const d = new Date(parsed.data.date);
    if (Number.isNaN(d.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });
    updates.date = d;
  }

  let itemsAfter: any[] | undefined;
  if (itemsPayload) {
    const totals = calcTotals(itemsPayload);
    updates.totalWithoutVat = String(totals.totalWithoutVat);
    updates.vat20 = String(totals.vat20);
    updates.totalWithVat = String(totals.totalWithVat);

    await db.transaction(async (tx) => {
      await tx.delete(lineItems).where(eq(lineItems.contractId, id));
      const now = new Date();
      await tx.insert(lineItems).values(
        itemsPayload.map((it) => ({
          contractId: id,
          title: it.title,
          unit: it.unit,
          quantity: String(it.quantity),
          price: String(it.price),
          createdAt: now,
          updatedAt: now,
        })),
      );
    });
    itemsAfter = itemsPayload;
  }

  const [after] = await db.update(contracts).set(updates as Record<string, unknown>).where(eq(contracts.id, id)).returning();

  if (parsed.data.signingLocation) {
    // Keep dropdown options in sync with what admins used on the contract.
    await saveDropdownOption(DROPDOWN_SCOPE.SIGNING_LOCATION, parsed.data.signingLocation);
  }

  await writeAuditEvent({
    entityType: "CONTRACT",
    entityId: id,
    action: "UPDATE",
    actorUserId: userId,
    diff: { before, after, items: itemsAfter ? { after: itemsAfter } : undefined },
  });

  return Response.json({ data: after });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const before = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  await deleteContractAndRelatedRecords(id);

  await writeAuditEvent({
    entityType: "CONTRACT",
    entityId: id,
    action: "DELETE",
    actorUserId: userId,
    diff: { before },
  });

  return Response.json({ ok: true });
}

