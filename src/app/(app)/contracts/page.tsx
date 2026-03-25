import { desc } from "drizzle-orm";

import { db } from "@/db";
import { contracts } from "@/db/schema";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { requireRole } from "@/lib/authz";

export default async function ContractsPage() {
  await requireRole("MANAGER");
  const rows = await db.select().from(contracts).orderBy(desc(contracts.date));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Договори</h1>
          <p className="text-sm text-zinc-600">Список договорів.</p>
        </div>
        <a
          className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          href="/contracts/new"
        >
          Додати договір
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFF7E5] text-left text-zinc-700">
            <tr>
              <th className="px-4 py-3">Номер</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3">{c.number}</td>
                <td className="px-4 py-3">{new Date(c.date).toLocaleDateString("uk-UA")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <InfoDialog title={`Договір ${c.number}`}>
                      <div className="grid gap-2">
                        <Row k="Дата" v={new Date(c.date).toLocaleDateString("uk-UA")} />
                        <Row k="Місце" v={c.signingLocation} />
                        <Row k="Разом (без ПДВ)" v={String(c.totalWithoutVat)} />
                        <Row k="ПДВ 20%" v={String(c.vat20)} />
                        <Row k="Разом з ПДВ" v={String(c.totalWithVat)} />
                      </div>
                    </InfoDialog>
                    <a className="underline" href={`/contracts/${c.id}/edit`}>
                      Edit
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={3}>
                  Поки що немає договорів.
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

