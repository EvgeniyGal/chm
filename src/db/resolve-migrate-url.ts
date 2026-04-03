import { normalizeDatabaseUrlForPg } from "./normalize-database-url";

function deriveNeonDirectFromPooler(connectionString: string): string | null {
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

/** Same URL resolution as `src/db/migrate.ts` (direct / unpooled for Neon migrations). */
export function resolveMigrationsUrl(): string {
  const explicit =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL_DIRECT?.trim() ||
    process.env.DIRECT_URL?.trim();

  if (explicit) {
    return normalizeDatabaseUrlForPg(explicit) ?? explicit;
  }

  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) {
    throw new Error("Set DATABASE_URL in .env.local (or DATABASE_URL_UNPOOLED for direct).");
  }

  if (pooled.includes("-pooler")) {
    const derived = deriveNeonDirectFromPooler(pooled);
    if (derived) {
      return normalizeDatabaseUrlForPg(derived) ?? derived;
    }
  }

  return normalizeDatabaseUrlForPg(pooled) ?? pooled;
}
