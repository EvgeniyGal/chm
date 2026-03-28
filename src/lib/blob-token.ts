/** Vercel Blob read/write token (SDK default name + legacy alias). */
export function blobReadWriteToken(): string | undefined {
  const a = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (a) return a;
  return process.env.VERCEL_BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}
