import { desc } from "drizzle-orm";

import { db } from "@/db";
import { acceptanceActs } from "@/db/schema";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { requireRole } from "@/lib/authz";

export default async function AcceptanceActsPage() {
  await requireRole("MANAGER");
  const rows = await db.select().from(acceptanceActs).orderBy(desc(acceptanceActs.date));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Акти</h1>
          <p className="text-sm text-zinc-600">Список актів приймання-передачі.</p>
        </div>
        <a
          className="crm-btn-primary"
          href="/acceptance-acts/new"
        >
          Додати акт
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-crm-table-header text-left text-sm font-semibold text-foreground/90">
            <tr>
              <th className="px-4 py-3">Номер</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{r.number}</td>
                <td className="px-4 py-3">{new Date(r.date).toLocaleDateString("uk-UA")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <InfoDialog title={`Акт ${r.number}`}>
                      <div className="grid gap-2">
                        <Row k="Місце" v={r.signingLocation} />
                        <Row k="Завершення" v={new Date(r.completionDate).toLocaleDateString("uk-UA")} />
                        <Row k="Разом (без ПДВ)" v={String(r.totalWithoutVat)} />
                        <Row k="ПДВ 20%" v={String(r.vat20)} />
                        <Row k="Разом з ПДВ" v={String(r.totalWithVat)} />
                      </div>
                    </InfoDialog>
                    <a className="underline" href={`/acceptance-acts/${r.id}`}>
                      Відкрити
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={3}>
                  Поки що немає актів.
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
      <div className="col-span-2 text-foreground">{v}</div>
    </div>
  );
}

