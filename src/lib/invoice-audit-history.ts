import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { auditEvents, users } from "@/db/schema";

export type InvoiceAuditHistoryItem = {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  atIso: string;
  actorLabel: string;
  summaryLines: string[];
  diffJson: string;
};

const FIELD_LABELS: Record<string, string> = {
  number: "Номер",
  date: "Дата",
  workType: "Тип",
  customerCompanyId: "Замовник (ID компанії)",
  contractorCompanyId: "Виконавець (ID компанії)",
  contractId: "Договір (ID)",
  isExternalContract: "Зовнішній договір",
  externalContractNumber: "Номер зовнішнього договору",
  externalContractDate: "Дата зовнішнього договору",
  signerFullNameNom: "ПІБ підписанта (називний)",
  signerPositionNom: "Посада підписанта (називний)",
  totalWithoutVat: "Разом без ПДВ",
  vat20: "ПДВ 20%",
  totalWithVat: "Разом з ПДВ",
};

const SKIP_COMPARE = new Set(["id", "createdAt", "updatedAt"]);

function displayValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Так" : "Ні";
  if (key === "workType") return val === "SERVICES" ? "Послуги" : val === "WORKS" ? "Роботи" : String(val);
  if ((key === "date" || key.endsWith("At") || key === "externalContractDate") && (typeof val === "string" || val instanceof Date)) {
    const d = new Date(val as string | Date);
    return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleDateString("uk-UA");
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function diffInvoiceRows(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (SKIP_COMPARE.has(key)) continue;
    const bv = before[key];
    const av = after[key];
    if (JSON.stringify(bv) === JSON.stringify(av)) continue;
    const label = FIELD_LABELS[key] ?? key;
    lines.push(`${label}: ${displayValue(key, bv)} → ${displayValue(key, av)}`);
  }
  return lines;
}

/** Human-readable lines for INVOICE audit `diff` JSON (stored by writeAuditEvent). */
export function summarizeInvoiceAuditDiff(action: string, diff: unknown): string[] {
  const lines: string[] = [];
  if (diff == null) return ["Немає збережених деталей."];

  let parsed: Record<string, unknown>;
  try {
    parsed = typeof diff === "string" ? (JSON.parse(diff) as Record<string, unknown>) : (diff as Record<string, unknown>);
  } catch {
    return ["Не вдалося прочитати деталі події."];
  }

  if (action === "CREATE") {
    lines.push("Рахунок створено.");
    const after = parsed.after as Record<string, unknown> | undefined;
    if (after?.number != null) lines.push(`Номер: ${displayValue("number", after.number)}`);
    if (after?.date != null) lines.push(`Дата: ${displayValue("date", after.date)}`);
    const items = parsed.items;
    if (Array.isArray(items)) lines.push(`Позицій у переліку: ${items.length}.`);
    return lines;
  }

  if (action === "DELETE") {
    lines.push("Рахунок видалено.");
    const before = parsed.before as Record<string, unknown> | undefined;
    if (before?.number != null) lines.push(`Номер був: ${displayValue("number", before.number)}.`);
    return lines;
  }

  if (action === "UPDATE") {
    if (parsed.kind === "SIGNED_SCAN") {
      lines.push(`Додано скан у сховище (${displayValue("contentType", parsed.contentType)}).`);
      return lines;
    }
    if (parsed.kind === "SIGNED_SCAN_DELETED") {
      lines.push("Видалено скан зі сховища.");
      return lines;
    }

    const before = parsed.before as Record<string, unknown> | undefined;
    const after = parsed.after as Record<string, unknown> | undefined;
    if (before && after) {
      const fieldLines = diffInvoiceRows(before, after);
      lines.push(...fieldLines);
    }

    if (lines.length === 0) lines.push("Оновлення запису (деталі не структуровані).");
    return lines;
  }

  return [`Подія: ${action}`];
}

function actorDisplay(firstName: string, lastName: string, email: string): string {
  const name = `${firstName} ${lastName}`.trim();
  return name ? `${name} · ${email}` : email;
}

export async function loadInvoiceAuditHistory(invoiceId: string): Promise<InvoiceAuditHistoryItem[]> {
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.entityType, "INVOICE"), eq(auditEvents.entityId, invoiceId)))
    .orderBy(desc(auditEvents.at));

  const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter((x): x is string => Boolean(x)))];
  let actorById = new Map<string, string>();
  if (actorIds.length > 0) {
    const actorRows = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(inArray(users.id, actorIds));
    actorById = new Map(actorRows.map((u) => [u.id, actorDisplay(u.firstName, u.lastName, u.email)]));
  }

  return rows.map((e) => {
    let parsedDiff: unknown = e.diff;
    try {
      parsedDiff = JSON.parse(e.diff);
    } catch {
      parsedDiff = {};
    }
    const summaryLines = summarizeInvoiceAuditDiff(e.action, parsedDiff);
    return {
      id: e.id,
      action: e.action,
      atIso: e.at instanceof Date ? e.at.toISOString() : String(e.at),
      actorLabel: e.actorUserId ? (actorById.get(e.actorUserId) ?? e.actorUserId) : "Система / невідомо",
      summaryLines,
      diffJson: e.diff,
    };
  });
}
