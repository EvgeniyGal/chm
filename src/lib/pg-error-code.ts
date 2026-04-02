/** Walks Drizzle/pg error chains to find PostgreSQL `code` (e.g. `42P01`). */
export function getPgErrorCode(error: unknown): string | undefined {
  const walk = (e: unknown): string | undefined => {
    if (!e || typeof e !== "object") return undefined;
    const o = e as { code?: unknown; cause?: unknown };
    if (typeof o.code === "string" && o.code.length > 0) return o.code;
    if (o.cause !== undefined) return walk(o.cause);
    return undefined;
  };
  return walk(error);
}
