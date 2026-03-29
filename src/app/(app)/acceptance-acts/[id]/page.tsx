import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AcceptanceActDetailForm } from "@/components/acceptance-acts/AcceptanceActDetailForm";
import { db } from "@/db";
import { acceptanceActs, companies, contracts, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { internalApiFetch } from "@/lib/internal-api-fetch";
import { getSignedScansForEntity } from "@/lib/signed-scans";

async function saveAcceptanceActEdit(
  actId: string,
  values: {
    signingLocation: string;
    completionDate: string;
    signerFullNameNom: string;
    signerFullNameGen: string;
    signerPositionNom: string;
    signerPositionGen: string;
  },
) {
  "use server";
  await requireRole("ADMIN");
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const res = await internalApiFetch(`${baseUrl}/api/acceptance-acts/${actId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(data?.error ?? "UPDATE_FAILED");
  revalidatePath(`/acceptance-acts/${actId}`);
  revalidatePath("/acceptance-acts");
}

export default async function AcceptanceActInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireRole("MANAGER");
  const canEdit = role === "ADMIN" || role === "OWNER";
  const { id } = await params;

  const act = await db.query.acceptanceActs.findFirst({ where: eq(acceptanceActs.id, id) });
  if (!act) redirect("/acceptance-acts");

  const [items, signedScansInitial, invoiceRow, companyRows] = await Promise.all([
    db.query.lineItems.findMany({ where: eq(lineItems.acceptanceActId, id) }),
    getSignedScansForEntity("ACCEPTANCE_ACT", id),
    db.query.invoices.findFirst({ where: eq(invoices.id, act.invoiceId) }),
    db.select().from(companies).orderBy(desc(companies.createdAt)),
  ]);

  if (!invoiceRow) redirect("/acceptance-acts");

  const contractRow =
    act.contractId != null
      ? await db.query.contracts.findFirst({ where: eq(contracts.id, act.contractId) })
      : null;

  return (
    <div className="max-w-5xl min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Акт {act.number}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(act.date).toLocaleDateString("uk-UA")}
          {invoiceRow.workType === "SERVICES" ? " · Послуги" : " · Роботи"}
        </p>
      </div>

      <AcceptanceActDetailForm
        actId={id}
        actNumber={act.number}
        actDateIso={new Date(act.date).toISOString()}
        signingLocation={act.signingLocation}
        completionDateIso={new Date(act.completionDate).toISOString()}
        customerCompanyId={act.customerCompanyId}
        contractorCompanyId={act.contractorCompanyId}
        companies={companyRows.map((c) => ({ id: c.id, label: c.shortName }))}
        signerFullNameNom={act.signerFullNameNom}
        signerFullNameGen={act.signerFullNameGen}
        signerPositionNom={act.signerPositionNom}
        signerPositionGen={act.signerPositionGen}
        totalWithoutVat={String(act.totalWithoutVat)}
        vat20={String(act.vat20)}
        totalWithVat={String(act.totalWithVat)}
        workType={invoiceRow.workType}
        lineItems={items.map((it) => ({
          id: it.id,
          title: it.title,
          unit: it.unit,
          quantity: String(it.quantity),
          price: String(it.price),
        }))}
        invoice={{ id: invoiceRow.id, number: invoiceRow.number }}
        contract={contractRow ? { id: contractRow.id, number: contractRow.number } : null}
        signedScansInitial={signedScansInitial}
        canEdit={canEdit}
        onSave={saveAcceptanceActEdit.bind(null, id)}
      />
    </div>
  );
}
