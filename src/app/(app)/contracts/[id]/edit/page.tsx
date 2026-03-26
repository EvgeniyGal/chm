import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, contracts, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";
import { ContractEditForm } from "./ui";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;

  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) redirect("/contracts");
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });
  const companyRows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const signingLocationOptions = await getDropdownOptions(DROPDOWN_SCOPE.SIGNING_LOCATION);

  async function update(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await fetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(data?.error ?? "UPDATE_FAILED");
    redirect(`/contracts/${id}`);
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Редагувати договір {contract.number}</h1>
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
          items: items.map((it) => ({
            title: it.title,
            unit: it.unit,
            quantity: Number(it.quantity),
            price: Number(it.price),
          })),
        }}
        onSubmit={update}
        cancelHref={`/contracts/${id}`}
      />
    </div>
  );
}

