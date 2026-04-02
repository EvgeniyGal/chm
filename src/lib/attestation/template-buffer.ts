import { get } from "@vercel/blob";

import { blobReadWriteToken } from "@/lib/blob-token";

/**
 * Reads attestation template bytes from Vercel Blob only (`storage_key` is the blob pathname from `put()`).
 */
export async function readTemplateBuffer(storageKey: string): Promise<Buffer> {
  const trimmed = storageKey.trim();
  const token = blobReadWriteToken();
  if (!token) {
    throw new Error("TEMPLATE_BLOB_TOKEN_MISSING");
  }

  const result = await get(trimmed, { access: "private", token });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("TEMPLATE_BLOB_UNAVAILABLE");
  }
  const chunks: Buffer[] = [];
  const reader = result.stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
