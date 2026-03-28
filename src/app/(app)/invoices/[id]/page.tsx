import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { invoices, lineItems } from "@/db/schema";
import { SignedUpload } from "@/components/uploads/SignedUpload";
import { requireRole } from "@/lib/authz";
import { getSignedScansForEntity } from "@/lib/signed-scans";

export default async function InvoiceInfoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) redirect("/invoices");
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.invoiceId, id) });
  const signedScansInitial = await getSignedScansForEntity("INVOICE", id);

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Рахунок {inv.number}</h1>
          <p className="text-sm text-zinc-600">{new Date(inv.date).toLocaleDateString("uk-UA")}</p>
        </div>
        <a className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm" href={`/api/documents/invoice/${id}`}>
          Завантажити DOCX
        </a>
      </div>

      <SignedUpload entityType="INVOICE" entityId={id} initialScans={signedScansInitial} />

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-crm-table-header text-left text-sm font-semibold text-foreground/90">
            <tr>
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Назва</th>
              <th className="px-4 py-3 w-20">Од.</th>
              <th className="px-4 py-3 w-28">К-сть</th>
              <th className="px-4 py-3 w-32">Ціна</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-t">
                <td className="px-4 py-3 text-zinc-500">{idx + 1}</td>
                <td className="px-4 py-3">{it.title}</td>
                <td className="px-4 py-3">{it.unit}</td>
                <td className="px-4 py-3">{it.quantity}</td>
                <td className="px-4 py-3">{it.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a className="text-sm underline" href="/invoices">
        ← Назад до списку
      </a>
    </div>
  );
}

