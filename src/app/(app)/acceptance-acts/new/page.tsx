import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { invoices } from "@/db/schema";
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

  const invoiceRows = await db.select().from(invoices).orderBy(desc(invoices.date));
  const initialInvoiceId = invoiceId && invoiceRows.some((i) => i.id === invoiceId) ? invoiceId : "";

  async function create(payload: any) {
    "use server";
    await requireRole("ADMIN");
    const res = await internalApiFetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/acceptance-acts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(data?.error ?? "CREATE_FAILED");
    redirect("/acceptance-acts");
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="page-title">Новий акт</h1>
        <p className="text-sm text-zinc-600">Акт створюється на основі рахунку.</p>
      </div>
      <AcceptanceActForm
        invoices={invoiceRows.map((i) => ({ id: i.id, label: `${i.number} (${new Date(i.date).toLocaleDateString("uk-UA")})` }))}
        initialInvoiceId={initialInvoiceId}
        onSubmit={create}
      />
    </div>
  );
}

