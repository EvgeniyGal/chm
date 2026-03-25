import { desc } from "drizzle-orm";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { requireRole } from "@/lib/authz";

export default async function CompaniesPage() {
  await requireRole("MANAGER");
  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Компанії</h1>
          <p className="text-sm text-zinc-600">Довідник компаній (Замовник/Виконавець).</p>
        </div>
        <a
          className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          href="/companies/new"
        >
          Додати компанію
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFF7E5] text-left text-zinc-700">
            <tr>
              <th className="px-4 py-3">Скорочена назва</th>
              <th className="px-4 py-3">ЄДРПОУ</th>
              <th className="px-4 py-3">IBAN</th>
              <th className="px-4 py-3">Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3">{c.shortName}</td>
                <td className="px-4 py-3">{c.edrpouCode}</td>
                <td className="px-4 py-3">{c.iban}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <InfoDialog title={`Компанія: ${c.shortName}`}>
                      <div className="grid gap-2">
                        <Row k="Повна назва" v={c.fullName} />
                        <Row k="ЄДРПОУ" v={c.edrpouCode} />
                        <Row k="ІПН" v={c.vatIdTin ?? "—"} />
                        <Row k="IBAN" v={c.iban} />
                        <Row k="Банк" v={c.bank} />
                        <Row k="Адреса" v={c.address} />
                      </div>
                    </InfoDialog>
                    <a className="underline" href={`/companies/${c.id}/edit`}>
                      Edit
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={4}>
                  Поки що немає компаній.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-zinc-500">{k}</div>
      <div className="col-span-2 text-zinc-900">{v}</div>
    </div>
  );
}

