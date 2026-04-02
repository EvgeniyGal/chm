import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { certificationGroups, welderCertifications } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";

function ilikePattern(term: string): string {
  return `%${term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

export default async function AttestationWeldersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const base = db
    .select({
      w: welderCertifications,
      groupNumber: certificationGroups.groupNumber,
    })
    .from(welderCertifications)
    .innerJoin(certificationGroups, eq(welderCertifications.groupId, certificationGroups.id));

  const rows = q
    ? await base
        .where(
          or(
            ilike(welderCertifications.lastName, ilikePattern(q)),
            ilike(welderCertifications.firstName, ilikePattern(q)),
            ilike(welderCertifications.middleName, ilikePattern(q)),
            ilike(certificationGroups.groupNumber, ilikePattern(q)),
          ),
        )
        .orderBy(desc(welderCertifications.createdAt))
    : await base.orderBy(desc(welderCertifications.createdAt));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Зварники</h1>
          <p className="text-sm text-muted-foreground">Усі атестації зварників по групах.</p>
        </div>
        <Link className="crm-btn-primary w-fit" href="/attestation/welders/new">
          Додати атестацію
        </Link>
      </div>

      <form className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center" action="/attestation/welders" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Пошук за прізвищем, іменем або номером групи"
          className="h-10 flex-1 rounded-md border border-border px-3"
        />
        <div className="flex gap-2">
          <button type="submit" className="crm-btn-outline">
            Знайти
          </button>
          {q ? (
            <Link className="crm-btn-outline self-center" href="/attestation/welders">
              Скинути
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="p-2 font-medium">Група</th>
              <th className="p-2 font-medium">№ у групі</th>
              <th className="p-2 font-medium">ПІБ</th>
              <th className="p-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={4}>
                  Немає записів. Додайте атестацію з картки групи або тут.
                </td>
              </tr>
            ) : (
              rows.map(({ w, groupNumber }) => (
                <tr key={w.id} className="border-b border-border">
                  <td className="p-2 font-medium">№{groupNumber}</td>
                  <td className="p-2">{w.orderInGroup}</td>
                  <td className="p-2">
                    {w.lastName} {w.firstName} {w.middleName ?? ""}
                  </td>
                  <td className="p-2 text-right">
                    <Link className="text-primary underline" href={`/attestation/welders/${w.id}`}>
                      Відкрити
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
