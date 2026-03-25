import { pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const entityTypes = ["CONTRACT", "INVOICE", "ACCEPTANCE_ACT"] as const;
export const entityTypeEnum = pgEnum("entity_type", entityTypes);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  kind: varchar("kind", { length: 32 }).notNull(), // e.g. GENERATED_DOCX, SIGNED_SCAN

  storageKey: text("storage_key").notNull(),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  originalFilename: text("original_filename"),
  sha256: text("sha256"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

