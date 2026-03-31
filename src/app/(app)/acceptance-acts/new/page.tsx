import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { acceptanceActs, companies, contracts, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { AcceptanceActForm } from "./ui";

export default async function NewAcceptanceActPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  await requireRole("ADMIN");
  const { invoiceId } = await searchParams;

  const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.date));
  const invoiceIdParam =
    invoiceId && allInvoices.some((i) => i.id === invoiceId) ? invoiceId : "";

  if (invoiceIdParam) {
    const already = await db.query.acceptanceActs.findFirst({
      where: eq(acceptanceActs.invoiceId, invoiceIdParam),
    });
    if (already) redirect(`/acceptance-acts/${already.id}`);
  }

  const invoicedActIds = await db.select({ invoiceId: acceptanceActs.invoiceId }).from(acceptanceActs);
  const invoiceIdsWithAct = new Set(invoicedActIds.map((r) => r.invoiceId));
  const invoiceRows = allInvoices.filter((i) => !invoiceIdsWithAct.has(i.id));
  const initialInvoiceId =
    invoiceIdParam && invoiceRows.some((i) => i.id === invoiceIdParam) ? invoiceIdParam : "";

  let defaultSigningLocation = "";
  if (initialInvoiceId) {
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, initialInvoiceId) });
    if (inv?.contractId) {
      const linked = await db.query.contracts.findFirst({ where: eq(contracts.id, inv.contractId) });
      defaultSigningLocation = linked?.signingLocation ?? "";
    }
  }

  const [signerPositionNomOptions, signerPositionGenOptions, signingLocationOptions] = await Promise.all([
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
    getDropdownOptions(DROPDOWN_SCOPE.SIGNING_LOCATION),
  ]);

  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));

  // Build invoiceId -> act signer defaults from contractor company card.
  // (We use contractor side because it is responsible for signing acts in this CRM.)
  const contractorCompanyById = new Map(companyRows.map((c) => [c.id, c]));
  const invoiceSignerById: Record<
    string,
    { signerFullNameNom: string; signerFullNameGen: string; signerPositionNom: string; signerPositionGen: string }
  > = {};
  for (const inv of invoiceRows) {
    const contractor = contractorCompanyById.get(inv.contractorCompanyId);
    if (!contractor) continue;
    invoiceSignerById[inv.id] = {
      signerFullNameNom: contractor.actSignerFullNameNom,
      signerFullNameGen: contractor.actSignerFullNameGen,
      signerPositionNom: contractor.actSignerPositionNom,
      signerPositionGen: contractor.actSignerPositionGen,
    };
  }

  const invoiceIds = invoiceRows.map((i) => i.id);
  const lineItemsByInvoiceId = new Map<string, Array<{ id: string; title: string; unit: string; quantity: string; price: string }>>();
  if (invoiceIds.length > 0) {
    const itemRows = await db.query.lineItems.findMany({
      where: inArray(lineItems.invoiceId, invoiceIds),
      orderBy: desc(lineItems.createdAt),
    });
    for (const it of itemRows) {
      if (!it.invoiceId) continue;
      const list = lineItemsByInvoiceId.get(it.invoiceId) ?? [];
      list.push({
        id: it.id,
        title: it.title,
        unit: it.unit,
        quantity: String(it.quantity),
        price: String(it.price),
      });
      lineItemsByInvoiceId.set(it.invoiceId, list);
    }
  }

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch("/api/acceptance-acts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      data?: { id: string };
      error?: string;
      acceptanceActId?: string;
    } | null;
    if (!res.ok) {
      if (data?.error === "ACCEPTANCE_ACT_ALREADY_EXISTS" && data.acceptanceActId) {
        redirect(`/acceptance-acts/${data.acceptanceActId}`);
      }
      if (data?.error === "ACCEPTANCE_ACT_ALREADY_EXISTS") {
        throw new Error("Для цього рахунку вже створено акт.");
      }
      throw new Error(data?.error ?? "CREATE_FAILED");
    }
    const newId = data?.data?.id;
    if (newId) redirect(`/acceptance-acts/${newId}`);
    redirect("/acceptance-acts");
  }

  async function createAndDownloadActDocx(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch("/api/acceptance-acts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      data?: { id: string };
      error?: string;
      acceptanceActId?: string;
    } | null;
    if (!res.ok) {
      if (data?.error === "ACCEPTANCE_ACT_ALREADY_EXISTS" && data.acceptanceActId) {
        return { acceptanceActId: data.acceptanceActId };
      }
      if (data?.error === "ACCEPTANCE_ACT_ALREADY_EXISTS") {
        throw new Error("Для цього рахунку вже створено акт.");
      }
      throw new Error(data?.error ?? "CREATE_FAILED");
    }
    const newId = data?.data?.id;
    if (newId) return { acceptanceActId: newId };
    throw new Error("CREATE_FAILED");
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="page-title">Новий акт</h1>
      </div>
      <AcceptanceActForm
        invoices={invoiceRows.map((i) => ({
          id: i.id,
          label: `${i.number} (${new Date(i.date).toLocaleDateString("uk-UA")})`,
          number: i.number,
          workType: i.workType,
          customerCompanyId: i.customerCompanyId,
          contractorCompanyId: i.contractorCompanyId,
          lineItems: lineItemsByInvoiceId.get(i.id) ?? [],
        }))}
        companies={companyRows.map((c) => ({
          id: c.id,
          label: c.shortName,
          actSignerFullNameNom: c.actSignerFullNameNom,
          actSignerFullNameGen: c.actSignerFullNameGen,
          actSignerPositionNom: c.actSignerPositionNom,
          actSignerPositionGen: c.actSignerPositionGen,
        }))}
        initialInvoiceId={initialInvoiceId}
        defaultSigningLocation={defaultSigningLocation}
        onSubmit={create}
        onSubmitAndDownloadActDocx={createAndDownloadActDocx}
        signerPositionNomOptions={signerPositionNomOptions}
        signerPositionGenOptions={signerPositionGenOptions}
        signingLocationOptions={signingLocationOptions}
        invoiceSignerById={invoiceSignerById}
      />
    </div>
  );
}

