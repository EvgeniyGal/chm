import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import { requireRole } from "@/lib/authz";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ entityType: string; id: string }>;
}) {
  await requireRole("ADMIN");
  const { entityType, id } = await params;

  const normalized = entityType.toUpperCase();
  if (!["COMPANY", "CONTRACT", "INVOICE", "ACCEPTANCE_ACT"].includes(normalized)) {
    return <div className="text-sm text-zinc-700">Невірний тип сутності.</div>;
  }

  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.entityType, normalized as any), eq(auditEvents.entityId, id)))
    .orderBy(desc(auditEvents.at));

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="page-title">Історія змін</h1>
        <p className="text-sm text-zinc-600">
          {normalized} / {id}
        </p>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b bg-muted px-4 py-3 text-sm font-semibold text-foreground">Події</div>
        <div className="divide-y">
          {rows.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">{e.action}</div>
                <div className="text-xs text-zinc-500">{new Date(e.at).toLocaleString("uk-UA")}</div>
              </div>
              <div className="mt-1 text-xs text-zinc-500">actor: {e.actorUserId ?? "—"}</div>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-800">
{e.diff}
              </pre>
            </div>
          ))}
          {rows.length === 0 ? <div className="px-4 py-8 text-sm text-zinc-500">Подій поки що немає.</div> : null}
        </div>
      </div>
    </div>
  );
}

