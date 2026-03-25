import { eq } from "drizzle-orm";
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
  edrpouCode: z.string().min(1),
  vatIdTin: z.string().optional(),
  taxStatus: z.string().min(1),
  iban: z.string().min(1),
  bank: z.string().min(1),
});

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const row = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!row) redirect("/companies");

  async function update(formData: FormData) {
    "use server";
    await requireRole("ADMIN");
    const before = await db.query.companies.findFirst({ where: eq(companies.id, id) });
    if (!before) redirect("/companies");
    const parsed = schema.parse({
      fullName: String(formData.get("fullName") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      address: String(formData.get("address") ?? ""),
      edrpouCode: String(formData.get("edrpouCode") ?? ""),
      vatIdTin: String(formData.get("vatIdTin") ?? ""),
      taxStatus: String(formData.get("taxStatus") ?? ""),
      iban: String(formData.get("iban") ?? ""),
      bank: String(formData.get("bank") ?? ""),
    });

    const [after] = await db
      .update(companies)
      .set({
        fullName: parsed.fullName,
        shortName: parsed.shortName,
        address: parsed.address,
        edrpouCode: parsed.edrpouCode,
        vatIdTin: parsed.vatIdTin ? parsed.vatIdTin : null,
        taxStatus: parsed.taxStatus,
        iban: parsed.iban,
        bank: parsed.bank,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    const { userId } = await requireRole("ADMIN");
    await writeAuditEvent({
      entityType: "COMPANY",
      entityId: id,
      action: "UPDATE",
      actorUserId: userId,
      diff: { before, after },
    });

    redirect(`/companies/${id}`);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Редагувати компанію</h1>
        <p className="text-sm text-zinc-600">{row.shortName}</p>
      </div>

      <form action={update} className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-4">
        <Field name="fullName" label="Повна назва" defaultValue={row.fullName} />
        <Field name="shortName" label="Скорочена назва" defaultValue={row.shortName} />
        <Field name="address" label="Адреса" defaultValue={row.address} />
        <Field name="edrpouCode" label="ЄДРПОУ" defaultValue={row.edrpouCode} />
        <Field name="vatIdTin" label="ІПН" required={false} defaultValue={row.vatIdTin ?? ""} />
        <Field name="taxStatus" label="Статус платника податку" defaultValue={row.taxStatus} />
        <Field name="iban" label="IBAN" defaultValue={row.iban} />
        <Field name="bank" label="Банк" defaultValue={row.bank} />

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          >
            Зберегти
          </button>
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href={`/companies/${id}`}>
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
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="h-10 rounded-md border px-3"
        autoComplete="off"
      />
    </label>
  );
}

