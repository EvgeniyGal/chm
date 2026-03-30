import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { invoices } from "./invoices";
import { contracts } from "./contracts";

export const acceptanceActs = pgTable("acceptance_acts", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: text("number").notNull().unique(), // {seq}/{MM}-{YYYY}
  date: timestamp("date", { withTimezone: true }).notNull(),
  signingLocation: text("signing_location").notNull(),
  completionDate: timestamp("completion_date", { withTimezone: true }).notNull(),

  customerCompanyId: uuid("customer_company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  contractorCompanyId: uuid("contractor_company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),

  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  /** Один акт на один рахунок. */
  invoiceId: uuid("invoice_id")
    .notNull()
    .unique()
    .references(() => invoices.id, { onDelete: "restrict" }),

  signerFullNameNom: text("signer_full_name_nom").notNull(),
  signerFullNameGen: text("signer_full_name_gen").notNull(),
  signerPositionNom: text("signer_position_nom").notNull(),
  signerPositionGen: text("signer_position_gen").notNull(),

  totalWithoutVat: numeric("total_without_vat", { precision: 14, scale: 2 }).notNull().default("0"),
  vat20: numeric("vat_20", { precision: 14, scale: 2 }).notNull().default("0"),
  totalWithVat: numeric("total_with_vat", { precision: 14, scale: 2 }).notNull().default("0"),

  /** Original acceptance act signed (paper counterpart received). */
  isSigned: boolean("is_signed").notNull().default(false),
  /** Filed in physical archive / paper cupboard. */
  isArchived: boolean("is_archived").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

