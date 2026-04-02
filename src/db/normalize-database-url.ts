/**
 * `pg` / `pg-connection-string` v2 warns when `sslmode` is prefer, require, or verify-ca
 * (they are temporarily treated like verify-full). Adding `uselibpqcompat=true` opts into
 * libpq semantics and silences the warning until pg v9 — see warning text in Node stderr.
 */
export function normalizeDatabaseUrlForPg(urlString: string | undefined): string | undefined {
  if (!urlString?.trim()) return urlString;
  try {
    const u = new URL(urlString);
    const sslmode = u.searchParams.get("sslmode")?.toLowerCase();
    const ambiguousSsl =
      sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca";
    if (ambiguousSsl && !u.searchParams.has("uselibpqcompat")) {
      u.searchParams.set("uselibpqcompat", "true");
    }
    return u.toString();
  } catch {
    return urlString;
  }
}
