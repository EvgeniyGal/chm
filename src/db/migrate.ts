/**
 * Apply Drizzle SQL migrations using Neon's recommended path:
 * https://neon.tech/docs/guides/drizzle-migrations
 *
 * Uses `drizzle-orm/neon-http/migrator` + `@neondatabase/serverless` instead of `drizzle-kit migrate`
 * with `pg`, which often fails on Neon (SSL / pooler).
 *
 * Note: Neon HTTP migrator runs without transactions — see drizzle-orm neon-http migrator.d.ts.
 */
import { resolve } from "node:path";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { resolveMigrationsUrl } from "./resolve-migrate-url";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

function describeTarget(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    const user = u.username ? `${u.username}@` : "";
    return `${u.protocol}//${user}${u.host}${u.pathname}`;
  } catch {
    return "(invalid URL)";
  }
}

async function main() {
  const url = resolveMigrationsUrl();
  if (process.env.DATABASE_URL?.includes("-pooler") && !process.env.DATABASE_URL_UNPOOLED?.trim()) {
    console.log("db:migrate: Neon direct URL derived from DATABASE_URL (pooler host -> direct host)");
  }
  console.log(`db:migrate: target ${describeTarget(url)}`);
  console.log("db:migrate: applying via @neondatabase/serverless + drizzle-orm/neon-http/migrator\n");

  const sql = neon(url);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
  console.log("\ndb:migrate: OK");
}

main().catch((err: unknown) => {
  console.error("db:migrate:", err);
  const e = err as { cause?: { code?: string; message?: string }; code?: string; message?: string };
  const code = e?.cause?.code ?? e?.code;
  const msg = String(e?.cause?.message ?? e?.message ?? "");
  if (code === "42710" || msg.includes("already exists")) {
    console.error(
      "\ndb:migrate: If migration 0012 (attestation) was partially applied, record it then re-run:\n  npm run db:migrate:resolve-0012\n  npm run db:migrate\n",
    );
  }
  process.exit(1);
});
