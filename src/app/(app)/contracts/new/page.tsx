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
  const [signingLocationOptions, signerPositionNomOptions, signerPositionGenOptions, actingUnderOptions, projectTimelineOptions, contractDurationOptions] = await Promise.all([
    getDropdownOptions(DROPDOWN_SCOPE.SIGNING_LOCATION),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
    getDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER),
    getDropdownOptions(DROPDOWN_SCOPE.PROJECT_TIMELINE),
    getDropdownOptions(DROPDOWN_SCOPE.CONTRACT_DURATION),
  ]);

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
    <div className="w-full">
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
        signerPositionNomOptions={signerPositionNomOptions}
        signerPositionGenOptions={signerPositionGenOptions}
        actingUnderOptions={actingUnderOptions}
        projectTimelineOptions={projectTimelineOptions}
        contractDurationOptions={contractDurationOptions}
        onSubmit={create}
      />
    </div>
  );
}

