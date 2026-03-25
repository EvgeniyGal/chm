import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const companyInput = z.object({
  fullName: z.string().min(1),
  shortName: z.string().min(1),
  address: z.string().min(1),
  contacts: z.array(z.object({ type: z.string().min(1), value: z.string().min(1) })).default([]),
  edrpouCode: z.string().min(1),
  vatIdTin: z.string().optional().nullable(),
  taxStatus: z.string().min(1),
  iban: z.string().min(1),
  bank: z.string().min(1),

  contractSignerFullNameNom: z.string().min(1),
  contractSignerFullNameGen: z.string().min(1),
  contractSignerPositionNom: z.string().min(1),
  contractSignerPositionGen: z.string().min(1),
  contractSignerActingUnder: z.string().min(1),

  actSignerFullNameNom: z.string().min(1),
  actSignerFullNameGen: z.string().min(1),
  actSignerPositionNom: z.string().min(1),
  actSignerPositionGen: z.string().min(1),

  invoiceSignerFullNameNom: z.string().min(1),
  invoiceSignerPositionNom: z.string().min(1),
});

export async function GET() {
  await requireRole("MANAGER");
  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  return Response.json({ data: rows });
}

export async function POST(req: Request) {
  const { userId } = await requireRole("ADMIN");
  const json = await req.json().catch(() => null);
  const parsed = companyInput.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const [created] = await db
    .insert(companies)
    .values({
      ...parsed.data,
      contacts: JSON.stringify(parsed.data.contacts),
      vatIdTin: parsed.data.vatIdTin ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await writeAuditEvent({
    entityType: "COMPANY",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { after: created },
  });

  return Response.json({ data: created }, { status: 201 });
}

