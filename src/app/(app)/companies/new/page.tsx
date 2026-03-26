import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { ActingUnderField } from "@/components/forms/ActingUnderField";
import { ContactsField } from "@/components/forms/ContactsField";
import { GuardedForm } from "@/components/forms/GuardedForm";
import { SignerPositionField } from "@/components/forms/SignerPositionField";
import { TaxStatusField } from "@/components/forms/TaxStatusField";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import {
  DROPDOWN_SCOPE,
  deleteDropdownOptions,
  getDropdownOptions,
  saveDropdownOptions,
} from "@/lib/dropdown-options";

const schema = z.object({
  fullName: z.string().min(1),
  shortName: z.string().min(1),
  address: z.string().min(1),
  contactsJson: z.string().default("[]"),
  edrpouCode: z.string().min(1),
  vatIdTin: z.string().optional(),
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

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("380")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+38${digits}`;
  if (digits.length === 9) return `+380${digits}`;
  return input.trim();
}

const contactSchema = z
  .array(
    z.object({
      type: z.enum(["tel", "email"]),
      value: z.string().min(1),
    }),
  )
  .default([]);

function parseDeletedValues(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function NewCompanyPage() {
  await requireRole("ADMIN");
  const [taxStatusOptions, signerPositionNomOptions, signerPositionGenOptions, actingUnderOptions] = await Promise.all([
    getDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
    getDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER),
  ]);

  async function create(formData: FormData) {
    "use server";
    const deletedTaxStatus = parseDeletedValues(formData.get("taxStatusDeletedJson"));
    const deletedActingUnder = parseDeletedValues(formData.get("actingUnderDeletedJson"));
    const deletedSignerPositionNom = formData
      .getAll("signerPositionNomDeletedJson")
      .flatMap((v) => parseDeletedValues(v));
    const deletedSignerPositionGen = formData
      .getAll("signerPositionGenDeletedJson")
      .flatMap((v) => parseDeletedValues(v));
    await requireRole("ADMIN");

    const parsed = schema.parse({
      fullName: String(formData.get("fullName") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      address: String(formData.get("address") ?? ""),
      contactsJson: String(formData.get("contactsJson") ?? "[]"),
      edrpouCode: String(formData.get("edrpouCode") ?? ""),
      vatIdTin: String(formData.get("vatIdTin") ?? ""),
      taxStatus: String(formData.get("taxStatus") ?? ""),
      iban: String(formData.get("iban") ?? ""),
      bank: String(formData.get("bank") ?? ""),
      contractSignerFullNameNom: String(formData.get("contractSignerFullNameNom") ?? ""),
      contractSignerFullNameGen: String(formData.get("contractSignerFullNameGen") ?? ""),
      contractSignerPositionNom: String(formData.get("contractSignerPositionNom") ?? ""),
      contractSignerPositionGen: String(formData.get("contractSignerPositionGen") ?? ""),
      contractSignerActingUnder: String(formData.get("contractSignerActingUnder") ?? ""),
      actSignerFullNameNom: String(formData.get("actSignerFullNameNom") ?? ""),
      actSignerFullNameGen: String(formData.get("actSignerFullNameGen") ?? ""),
      actSignerPositionNom: String(formData.get("actSignerPositionNom") ?? ""),
      actSignerPositionGen: String(formData.get("actSignerPositionGen") ?? ""),
      invoiceSignerFullNameNom: String(formData.get("invoiceSignerFullNameNom") ?? ""),
      invoiceSignerPositionNom: String(formData.get("invoiceSignerPositionNom") ?? ""),
    });

    const contacts = (() => {
      try {
        const raw = JSON.parse(parsed.contactsJson);
        const validated = contactSchema.parse(raw)
          .map((item) => {
            const value = item.type === "tel" ? normalizePhone(item.value) : item.value.trim().toLowerCase();
            return { type: item.type, value };
          })
          .filter((item) => {
            if (item.type === "email") {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value);
            }
            return /^\+380\d{9}$/.test(item.value);
          });
        return JSON.stringify(validated);
      } catch {
        return "[]";
      }
    })();

    const now = new Date();
    const [created] = await db
      .insert(companies)
      .values({
        fullName: parsed.fullName,
        shortName: parsed.shortName,
        address: parsed.address,
        contacts,
        edrpouCode: parsed.edrpouCode,
        vatIdTin: parsed.vatIdTin ? parsed.vatIdTin : null,
        taxStatus: parsed.taxStatus,
        iban: parsed.iban,
        bank: parsed.bank,
        contractSignerFullNameNom: parsed.contractSignerFullNameNom,
        contractSignerFullNameGen: parsed.contractSignerFullNameGen,
        contractSignerPositionNom: parsed.contractSignerPositionNom,
        contractSignerPositionGen: parsed.contractSignerPositionGen,
        contractSignerActingUnder: parsed.contractSignerActingUnder,
        actSignerFullNameNom: parsed.actSignerFullNameNom,
        actSignerFullNameGen: parsed.actSignerFullNameGen,
        actSignerPositionNom: parsed.actSignerPositionNom,
        actSignerPositionGen: parsed.actSignerPositionGen,
        invoiceSignerFullNameNom: parsed.invoiceSignerFullNameNom,
        invoiceSignerPositionNom: parsed.invoiceSignerPositionNom,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await Promise.all([
      deleteDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS, deletedTaxStatus),
      deleteDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER, deletedActingUnder),
      deleteDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM, deletedSignerPositionNom),
      deleteDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN, deletedSignerPositionGen),
      saveDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS, [parsed.taxStatus]),
      saveDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM, [
        parsed.contractSignerPositionNom,
        parsed.actSignerPositionNom,
        parsed.invoiceSignerPositionNom,
      ]),
      saveDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN, [
        parsed.contractSignerPositionGen,
        parsed.actSignerPositionGen,
      ]),
      saveDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER, [parsed.contractSignerActingUnder]),
    ]);

    const { userId } = await requireRole("ADMIN");
    await writeAuditEvent({
      entityType: "COMPANY",
      entityId: created!.id,
      action: "CREATE",
      actorUserId: userId,
      diff: { after: created },
    });

    redirect("/companies");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Нова компанія</h1>
      </div>

      <GuardedForm action={create} className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-4">
        <Field name="fullName" label="Повна назва" />
        <Field name="shortName" label="Скорочена назва" />
        <Field name="address" label="Адреса" />
        <Field name="edrpouCode" label="ЄДРПОУ" />
        <Field name="vatIdTin" label="ІПН" required={false} />
        <TaxStatusField optionsFromBackend={taxStatusOptions} />
        <Field name="iban" label="IBAN" />
        <Field name="bank" label="Банк" />

        <ContactsField defaultValue="[]" />

        <div className="mt-2 grid grid-cols-1 gap-4 rounded-lg bg-[#FFF7E5] p-4">
          <div className="text-sm font-semibold text-zinc-900">Підписанти (за замовчуванням)</div>

          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Називний відмінок</div>
            <div className="grid grid-cols-1 gap-3">
              <Field name="contractSignerFullNameNom" label="Підписант договору" />
              <SignerPositionField
                name="contractSignerPositionNom"
                label="Посада підписанта договору"
                scope="SIGNER_POSITION_NOM"
                deletedName="signerPositionNomDeletedJson"
                optionsFromBackend={signerPositionNomOptions}
              />
              <Field name="actSignerFullNameNom" label="Підписант акту" />
              <SignerPositionField
                name="actSignerPositionNom"
                label="Посада підписанта акту"
                scope="SIGNER_POSITION_NOM"
                deletedName="signerPositionNomDeletedJson"
                optionsFromBackend={signerPositionNomOptions}
              />
              <Field name="invoiceSignerFullNameNom" label="Підписант рахунку" />
              <SignerPositionField
                name="invoiceSignerPositionNom"
                label="Посада підписанта рахунку"
                scope="SIGNER_POSITION_NOM"
                deletedName="signerPositionNomDeletedJson"
                optionsFromBackend={signerPositionNomOptions}
              />
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-900">Родовий відмінок</div>
            <div className="grid grid-cols-1 gap-3">
              <Field name="contractSignerFullNameGen" label="Підписант договору" />
              <SignerPositionField
                name="contractSignerPositionGen"
                label="Посада підписанта договору"
                scope="SIGNER_POSITION_GEN"
                deletedName="signerPositionGenDeletedJson"
                optionsFromBackend={signerPositionGenOptions}
              />
              <Field name="actSignerFullNameGen" label="Підписант акту" />
              <SignerPositionField
                name="actSignerPositionGen"
                label="Посада підписанта акту"
                scope="SIGNER_POSITION_GEN"
                deletedName="signerPositionGenDeletedJson"
                optionsFromBackend={signerPositionGenOptions}
              />
            </div>
          </div>

          <ActingUnderField optionsFromBackend={actingUnderOptions} />
        </div>

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          >
            Зберегти
          </button>
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href="/companies">
            Скасувати
          </a>
        </div>
      </GuardedForm>
    </div>
  );
}

function Field({
  name,
  label,
  required = true,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <input
        name={name}
        required={required}
        className="h-10 rounded-md border px-3"
        autoComplete="off"
      />
    </label>
  );
}


