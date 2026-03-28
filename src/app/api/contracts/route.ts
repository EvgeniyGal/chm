import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companies, contracts, lineItems } from "@/db/schema";
import { nextDocumentNumber } from "@/db/numbering";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { calcTotals } from "@/lib/totals";
import { DROPDOWN_SCOPE, saveDropdownOption } from "@/lib/dropdown-options";

export const runtime = "nodejs";

const itemSchema = z.object({
  title: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().min(0),
  price: z.number().min(0),
});

const createSchema = z
  .object({
  date: z.string().min(1),
  signingLocation: z.string().min(1),
  workType: z.enum(["WORKS", "SERVICES"]),
  customerCompanyId: z.string().uuid(),
  contractorCompanyId: z.string().uuid(),
  projectTimeline: z.string().min(1),
  contractDuration: z.string().min(1),
  signerFullNameNom: z.string().min(1),
  signerFullNameGen: z.string().min(1),
  signerPositionNom: z.string().min(1),
  signerPositionGen: z.string().min(1),
  signerActingUnder: z.string().min(1),
  items: z.array(itemSchema).min(1),
  })
  .refine((data) => data.customerCompanyId !== data.contractorCompanyId, {
    message: "CUSTOMER_AND_CONTRACTOR_SAME",
    path: ["contractorCompanyId"],
  });

export async function GET() {
  await requireRole("MANAGER");
  const rows = await db.select().from(contracts).orderBy(desc(contracts.date));
  return Response.json({ data: rows });
}

export async function POST(req: Request) {
  const { userId } = await requireRole("ADMIN");
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) return Response.json({ error: "INVALID_DATE" }, { status: 400 });

  const totals = calcTotals(parsed.data.items);
  const number = await nextDocumentNumber({ documentType: "CONTRACT", at: date });

  const now = new Date();
  const [created] = await db
    .insert(contracts)
    .values({
      number,
      date,
      signingLocation: parsed.data.signingLocation,
      workType: parsed.data.workType,
      customerCompanyId: parsed.data.customerCompanyId,
      contractorCompanyId: parsed.data.contractorCompanyId,
      projectTimeline: parsed.data.projectTimeline,
      contractDuration: parsed.data.contractDuration,
      signerFullNameNom: parsed.data.signerFullNameNom,
      signerFullNameGen: parsed.data.signerFullNameGen,
      signerPositionNom: parsed.data.signerPositionNom,
      signerPositionGen: parsed.data.signerPositionGen,
      signerActingUnder: parsed.data.signerActingUnder,
      totalWithoutVat: String(totals.totalWithoutVat),
      vat20: String(totals.vat20),
      totalWithVat: String(totals.totalWithVat),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(lineItems).values(
    parsed.data.items.map((it) => ({
      contractId: created!.id,
      title: it.title,
      unit: it.unit,
      quantity: String(it.quantity),
      price: String(it.price),
      createdAt: now,
      updatedAt: now,
    })),
  );

  // Persist "Місце складання" into dropdown options so it becomes selectable later.
  await saveDropdownOption(DROPDOWN_SCOPE.SIGNING_LOCATION, parsed.data.signingLocation);

  await writeAuditEvent({
    entityType: "CONTRACT",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { after: created, items: parsed.data.items },
  });

  return Response.json({ data: created }, { status: 201 });
}

