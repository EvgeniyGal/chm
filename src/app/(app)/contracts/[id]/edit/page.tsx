import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, contracts, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getContractLinesWithRemainingForInvoicing } from "@/lib/contract-invoice-remaining";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { getSignedScansForEntity } from "@/lib/signed-scans";
import { ContractAuditHistory } from "@/components/audit/ContractAuditHistory";
import { ContractEditForm } from "./ui";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;

  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) redirect("/contracts");
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });
  const createdInvoices = await db.query.invoices.findMany({
    where: eq(invoices.contractId, id),
    orderBy: [desc(invoices.date), desc(invoices.createdAt)],
  });
  const createdInvoiceIds = createdInvoices.map((inv) => inv.id);
  const invoiceLineItemsByInvoiceId = new Map<string, string[]>();
  if (createdInvoiceIds.length > 0) {
    const invoiceLineRows = await db
      .select({ invoiceId: lineItems.invoiceId, title: lineItems.title })
      .from(lineItems)
      .where(inArray(lineItems.invoiceId, createdInvoiceIds))
      .orderBy(asc(lineItems.invoiceId), asc(lineItems.id));
    for (const row of invoiceLineRows) {
      if (!row.invoiceId) continue;
      const titles = invoiceLineItemsByInvoiceId.get(row.invoiceId) ?? [];
      titles.push(row.title);
      invoiceLineItemsByInvoiceId.set(row.invoiceId, titles);
    }
  }
  const linesForInvoicing = await getContractLinesWithRemainingForInvoicing(id);
  const signedScansInitial = await getSignedScansForEntity("CONTRACT", id);
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

  async function update(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(data?.error ?? "UPDATE_FAILED");
    revalidatePath(`/contracts/${id}/edit`);
    revalidatePath("/contracts");
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Редагувати договір {contract.number}</h1>
      </div>
      <ContractEditForm
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
        initial={{
          date: new Date(contract.date).toISOString().slice(0, 10),
          signingLocation: contract.signingLocation,
          workType: contract.workType,
          customerCompanyId: contract.customerCompanyId,
          contractorCompanyId: contract.contractorCompanyId,
          projectTimeline: contract.projectTimeline,
          contractDuration: contract.contractDuration,
          signerFullNameNom: contract.signerFullNameNom,
          signerFullNameGen: contract.signerFullNameGen,
          signerPositionNom: contract.signerPositionNom,
          signerPositionGen: contract.signerPositionGen,
          signerActingUnder: contract.signerActingUnder,
          isSigned: Boolean(contract.isSigned),
          isArchived: Boolean(contract.isArchived),
          items: items.map((it) => ({
            title: it.title,
            unit: it.unit,
            quantity: Number(it.quantity),
            price: Number(it.price),
          })),
        }}
        onSubmit={update}
        cancelHref="/contracts"
        contractId={id}
        createdInvoices={createdInvoices.map((inv) => ({
          id: inv.id,
          number: inv.number,
          date: inv.date instanceof Date ? inv.date.toISOString().slice(0, 10) : String(inv.date).slice(0, 10),
          totalWithVat: String(inv.totalWithVat),
          lineItems: invoiceLineItemsByInvoiceId.get(inv.id) ?? [],
        }))}
        linesForInvoicing={linesForInvoicing}
        signedScansInitial={signedScansInitial}
      />

      <div className="mt-8">
        <ContractAuditHistory contractId={id} />
      </div>
    </div>
  );
}

