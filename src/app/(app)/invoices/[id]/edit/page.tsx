import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { InvoiceForm, type InvoiceFormValues } from "../../new/ui";
import { db } from "@/db";
import { acceptanceActs, companies, contracts, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getContractLinesWithRemainingForInvoicing } from "@/lib/contract-invoice-remaining";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { getSignedScansForEntity } from "@/lib/signed-scans";
import { InvoiceAuditHistory } from "@/components/audit/InvoiceAuditHistory";

function mapLineItem(it: InvoiceFormValues["items"][number]) {
  const q = typeof it.quantity === "number" ? it.quantity : Number.parseFloat(String(it.quantity).replace(",", "."));
  const p = typeof it.price === "number" ? it.price : Number.parseFloat(String(it.price).replace(",", "."));
  return {
    title: it.title,
    unit: it.unit,
    quantity: Number.isFinite(q) ? q : 0,
    price: Number.isFinite(p) ? p : 0,
    sourceContractLineItemId: it.sourceContractLineItemId ?? null,
  };
}

async function saveInvoiceEdit(invoiceId: string, hasContract: boolean, values: InvoiceFormValues) {
  "use server";
  await requireRole("ADMIN");
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const items = values.items.map(mapLineItem);

  const body: Record<string, unknown> = hasContract
    ? { date: values.date, items }
    : {
        date: values.date,
        workType: values.workType,
        customerCompanyId: values.customerCompanyId,
        contractorCompanyId: values.contractorCompanyId,
        isExternalContract: values.isExternalContract,
        externalContractNumber: values.isExternalContract ? (values.externalContractNumber?.trim() || null) : null,
        externalContractDate: values.isExternalContract ? (values.externalContractDate?.trim() || null) : null,
        signerFullNameNom: values.signerFullNameNom,
        signerPositionNom: values.signerPositionNom,
        items,
      };

  const res = await internalApiFetch(`${baseUrl}/api/invoices/${invoiceId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(data?.error ?? "UPDATE_FAILED");
  revalidatePath(`/invoices/${invoiceId}/edit`);
  revalidatePath("/invoices");
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;

  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) redirect("/invoices");

  const itemRows = await db.query.lineItems.findMany({ where: eq(lineItems.invoiceId, id) });
  const signedScansInitial = await getSignedScansForEntity("INVOICE", id);
  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));

  const [lineItemUnitOptions, taxStatusOptions, signerPositionNomOptions, signerPositionGenOptions, actingUnderOptions] =
    await Promise.all([
      getDropdownOptions(DROPDOWN_SCOPE.LINE_ITEM_UNIT),
      getDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS),
      getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
      getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
      getDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER),
    ]);

  const contractEntity =
    inv.contractId != null
      ? await db.query.contracts.findFirst({ where: eq(contracts.id, inv.contractId) })
      : null;
  if (inv.contractId != null && !contractEntity) redirect("/invoices");

  const existingAcceptanceAct = await db.query.acceptanceActs.findFirst({
    where: eq(acceptanceActs.invoiceId, id),
  });

  const lineRemaindersForEdit =
    inv.contractId != null
      ? await getContractLinesWithRemainingForInvoicing(inv.contractId, { excludeInvoiceId: id })
      : [];

  const editInitialValues: InvoiceFormValues = {
    date: new Date(inv.date).toISOString().slice(0, 10),
    workType: inv.workType,
    customerCompanyId: inv.customerCompanyId,
    contractorCompanyId: inv.contractorCompanyId,
    contractId: inv.contractId,
    isExternalContract: Boolean(inv.isExternalContract),
    externalContractNumber: inv.externalContractNumber ?? "",
    externalContractDate: inv.externalContractDate
      ? new Date(inv.externalContractDate).toISOString().slice(0, 10)
      : "",
    signerFullNameNom: inv.signerFullNameNom,
    signerPositionNom: inv.signerPositionNom,
    items:
      itemRows.length > 0
        ? itemRows.map((it) => ({
            title: it.title,
            unit: it.unit,
            quantity: Number(it.quantity),
            price: Number(it.price),
            sourceContractLineItemId: it.sourceContractLineItemId,
          }))
        : [{ title: "", unit: "", quantity: 0, price: 0, sourceContractLineItemId: null }],
  };

  const hasContract = Boolean(inv.contractId);

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Редагувати рахунок {inv.number}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(inv.date).toLocaleDateString("uk-UA")}
          {inv.workType === "SERVICES" ? " · Послуги" : " · Роботи"}
        </p>
      </div>

      <InvoiceForm
        mode="edit"
        editInitialValues={editInitialValues}
        invoiceId={id}
        signedScansInitial={signedScansInitial}
        cancelHref="/invoices"
        companies={companyRows.map((c) => ({
          id: c.id,
          label: c.shortName,
          invoiceSignerFullNameNom: c.invoiceSignerFullNameNom,
          invoiceSignerPositionNom: c.invoiceSignerPositionNom,
        }))}
        contract={
          inv.contractId && contractEntity
            ? {
                id: inv.contractId,
                number: contractEntity.number,
                contractDateIso: new Date(contractEntity.date).toISOString().slice(0, 10),
                workType: contractEntity.workType,
                customerCompanyId: contractEntity.customerCompanyId,
                contractorCompanyId: contractEntity.contractorCompanyId,
                items: lineRemaindersForEdit.map((it) => ({
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
        defaultInvoiceSigner={{ signerFullNameNom: "", signerPositionNom: "" }}
        lineItemUnitOptions={lineItemUnitOptions}
        partialSelection={false}
        quickCreateDropdowns={{
          taxStatusOptions,
          signerPositionNomOptions,
          signerPositionGenOptions,
          actingUnderOptions,
        }}
        readonlyInvoiceNumber={inv.number}
        existingAcceptanceActId={existingAcceptanceAct?.id ?? null}
        onSubmit={saveInvoiceEdit.bind(null, id, hasContract)}
      />

      <div className="mt-8">
        <InvoiceAuditHistory invoiceId={id} />
      </div>
    </div>
  );
}
