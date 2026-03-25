import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  shortName: text("short_name").notNull(),
  address: text("address").notNull(),
  contacts: text("contacts").notNull().default("[]"),
  edrpouCode: text("edrpou_code").notNull(),
  vatIdTin: text("vat_id_tin"),
  taxStatus: text("tax_status").notNull(),
  iban: text("iban").notNull(),
  bank: text("bank").notNull(),

  contractSignerFullNameNom: text("contract_signer_full_name_nom").notNull(),
  contractSignerFullNameGen: text("contract_signer_full_name_gen").notNull(),
  contractSignerPositionNom: text("contract_signer_position_nom").notNull(),
  contractSignerPositionGen: text("contract_signer_position_gen").notNull(),
  contractSignerActingUnder: text("contract_signer_acting_under").notNull(),

  actSignerFullNameNom: text("act_signer_full_name_nom").notNull(),
  actSignerFullNameGen: text("act_signer_full_name_gen").notNull(),
  actSignerPositionNom: text("act_signer_position_nom").notNull(),
  actSignerPositionGen: text("act_signer_position_gen").notNull(),

  invoiceSignerFullNameNom: text("invoice_signer_full_name_nom").notNull(),
  invoiceSignerPositionNom: text("invoice_signer_position_nom").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

