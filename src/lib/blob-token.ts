/** Vercel Blob read/write token (SDK default name + legacy alias). */
export function blobReadWriteToken(): string | undefined {
  const a = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (a) return a;
  return process.env.VERCEL_BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

/**
 * `put()` stores `pathname` in our DB; `get()` accepts pathname, but `del()` must receive the full
 * HTTPS blob URL for the delete API. Mirrors @vercel/blob internal `constructBlobUrl` + store id from token.
 */
export function vercelPrivateBlobUrlFromStorageKey(pathnameOrUrl: string, token: string): string {
  const key = pathnameOrUrl.trim();
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const parts = token.split("_");
  const storeId = parts[3];
  if (!storeId) {
    throw new Error("Invalid blob token: could not parse store id");
  }
  const path = key.replace(/^\/+/, "");
  return `https://${storeId}.private.blob.vercel-storage.com/${path}`;
}
