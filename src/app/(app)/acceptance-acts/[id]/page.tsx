import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { acceptanceActs, lineItems } from "@/db/schema";
import { SignedUpload } from "@/components/uploads/SignedUpload";
import { requireRole } from "@/lib/authz";

export default async function AcceptanceActInfoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const act = await db.query.acceptanceActs.findFirst({ where: eq(acceptanceActs.id, id) });
  if (!act) redirect("/acceptance-acts");
  const items = await db.query.lineItems.findMany({ where: eq(lineItems.acceptanceActId, id) });

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Акт {act.number}</h1>
          <p className="text-sm text-zinc-600">{new Date(act.date).toLocaleDateString("uk-UA")}</p>
        </div>
        <a
          className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm"
          href={`/api/documents/acceptance-act/${id}`}
        >
          Завантажити DOCX
        </a>
      </div>

      <SignedUpload entityType="ACCEPTANCE_ACT" entityId={id} />

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFF7E5] text-left text-zinc-700">
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

      <a className="text-sm underline" href="/acceptance-acts">
        ← Назад до списку
      </a>
    </div>
  );
}

