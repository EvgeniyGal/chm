import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

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

export default async function NewCompanyPage() {
  await requireRole("ADMIN");

  async function create(formData: FormData) {
    "use server";
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
        const v = JSON.parse(parsed.contactsJson);
        return JSON.stringify(Array.isArray(v) ? v : []);
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

    const { userId } = await requireRole("ADMIN");
    await writeAuditEvent({
      entityType: "COMPANY",
      entityId: created!.id,
      action: "CREATE",
      actorUserId: userId,
      diff: { after: created },
    });

    redirect(`/companies/${created!.id}`);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Нова компанія</h1>
        <p className="text-sm text-zinc-600">Заповніть реквізити компанії.</p>
      </div>

      <form action={create} className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-4">
        <Field name="fullName" label="Повна назва" />
        <Field name="shortName" label="Скорочена назва" />
        <Field name="address" label="Адреса" />
        <Field name="edrpouCode" label="ЄДРПОУ" />
        <Field name="vatIdTin" label="ІПН (якщо є)" required={false} />
        <Field name="taxStatus" label="Статус платника податку" />
        <Field name="iban" label="IBAN" />
        <Field name="bank" label="Банк" />

        <Textarea
          name="contactsJson"
          label="Контакти (JSON масив)"
          placeholder='[{"type":"tel","value":"+380..."},{"type":"email","value":"a@b.com"}]'
        />

        <div className="mt-2 grid grid-cols-1 gap-4 rounded-lg bg-[#FFF7E5] p-4">
          <div className="text-sm font-semibold text-zinc-900">Підписанти (за замовчуванням)</div>
          <Field name="contractSignerFullNameNom" label="Підписант договору (називний)" />
          <Field name="contractSignerFullNameGen" label="Підписант договору (родовий)" />
          <Field name="contractSignerPositionNom" label="Посада підписанта договору (називний)" />
          <Field name="contractSignerPositionGen" label="Посада підписанта договору (родовий)" />
          <Field name="contractSignerActingUnder" label="Підписант договору діє на підставі" />

          <Field name="actSignerFullNameNom" label="Підписант акту (називний)" />
          <Field name="actSignerFullNameGen" label="Підписант акту (родовий)" />
          <Field name="actSignerPositionNom" label="Посада підписанта акту (називний)" />
          <Field name="actSignerPositionGen" label="Посада підписанта акту (родовий)" />

          <Field name="invoiceSignerFullNameNom" label="Підписант рахунку (називний)" />
          <Field name="invoiceSignerPositionNom" label="Посада підписанта рахунку (називний)" />
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
      </form>
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

function Textarea({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <textarea
        name={name}
        placeholder={placeholder}
        className="min-h-24 rounded-md border px-3 py-2 font-mono text-xs"
        defaultValue="[]"
      />
    </label>
  );
}

