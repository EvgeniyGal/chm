import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { acceptanceActs, contracts, invoices } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { internalApiFetch } from "@/lib/internal-api-fetch";
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

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/acceptance-acts`, {
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

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="page-title">Новий акт</h1>
        <p className="text-sm text-zinc-600">Акт завжди створюється на основі рахунку; позиції та суми збігаються з рахунком.</p>
      </div>
      <AcceptanceActForm
        invoices={invoiceRows.map((i) => ({ id: i.id, label: `${i.number} (${new Date(i.date).toLocaleDateString("uk-UA")})` }))}
        initialInvoiceId={initialInvoiceId}
        defaultSigningLocation={defaultSigningLocation}
        onSubmit={create}
      />
    </div>
  );
}

