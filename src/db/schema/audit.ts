import { pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const auditableEntities = ["COMPANY", "CONTRACT", "INVOICE", "ACCEPTANCE_ACT"] as const;
export const auditableEntityEnum = pgEnum("auditable_entity", auditableEntities);

export const auditActions = ["CREATE", "UPDATE", "DELETE"] as const;
export const auditActionEnum = pgEnum("audit_action", auditActions);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: auditableEntityEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  actorUserId: uuid("actor_user_id"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),

  // Store a structured diff; initial implementation uses JSON string to keep dependencies minimal.
  diff: text("diff").notNull().default("{}"),
  note: varchar("note", { length: 255 }),
});

