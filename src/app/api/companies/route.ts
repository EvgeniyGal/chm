import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { parseContactsJsonForDb } from "@/lib/company-contacts";
import { DROPDOWN_SCOPE, saveDropdownOptions } from "@/lib/dropdown-options";

export const runtime = "nodejs";

const companyInput = z.object({
  fullName: z.string().min(1),
  shortName: z.string().min(1),
  address: z.string().min(1),
  contactsJson: z.string().optional(),
  contacts: z.array(z.object({ type: z.string().min(1), value: z.string().min(1) })).optional(),
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

  const contactsStored =
    typeof parsed.data.contactsJson === "string"
      ? parseContactsJsonForDb(parsed.data.contactsJson)
      : parseContactsJsonForDb(JSON.stringify(parsed.data.contacts ?? []));

  const now = new Date();
  const [created] = await db
    .insert(companies)
    .values({
      fullName: parsed.data.fullName,
      shortName: parsed.data.shortName,
      address: parsed.data.address,
      contacts: contactsStored,
      edrpouCode: parsed.data.edrpouCode,
      vatIdTin: parsed.data.vatIdTin ?? null,
      taxStatus: parsed.data.taxStatus,
      iban: parsed.data.iban,
      bank: parsed.data.bank,
      contractSignerFullNameNom: parsed.data.contractSignerFullNameNom,
      contractSignerFullNameGen: parsed.data.contractSignerFullNameGen,
      contractSignerPositionNom: parsed.data.contractSignerPositionNom,
      contractSignerPositionGen: parsed.data.contractSignerPositionGen,
      contractSignerActingUnder: parsed.data.contractSignerActingUnder,
      actSignerFullNameNom: parsed.data.actSignerFullNameNom,
      actSignerFullNameGen: parsed.data.actSignerFullNameGen,
      actSignerPositionNom: parsed.data.actSignerPositionNom,
      actSignerPositionGen: parsed.data.actSignerPositionGen,
      invoiceSignerFullNameNom: parsed.data.invoiceSignerFullNameNom,
      invoiceSignerPositionNom: parsed.data.invoiceSignerPositionNom,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await Promise.all([
    saveDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS, [parsed.data.taxStatus]),
    saveDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM, [
      parsed.data.contractSignerPositionNom,
      parsed.data.actSignerPositionNom,
      parsed.data.invoiceSignerPositionNom,
    ]),
    saveDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN, [
      parsed.data.contractSignerPositionGen,
      parsed.data.actSignerPositionGen,
    ]),
    saveDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER, [parsed.data.contractSignerActingUnder]),
  ]);

  await writeAuditEvent({
    entityType: "COMPANY",
    entityId: created!.id,
    action: "CREATE",
    actorUserId: userId,
    diff: { after: created },
  });

  return Response.json({ data: created }, { status: 201 });
}

