/**
 * Legacy: runs `drizzle-kit migrate` with the `pg` driver. Prefer `npm run db:migrate` (Neon HTTP migrator).
 * See https://neon.tech/docs/guides/drizzle-migrations
 *
 * Neon: pooled URLs contain "-pooler" in the host; drizzle-kit migrate needs a direct connection.
 * If DATABASE_URL_UNPOOLED is not set, we derive it by stripping "-pooler" from the hostname.
 */
import { spawnSync } from "node:child_process";
import { writeSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

config({ path: resolve(root, ".env"), quiet: true });
config({ path: resolve(root, ".env.local"), override: true, quiet: true });

/** @param {string} connectionString */
function deriveNeonDirectFromPooler(connectionString) {
  try {
    const u = new URL(connectionString);
    if (!u.hostname.includes("-pooler")) return null;
    const nextHost = u.hostname.replace(/-pooler(?=\.)/, "");
    if (nextHost === u.hostname) return null;
    u.hostname = nextHost;
    return u.toString();
  } catch {
    return null;
  }
}

/** @param {NodeJS.ProcessEnv} env */
function pickMigrateUrlFromEnv(env) {
  return (
    env.DATABASE_URL_UNPOOLED?.trim() ||
    env.DATABASE_URL_DIRECT?.trim() ||
    env.DIRECT_URL?.trim() ||
    env.DATABASE_URL?.trim() ||
    ""
  );
}

/** @param {string} connectionString */
function describeTarget(connectionString) {
  try {
    const u = new URL(connectionString);
    const user = u.username ? `${u.username}@` : "";
    return `${u.protocol}//${user}${u.host}${u.pathname}`;
  } catch {
    return "(could not parse connection URL)";
  }
}

const childEnv = { ...process.env };

const hadExplicitUnpooled =
  Boolean(process.env.DATABASE_URL_UNPOOLED?.trim()) ||
  Boolean(process.env.DATABASE_URL_DIRECT?.trim()) ||
  Boolean(process.env.DIRECT_URL?.trim());

if (!hadExplicitUnpooled && process.env.DATABASE_URL?.trim()?.includes("-pooler")) {
  const derived = deriveNeonDirectFromPooler(process.env.DATABASE_URL.trim());
  if (derived) {
    childEnv.DATABASE_URL_UNPOOLED = derived;
  }
}

const effectiveUrl = pickMigrateUrlFromEnv(childEnv);

if (!effectiveUrl) {
  console.error("db:migrate: DATABASE_URL is empty or missing.");
  console.error("Set it in .env.local (or .env) so Drizzle can connect to Postgres.");
  process.exit(1);
}

const stillPoolerOnly =
  effectiveUrl.includes("-pooler") &&
  !childEnv.DATABASE_URL_UNPOOLED?.trim() &&
  !childEnv.DATABASE_URL_DIRECT?.trim() &&
  !childEnv.DIRECT_URL?.trim();

if (stillPoolerOnly && process.env.ALLOW_POOLER_MIGRATE !== "1") {
  console.error("");
  console.error("db:migrate: drizzle-kit migrate does not work through Neon's pooler host (-pooler).");
  console.error("db:migrate: Set DATABASE_URL_UNPOOLED in .env.local (direct connection in Neon dashboard), or");
  console.error("db:migrate: use a DATABASE_URL host we can rewrite (expected: ...-pooler.<region>.neon.tech).");
  console.error("db:migrate: (Optional: ALLOW_POOLER_MIGRATE=1 to try the pooler anyway.)\n");
  process.exit(1);
}

let sourceLabel = "DATABASE_URL";
if (hadExplicitUnpooled) {
  sourceLabel = "direct (UNPOOLED / DIRECT_URL)";
} else if (childEnv.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL?.trim()?.includes("-pooler")) {
  sourceLabel = "derived direct (Neon: pooler host -> direct host)";
}

console.log(`db:migrate: using ${sourceLabel}`);
console.log(`db:migrate: target ${describeTarget(effectiveUrl)}`);
console.log("db:migrate: running drizzle-kit migrate …\n");

const drizzleKitCli = resolve(root, "node_modules", "drizzle-kit", "bin.cjs");
const result = spawnSync(process.execPath, [drizzleKitCli, "migrate"], {
  cwd: root,
  stdio: "inherit",
  env: childEnv,
});

if (result.error) {
  console.error("db:migrate: failed to start drizzle-kit:", result.error.message);
  process.exit(1);
}

const code = result.status ?? 1;
const tail =
  `\ndb:migrate: drizzle-kit exit code: ${code}\n` +
  (code === 0
    ? "db:migrate: OK. If nothing was applied above, migrations were already recorded.\n"
    : "db:migrate: failed - see Drizzle output above.\n");
writeSync(1, Buffer.from(tail, "utf8"));
process.exit(code);
