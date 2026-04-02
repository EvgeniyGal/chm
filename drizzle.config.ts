import { resolve } from "node:path";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { normalizeDatabaseUrlForPg } from "./src/db/normalize-database-url";

// Drizzle CLI does not load .env.local (Next.js does). Match Next load order.
config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

/** Prefer direct (non-pooler) URL for migrate/studio — Neon pooler often breaks DDL migrations. */
function drizzleCliDatabaseUrl(): string {
  const raw =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL_DIRECT?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  return normalizeDatabaseUrlForPg(raw || undefined) ?? "";
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: drizzleCliDatabaseUrl(),
  },
  strict: true,
  verbose: true,
});

