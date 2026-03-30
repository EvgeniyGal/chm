import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { peekNextDocumentNumber } from "@/db/numbering";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { ContractForm } from "./ui";
import { getContractLinesWithRemainingForInvoicing, type ContractLineInvoiceRemaining } from "@/lib/contract-invoice-remaining";

export default async function NewContractPage() {
  await requireRole("ADMIN");
  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const [
    signingLocationOptions,
    taxStatusOptions,
    signerPositionNomOptions,
    signerPositionGenOptions,
    actingUnderOptions,
    projectTimelineOptions,
    contractDurationOptions,
    lineItemUnitOptions,
  ] = await Promise.all([
    getDropdownOptions(DROPDOWN_SCOPE.SIGNING_LOCATION),
    getDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
    getDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER),
    getDropdownOptions(DROPDOWN_SCOPE.PROJECT_TIMELINE),
    getDropdownOptions(DROPDOWN_SCOPE.CONTRACT_DURATION),
    getDropdownOptions(DROPDOWN_SCOPE.LINE_ITEM_UNIT),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const initialContractNumber = await peekNextDocumentNumber({
    documentType: "CONTRACT",
    at: new Date(`${todayIso}T00:00:00.000Z`),
  });

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/contracts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { data?: { id: string }; error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "CREATE_FAILED");
    const newId = data?.data?.id;
    if (!newId) throw new Error("CREATE_FAILED");
    redirect(`/contracts/${newId}/edit`);
  }

  async function createAndStartInvoice(
    payload: any,
  ): Promise<{ contractId: string; lines: ContractLineInvoiceRemaining[] }> {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/contracts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { data?: { id: string }; error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "CREATE_FAILED");
    const newId = data?.data?.id;
    if (!newId) throw new Error("CREATE_FAILED");
    const lines = await getContractLinesWithRemainingForInvoicing(newId);
    return { contractId: newId, lines };
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Новий договір</h1>
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
        taxStatusOptions={taxStatusOptions}
        signerPositionNomOptions={signerPositionNomOptions}
        signerPositionGenOptions={signerPositionGenOptions}
        actingUnderOptions={actingUnderOptions}
        projectTimelineOptions={projectTimelineOptions}
        contractDurationOptions={contractDurationOptions}
        lineItemUnitOptions={lineItemUnitOptions}
        initialContractNumber={initialContractNumber}
        onSubmit={create}
        onSubmitAndCreateInvoice={createAndStartInvoice}
      />
    </div>
  );
}

