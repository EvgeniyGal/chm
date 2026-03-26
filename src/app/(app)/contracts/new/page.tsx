import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { ContractForm } from "./ui";

export default async function NewContractPage() {
  await requireRole("ADMIN");
  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const signingLocationOptions = await getDropdownOptions(DROPDOWN_SCOPE.SIGNING_LOCATION);

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await fetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/contracts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(data?.error ?? "CREATE_FAILED");
    redirect("/contracts");
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Новий договір</h1>
        <p className="text-sm text-zinc-600">Заповніть поля договору.</p>
      </div>
      <ContractForm
        companies={companyRows.map((c) => ({
          id: c.id,
          label: c.shortName,
          contractSignerFullNameNom: c.contractSignerFullNameNom,
          contractSignerFullNameGen: c.contractSignerFullNameGen,
          contractSignerPositionNom: c.contractSignerPositionNom,
          contractSignerPositionGen: c.contractSignerPositionGen,
          contractSignerActingUnder: c.contractSignerActingUnder,
        }))}
        signingLocationOptions={signingLocationOptions}
        onSubmit={create}
      />
    </div>
  );
}

