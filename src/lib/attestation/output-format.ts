export function wantsPdfFormat(searchParams: URLSearchParams): boolean {
  const f = searchParams.get("format")?.trim().toLowerCase();
  return f === "pdf";
}
