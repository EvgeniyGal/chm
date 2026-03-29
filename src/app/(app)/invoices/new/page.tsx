import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, contracts } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getContractLinesWithRemainingForInvoicing } from "@/lib/contract-invoice-remaining";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { peekNextDocumentNumber } from "@/db/numbering";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { InvoiceForm } from "./ui";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ contractId?: string; partial?: string }>;
}) {
  await requireRole("ADMIN");
  const { contractId, partial } = await searchParams;
  const partialSelection = partial === "1";

  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const [lineItemUnitOptions, taxStatusOptions, signerPositionNomOptions, signerPositionGenOptions, actingUnderOptions] =
    await Promise.all([
      getDropdownOptions(DROPDOWN_SCOPE.LINE_ITEM_UNIT),
      getDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS),
      getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
      getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
      getDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER),
    ]);

  const contract = contractId ? await db.query.contracts.findFirst({ where: eq(contracts.id, contractId) }) : null;
  const lineRemainders = contractId ? await getContractLinesWithRemainingForInvoicing(contractId) : [];
  const eligibleLines = lineRemainders.filter((l) => l.remaining > 0);

  const contractorCompany =
    contract != null
      ? await db.query.companies.findFirst({ where: eq(companies.id, contract.contractorCompanyId) })
      : null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const previewInvoiceNumberInitial = await peekNextDocumentNumber({
    documentType: "INVOICE",
    at: new Date(`${todayIso}T00:00:00.000Z`),
  });

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { data?: { id: string }; error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "CREATE_FAILED");
    const newId = data?.data?.id;
    if (!newId) throw new Error("CREATE_FAILED");
    redirect(`/invoices/${newId}/edit`);
  }

  if (contractId && contract && eligibleLines.length === 0 && lineRemainders.length > 0) {
    return (
      <div className="max-w-5xl min-w-0">
        <div className="mb-4">
          <h1 className="page-title">Новий рахунок</h1>
          <p className="text-sm text-zinc-600">Договір {contract.number}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <p className="text-sm text-muted-foreground">
            Усі позиції цього договору вже повністю враховані в попередніх рахунках. Новий рахунок на основі залишків
            створити неможливо.
          </p>
          <a className="mt-4 inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent" href={`/contracts/${contract.id}/edit`}>
            Повернутися до договору
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Новий рахунок</h1>
      </div>

      <InvoiceForm
        companies={companyRows.map((c) => ({
          id: c.id,
          label: c.shortName,
          invoiceSignerFullNameNom: c.invoiceSignerFullNameNom,
          invoiceSignerPositionNom: c.invoiceSignerPositionNom,
        }))}
        contract={
          contract
            ? {
                id: contract.id,
                number: contract.number,
                contractDateIso: new Date(contract.date).toISOString().slice(0, 10),
                workType: contract.workType,
                customerCompanyId: contract.customerCompanyId,
                contractorCompanyId: contract.contractorCompanyId,
                items: eligibleLines.map((it) => ({
                  id: it.id,
                  title: it.title,
                  unit: it.unit,
                  quantity: it.remaining,
                  price: it.price,
                  remaining: it.remaining,
                })),
              }
            : null
        }
        defaultInvoiceSigner={{
          signerFullNameNom: contractorCompany?.invoiceSignerFullNameNom ?? "",
          signerPositionNom: contractorCompany?.invoiceSignerPositionNom ?? "",
        }}
        lineItemUnitOptions={lineItemUnitOptions}
        partialSelection={partialSelection}
        quickCreateDropdowns={{
          taxStatusOptions,
          signerPositionNomOptions,
          signerPositionGenOptions,
          actingUnderOptions,
        }}
        previewInvoiceNumberInitial={previewInvoiceNumberInitial}
        onSubmit={create}
      />
    </div>
  );
}
