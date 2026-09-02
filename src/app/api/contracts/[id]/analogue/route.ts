import { eq } from "drizzle-orm";

import { db } from "@/db";
import { contracts, lineItems } from "@/db/schema";
import { nextDocumentNumber } from "@/db/numbering";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { toUtcDateOnly } from "@/lib/document-date";
import { revalidateContractPages } from "@/lib/revalidate-document-lists";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: RouteContext<"/api/contracts/[id]/analogue">) {
  const { userId } = await requireRole("ADMIN");
  const { id } = await ctx.params;

  const source = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!source) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const sourceItems = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });
  if (sourceItems.length === 0) {
    return Response.json({ error: "SOURCE_HAS_NO_ITEMS" }, { status: 400 });
  }

  const now = new Date();
  // Store date-only (UTC midnight) like the normal create flow, so the first edit save
  // does not look like a date change and burn another document number.
  const date = toUtcDateOnly(now);
  const number = await nextDocumentNumber({ at: date });

  const [created] = await db
    .insert(contracts)
    .values({
      number,
      date,
      signingLocation: source.signingLocation,
      workType: source.workType,
      customerCompanyId: source.customerCompanyId,
      contractorCompanyId: source.contractorCompanyId,
      projectTimeline: source.projectTimeline,
      contractDuration: source.contractDuration,
      signerFullNameNom: source.signerFullNameNom,
      signerFullNameGen: source.signerFullNameGen,
      signerPositionNom: source.signerPositionNom,
      signerPositionGen: source.signerPositionGen,
      signerActingUnder: source.signerActingUnder,
      totalWithoutVat: String(source.totalWithoutVat),
      vat20: String(source.vat20),
      totalWithVat: String(source.totalWithVat),
      isSigned: Boolean(source.isSigned),
      isArchived: Boolean(source.isArchived),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(lineItems).values(
    sourceItems.map((it) => ({
      contractId: created!.id,
      title: it.title,
      unit: it.unit,
      quantity: String(it.quantity),
      price: String(it.price),
      createdAt: now,
      updatedAt: now,
    })),
  );

  await writeAuditEvent({
    entityType: "CONTRACT",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { sourceContractId: source.id, after: created },
    note: "Generated analogue",
  });

  revalidateContractPages(created!.id);

  return Response.json({ data: created }, { status: 201 });
}

