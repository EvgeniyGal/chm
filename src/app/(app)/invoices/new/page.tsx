import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, contracts, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { InvoiceForm } from "./ui";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ contractId?: string }>;
}) {
  await requireRole("ADMIN");
  const { contractId } = await searchParams;

  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const lineItemUnitOptions = await getDropdownOptions(DROPDOWN_SCOPE.LINE_ITEM_UNIT);

  const contract = contractId ? await db.query.contracts.findFirst({ where: eq(contracts.id, contractId) }) : null;
  const contractItems = contractId ? await db.query.lineItems.findMany({ where: eq(lineItems.contractId, contractId) }) : [];

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(data?.error ?? "CREATE_FAILED");
    redirect("/invoices");
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="page-title">Новий рахунок</h1>
        <p className="text-sm text-zinc-600">{contract ? `Створення на основі договору ${contract.number}` : "Створення окремого рахунку"}</p>
      </div>

      <InvoiceForm
        companies={companyRows.map((c) => ({ id: c.id, label: c.shortName }))}
        contract={
          contract
            ? {
                id: contract.id,
                customerCompanyId: contract.customerCompanyId,
                contractorCompanyId: contract.contractorCompanyId,
                items: contractItems.map((it) => ({
                  id: it.id,
                  title: it.title,
                  unit: it.unit,
                  quantity: Number(it.quantity),
                  price: Number(it.price),
                })),
              }
            : null
        }
        lineItemUnitOptions={lineItemUnitOptions}
        onSubmit={create}
      />
    </div>
  );
}

