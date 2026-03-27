/** Next.js `redirect()` / `notFound()` throw errors with a digest the client must rethrow. */
export function isNextNavigationError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const d = (e as { digest?: unknown }).digest;
  return typeof d === "string" && (d.startsWith("NEXT_REDIRECT") || d.startsWith("NEXT_NOT_FOUND"));
}
