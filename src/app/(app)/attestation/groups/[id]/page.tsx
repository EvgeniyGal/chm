import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { certificationGroups, commissionMembers, welderCertifications } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";
import { certificationGroupStatusLabelUa } from "@/lib/attestation/labels-uk";

export default async function AttestationGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const group = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, id),
  });
  if (!group) notFound();

  const head = await db.query.commissionMembers.findFirst({
    where: eq(commissionMembers.id, group.headId),
  });

  const welders = await db
    .select()
    .from(welderCertifications)
    .where(eq(welderCertifications.groupId, id))
    .orderBy(asc(welderCertifications.orderInGroup));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="text-sm text-muted-foreground underline" href="/attestation/groups">
          ← До списку груп
        </Link>
        <h1 className="page-title mt-2">Група №{group.groupNumber}</h1>
      </div>

      <dl className="grid max-w-xl grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <dt className="text-muted-foreground">Дата протоколу</dt>
        <dd>{new Date(group.protocolDate).toLocaleDateString("uk-UA")}</dd>
        <dt className="text-muted-foreground">Дата контролю</dt>
        <dd>{new Date(group.inspectionDate).toLocaleDateString("uk-UA")}</dd>
        <dt className="text-muted-foreground">Видача посвідчень</dt>
        <dd>{new Date(group.certificateIssueDate).toLocaleDateString("uk-UA")}</dd>
        <dt className="text-muted-foreground">Місце видачі</dt>
        <dd>{group.certificateIssueLocation}</dd>
        <dt className="text-muted-foreground">Голова комісії</dt>
        <dd>{head?.fullName ?? "—"}</dd>
        <dt className="text-muted-foreground">Статус</dt>
        <dd>
          {certificationGroupStatusLabelUa(group.status)}
          {group.status === "draft" || group.status === "active" ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              Змінити статус: «Редагувати групу» — блок «Статус групи» (завершення, архів або активація з чернетки).
            </span>
          ) : null}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <a
          className="crm-btn-outline"
          href={`/api/attestation/documents/report?groupId=${id}`}
        >
          Завантажити звіт (.docx)
        </a>
        {group.status === "draft" || group.status === "active" ? (
          <Link className="crm-btn-outline" href={`/attestation/groups/${id}/edit`}>
            Редагувати групу
          </Link>
        ) : null}
        {group.status === "draft" || group.status === "active" ? (
          <Link className="crm-btn-primary" href={`/attestation/welders/new?groupId=${id}`}>
            Додати зварника
          </Link>
        ) : (
          <span className="self-center text-sm text-muted-foreground">Додавання зварників недоступне</span>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold">Зварники у групі</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-2 font-medium">№</th>
                <th className="p-2 font-medium">ПІБ</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {welders.length === 0 ? (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={3}>
                    Немає записів атестації. Додайте зварника.
                  </td>
                </tr>
              ) : (
                welders.map((w) => (
                  <tr key={w.id} className="border-b border-border">
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
    </div>
  );
}
