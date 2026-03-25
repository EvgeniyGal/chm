import { db } from "@/db";
import { auditEvents } from "@/db/schema";

export async function writeAuditEvent(opts: {
  entityType: "COMPANY" | "CONTRACT" | "INVOICE" | "ACCEPTANCE_ACT";
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  actorUserId?: string | null;
  diff?: unknown;
  note?: string;
}) {
  await db.insert(auditEvents).values({
    entityType: opts.entityType,
    entityId: opts.entityId,
    action: opts.action,
    actorUserId: opts.actorUserId ?? null,
    diff: JSON.stringify(opts.diff ?? {}),
    note: opts.note,
  });
}

