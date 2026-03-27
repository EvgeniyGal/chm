import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { contracts, lineItems } from "@/db/schema";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { SignedUpload } from "@/components/uploads/SignedUpload";
import { requireRole } from "@/lib/authz";

export default async function ContractInfoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) redirect("/contracts");
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Договір {contract.number}</h1>
          <p className="text-sm text-zinc-600">{new Date(contract.date).toLocaleDateString("uk-UA")}</p>
        </div>
        <div className="flex gap-2">
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href={`/contracts/${id}/edit`}>
            Редагувати
          </a>
          <InfoDialog title="Дії">
            <div className="flex flex-col gap-2">
              <a className="underline" href={`/invoices/new?contractId=${id}`}>
                Створити рахунок
              </a>
              <a className="underline" href={`/acceptance-acts/new?contractId=${id}`}>
                Створити акт
              </a>
            </div>
          </InfoDialog>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Місце складання</div>
          <div className="col-span-2">{contract.signingLocation}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Разом (без ПДВ)</div>
          <div className="col-span-2">{contract.totalWithoutVat}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm" href={`/api/documents/contract/${id}`}>
          Завантажити DOCX
        </a>
      </div>

      <SignedUpload entityType="CONTRACT" entityId={id} />

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

      <a className="text-sm underline" href="/contracts">
        ← Назад до списку
      </a>
    </div>
  );
}

