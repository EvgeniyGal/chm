import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, primaryKey, smallint, timestamp } from "drizzle-orm/pg-core";
import { documentTypes } from "./_enums";

export const documentTypeEnum = pgEnum("document_type", documentTypes);

export const monthlyCounters = pgTable(
  "monthly_counters",
  {
    documentType: documentTypeEnum("document_type").notNull(),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(),
    value: integer("value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.documentType, t.year, t.month] }),
  }),
);

/** Singleton global sequence for treaties and standalone/external invoices. Never resets. */
export const documentSequence = pgTable(
  "document_sequence",
  {
    id: integer("id").primaryKey(),
    value: integer("value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    singleton: check("document_sequence_singleton", sql`${t.id} = 1`),
  }),
);

/** Auto-number: `{seq}/{MM}-{YYYY}` or `{seq}/{MM}-{YYYY}/{n}` for n >= 2. */
export const AUTO_DOC_NUMBER_RE = /^(\d+)\/(\d{2})-(\d{4})(?:\/(\d+))?$/;

export type ParsedDocNumber = {
  seq: number;
  year: number;
  month: number;
  suffix: number;
};

export function formatDocNumber(opts: { seq: number; year: number; month: number; suffix?: number }) {
  const mm = String(opts.month).padStart(2, "0");
  const base = `${opts.seq}/${mm}-${opts.year}`;
  const suffix = opts.suffix ?? 1;
  return suffix <= 1 ? base : `${base}/${suffix}`;
}

export function parseDocNumber(number: string): ParsedDocNumber | null {
  const match = number.trim().match(AUTO_DOC_NUMBER_RE);
  if (!match) return null;
  const seq = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const suffix = match[4] === undefined ? 1 : Number(match[4]);
  if (!Number.isInteger(seq) || seq < 1) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 1) return null;
  if (!Number.isInteger(suffix) || suffix < 1) return null;
  if (match[4] !== undefined && suffix < 2) return null;
  return { seq, year, month, suffix };
}

/** Treaties without the auto format cannot pass a seq to linked invoices. */
export function canInheritFromContractNumber(contractNumber: string): boolean {
  const parsed = parseDocNumber(contractNumber);
  return parsed !== null && parsed.suffix === 1;
}

export function rewriteAutoNumberForDate(existingNumber: string, at: Date): string | null {
  const parsed = parseDocNumber(existingNumber);
  if (!parsed) return null;
  return formatDocNumber({
    seq: parsed.seq,
    year: at.getUTCFullYear(),
    month: at.getUTCMonth() + 1,
    suffix: parsed.suffix,
  });
}

export function firstFreeSuffixNumber(opts: {
  seq: number;
  year: number;
  month: number;
  taken: Iterable<string>;
}): string {
  const taken = opts.taken instanceof Set ? opts.taken : new Set(opts.taken);
  for (let suffix = 1; suffix < 10_000; suffix++) {
    const candidate = formatDocNumber({ seq: opts.seq, year: opts.year, month: opts.month, suffix });
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("NO_FREE_DOCUMENT_NUMBER");
}

