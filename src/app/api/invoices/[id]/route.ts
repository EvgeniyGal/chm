import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { invoices, lineItems } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { calcTotals } from "@/lib/totals";
import { invoiceApiLineItemSchema } from "@/lib/invoice-api-item-schema";

export const runtime = "nodejs";

const itemSchema = invoiceApiLineItemSchema;

const contractLinkedPatchSchema = z
  .object({
    date: z.string().min(1).optional(),
    items: z.array(itemSchema).min(1).optional(),
  })
  .strict()
  .refine((v) => v.date !== undefined || v.items !== undefined, { message: "No fields to update" })
  .refine(
    (v) => {
      if (!v.items) return true;
      return v.items.every((it) => it.sourceContractLineItemId != null && it.sourceContractLineItemId !== "");
    },
    { message: "CONTRACT_INVOICE_ITEMS_NEED_SOURCE", path: ["items"] },
  );

const standalonePatchSchema = z
  .object({
    date: z.string().min(1).optional(),
    workType: z.enum(["WORKS", "SERVICES"]).optional(),
    customerCompanyId: z.string().uuid().optional(),
    contractorCompanyId: z.string().uuid().optional(),
    isExternalContract: z.boolean().optional(),
    externalContractNumber: z.string().nullable().optional(),
    externalContractDate: z.string().nullable().optional(),
    signerFullNameNom: z.string().min(1).optional(),
    signerPositionNom: z.string().min(1).optional(),
    items: z.array(itemSchema).min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" })
  .refine(
    (v) => {
      if (!v.customerCompanyId || !v.contractorCompanyId) return true;
      return v.customerCompanyId !== v.contractorCompanyId;
    },
    { message: "CUSTOMER_AND_CONTRACTOR_MUST_DIFFER", path: ["contractorCompanyId"] },
  );

async function validateContractInvoiceQuantities(
  contractId: string,
  invoiceId: string,
  items: { sourceContractLineItemId?: string | null; quantity: number }[],
): Promise<
  | { ok: true }
  | { ok: false; error: string; sourceId?: string; remaining?: number }
> {
  const invoiceItemsBySource = new Map<string, number>();
  for (const it of items) {
    if (!it.sourceContractLineItemId) return { ok: false, error: "SOURCE_REQUIRED" };
    invoiceItemsBySource.set(
      it.sourceContractLineItemId,
      (invoiceItemsBySource.get(it.sourceContractLineItemId) ?? 0) + it.quantity,
    );
  }

  for (const [sourceId, qty] of invoiceItemsBySource) {
    const contractItem = await db.query.lineItems.findFirst({ where: eq(lineItems.id, sourceId) });
    if (!contractItem || contractItem.contractId !== contractId) {
      return { ok: false, error: "INVALID_SOURCE_LINE_ITEM" };
    }

    const already = await db.execute<{ sum: string | null }>(
      sql`select coalesce(sum(quantity), 0) as sum
          from line_items
          where invoice_id is not null
            and invoice_id <> ${invoiceId}
            and source_contract_line_item_id = ${sourceId}`,
    );
    const used = Number(already.rows[0]?.sum ?? 0);
    const contractQty = Number(contractItem.quantity);
    if (used + qty > contractQty + 1e-9) {
      return { ok: false, error: "QUANTITY_EXCEEDS_REMAINING", sourceId, remaining: contractQty - used };
    }
  }

  return { ok: true };
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;
  const before = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!before) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const json = await req.json().catch(() => null);

  if (before.contractId) {
    const parsed = contractLinkedPatchSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.items) {
      const v = await validateContractInvoiceQuantities(before.contractId, id, parsed.data.items);
      if (!v.ok) {
        if (v.error === "SOURCE_REQUIRED") {
          return Response.json({ error: "SOURCE_REQUIRED" }, { status: 400 });
        }
        if (v.error === "INVALID_SOURCE_LINE_ITEM") {
          return Response.json({ error: "INVALID_SOURCE_LINE_ITEM" }, { status: 400 });
        }
        if (v.error === "QUANTITY_EXCEEDS_REMAINING") {
          return Response.json(
            { error: "QUANTITY_EXCEEDS_REMAINING", sourceId: v.sourceId, remaining: v.remaining },
            { status: 400 },
          );
        }
      }
    }

    let nextDate = before.date;
    if (parsed.data.date) {
      const d = new Date(parsed.data.date);
      if (Number.isNaN(d.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });
      nextDate = d;
    }

    const itemsPayload = parsed.data.items;
    const totals = itemsPayload ? calcTotals(itemsPayload) : null;
    const now = new Date();

    const [after] = await db.transaction(async (tx) => {
      if (itemsPayload) {
        await tx.delete(lineItems).where(eq(lineItems.invoiceId, id));
        await tx.insert(lineItems).values(
          itemsPayload.map((it) => ({
            invoiceId: id,
            title: it.title,
            unit: it.unit,
            quantity: String(it.quantity),
            price: String(it.price),
            sourceContractLineItemId: it.sourceContractLineItemId ?? null,
            createdAt: now,
            updatedAt: now,
          })),
        );
      }

      const [row] = await tx
        .update(invoices)
        .set({
          date: nextDate,
          ...(totals
            ? {
                totalWithoutVat: String(totals.totalWithoutVat),
                vat20: String(totals.vat20),
                totalWithVat: String(totals.totalWithVat),
              }
            : {}),
          updatedAt: now,
        })
        .where(eq(invoices.id, id))
        .returning();

      return [row];
    });

    await writeAuditEvent({
      entityType: "INVOICE",
      entityId: id,
      action: "UPDATE",
      actorUserId: userId,
      diff: { before, after },
    });

    return Response.json({ data: after });
  }

  const parsed = standalonePatchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const nextIsExternal = data.isExternalContract ?? before.isExternalContract;
  const nextExtNum =
    data.externalContractNumber !== undefined ? data.externalContractNumber : before.externalContractNumber;
  const nextExtDateRaw =
    data.externalContractDate !== undefined ? data.externalContractDate : before.externalContractDate;

  if (nextIsExternal) {
    if (!nextExtNum?.trim() || !nextExtDateRaw) {
      return Response.json({ error: "EXTERNAL_CONTRACT_FIELDS_REQUIRED" }, { status: 400 });
    }
  }

  let nextExternalDate: Date | null = before.externalContractDate;
  if (data.externalContractDate !== undefined) {
    if (data.externalContractDate === null || data.externalContractDate === "") {
      nextExternalDate = null;
    } else {
      const d = new Date(data.externalContractDate);
      if (Number.isNaN(d.getTime())) return Response.json({ error: "INVALID_EXTERNAL_CONTRACT_DATE" }, { status: 400 });
      nextExternalDate = d;
    }
  }

  let nextDate = before.date;
  if (data.date) {
    const d = new Date(data.date);
    if (Number.isNaN(d.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });
    nextDate = d;
  }

  const itemsPayload = data.items;
  const totals = itemsPayload ? calcTotals(itemsPayload) : null;
  const now = new Date();

  const [after] = await db.transaction(async (tx) => {
    if (itemsPayload) {
      await tx.delete(lineItems).where(eq(lineItems.invoiceId, id));
      await tx.insert(lineItems).values(
        itemsPayload.map((it) => ({
          invoiceId: id,
          title: it.title,
          unit: it.unit,
          quantity: String(it.quantity),
          price: String(it.price),
          sourceContractLineItemId: it.sourceContractLineItemId ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    const clearExternal = data.isExternalContract === false;

    const [row] = await tx
      .update(invoices)
      .set({
        ...(data.date ? { date: nextDate } : {}),
        ...(data.workType !== undefined ? { workType: data.workType } : {}),
        ...(data.customerCompanyId !== undefined ? { customerCompanyId: data.customerCompanyId } : {}),
        ...(data.contractorCompanyId !== undefined ? { contractorCompanyId: data.contractorCompanyId } : {}),
        ...(data.isExternalContract !== undefined ? { isExternalContract: data.isExternalContract } : {}),
        ...(clearExternal
          ? { externalContractNumber: null, externalContractDate: null }
          : {
              ...(data.externalContractNumber !== undefined
                ? { externalContractNumber: data.externalContractNumber }
                : {}),
              ...(data.externalContractDate !== undefined ? { externalContractDate: nextExternalDate } : {}),
            }),
        ...(data.signerFullNameNom !== undefined ? { signerFullNameNom: data.signerFullNameNom } : {}),
        ...(data.signerPositionNom !== undefined ? { signerPositionNom: data.signerPositionNom } : {}),
        ...(totals
          ? {
              totalWithoutVat: String(totals.totalWithoutVat),
              vat20: String(totals.vat20),
              totalWithVat: String(totals.totalWithVat),
            }
          : {}),
        updatedAt: now,
      })
      .where(eq(invoices.id, id))
      .returning();

    return [row];
  });

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
