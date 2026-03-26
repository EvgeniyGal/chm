import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { contracts, lineItems } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
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
    items: z.array(itemSchema).min(1).optional(),
  })
  .refine((v) => {
    if (!v.customerCompanyId || !v.contractorCompanyId) return true;
    return v.customerCompanyId !== v.contractorCompanyId;
  }, { message: "CUSTOMER_AND_CONTRACTOR_SAME" })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export async function GET(_req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;
  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });
  return Response.json({ data: { contract, items } });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;

  const before = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: any = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.date) {
    const d = new Date(parsed.data.date);
    if (Number.isNaN(d.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });
    updates.date = d;
  }

  let itemsAfter: any[] | undefined;
  if (parsed.data.items) {
    const totals = calcTotals(parsed.data.items);
    updates.totalWithoutVat = String(totals.totalWithoutVat);
    updates.vat20 = String(totals.vat20);
    updates.totalWithVat = String(totals.totalWithVat);

    await db.transaction(async (tx) => {
      await tx.delete(lineItems).where(eq(lineItems.contractId, id));
      const now = new Date();
      await tx.insert(lineItems).values(
        parsed.data.items!.map((it) => ({
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
    itemsAfter = parsed.data.items;
  }

  const [after] = await db.update(contracts).set(updates).where(eq(contracts.id, id)).returning();

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
  const [deleted] = await db.delete(contracts).where(eq(contracts.id, id)).returning();
  if (!deleted) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  await writeAuditEvent({
    entityType: "CONTRACT",
    entityId: id,
    action: "DELETE",
    actorUserId: userId,
    diff: { before },
  });

  return Response.json({ ok: true });
}

