/** Strip non-ASCII and problematic chars for RFC 2616 `filename=` fallback. */
export function asciiSafeFilename(name: string): string {
  const s = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return s.trim() || "document";
}

/** Content-Disposition value for file downloads with Unicode filenames (RFC 5987). */
export function attachmentContentDisposition(filename: string): string {
  return `attachment; filename="${asciiSafeFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
