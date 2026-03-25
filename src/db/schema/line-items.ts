import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { acceptanceActs } from "./acceptance-acts";
import { contracts } from "./contracts";
import { invoices } from "./invoices";

export const lineItems = pgTable(
  "line_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
    acceptanceActId: uuid("acceptance_act_id").references(() => acceptanceActs.id, { onDelete: "cascade" }),
    sourceContractLineItemId: uuid("source_contract_line_item_id"),

    title: text("title").notNull(),
    unit: text("unit").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    price: numeric("price", { precision: 14, scale: 2 }).notNull(), // without VAT

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    contractIdx: index("line_items_contract_idx").on(t.contractId),
    invoiceIdx: index("line_items_invoice_idx").on(t.invoiceId),
    actIdx: index("line_items_acceptance_act_idx").on(t.acceptanceActId),
  }),
);

