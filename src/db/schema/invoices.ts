import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { contracts, workTypeEnum } from "./contracts";

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: text("number").notNull().unique(), // {seq}/{MM}-{YYYY}
  date: timestamp("date", { withTimezone: true }).notNull(),

  workType: workTypeEnum("work_type").notNull().default("WORKS"),

  customerCompanyId: uuid("customer_company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  contractorCompanyId: uuid("contractor_company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),

  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),

  isExternalContract: boolean("is_external_contract").notNull().default(false),
  externalContractNumber: text("external_contract_number"),
  externalContractDate: timestamp("external_contract_date", { withTimezone: true }),

  signerFullNameNom: text("signer_full_name_nom").notNull(),
  signerPositionNom: text("signer_position_nom").notNull(),

  totalWithoutVat: numeric("total_without_vat", { precision: 14, scale: 2 }).notNull().default("0"),
  vat20: numeric("vat_20", { precision: 14, scale: 2 }).notNull().default("0"),
  totalWithVat: numeric("total_with_vat", { precision: 14, scale: 2 }).notNull().default("0"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

