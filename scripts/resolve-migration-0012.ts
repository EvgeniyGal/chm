/**
 * One-time repair: migration `0012_slippery_scarlet_witch` was partially applied (objects exist)
 * but no row was inserted into `drizzle.__drizzle_migrations`, so `npm run db:migrate` tries
 * to run 0012 from the start and fails with "already exists".
 *
 * Inserts the journal row for 0012 with the same hash Drizzle computes (sha256 of the SQL file).
 * Safe to run multiple times (skips if hash already present).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import pg from "pg";

import { resolveMigrationsUrl } from "../src/db/resolve-migrate-url";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

const MIGRATION_TAG = "0012_slippery_scarlet_witch";

async function main() {
  const migrationPath = resolve(process.cwd(), "drizzle", `${MIGRATION_TAG}.sql`);
  const query = fs.readFileSync(migrationPath, "utf8");
  const hash = crypto.createHash("sha256").update(query).digest("hex");

  const journal = JSON.parse(fs.readFileSync(resolve(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };
  const entry = journal.entries.find((e) => e.tag === MIGRATION_TAG);
  if (!entry) {
    throw new Error(`Journal has no entry for ${MIGRATION_TAG}`);
  }

  const url = resolveMigrationsUrl();
  const pool = new pg.Pool({ connectionString: url });

  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const r = await pool.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
     SELECT $1::text, $2::bigint
     WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1::text)`,
    [hash, entry.when],
  );

  await pool.end();

  const inserted = r.rowCount ?? 0;
  if (inserted === 0) {
    console.log(`db:migrate:resolve-0012: row for ${MIGRATION_TAG} already present (hash matches). Nothing to do.`);
  } else {
    console.log(`db:migrate:resolve-0012: recorded ${MIGRATION_TAG} in drizzle.__drizzle_migrations. Run npm run db:migrate again (should be no-op for 0012).`);
  }
}

main().catch((e) => {
  console.error("db:migrate:resolve-0012:", e);
  process.exit(1);
});
