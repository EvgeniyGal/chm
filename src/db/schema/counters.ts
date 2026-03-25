import { integer, pgEnum, pgTable, primaryKey, smallint, timestamp, varchar } from "drizzle-orm/pg-core";
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

export function formatDocNumber(opts: { seq: number; year: number; month: number }) {
  const mm = String(opts.month).padStart(2, "0");
  return `${opts.seq}/${mm}-${opts.year}`;
}

