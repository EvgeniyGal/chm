import { BlobNotFoundError, del } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { acceptanceActs, documents, invoices } from "@/db/schema";
import { blobReadWriteToken, vercelPrivateBlobUrlFromStorageKey } from "@/lib/blob-token";

async function deleteBlobRows(rows: { id: string; storageKey: string }[]): Promise<void> {
  const token = blobReadWriteToken();
  if (!token) {
    console.warn("[invoice-delete-cascade] BLOB_READ_WRITE_TOKEN missing; skipping blob deletion");
    return;
  }

  for (const row of rows) {
    let blobUrl: string;
    try {
      blobUrl = vercelPrivateBlobUrlFromStorageKey(row.storageKey, token);
    } catch (e) {
      console.error("[invoice-delete-cascade] invalid blob token", e);
      continue;
    }

    try {
      await del(blobUrl, { token });
    } catch (e) {
      if (e instanceof BlobNotFoundError) continue;
      console.error("[invoice-delete-cascade] blob del failed", row.id, e);
    }
  }
}

/**
 * Deletes invoice and all related resources:
 * - acceptance act created from this invoice (if exists)
 * - signed scan documents for invoice and acceptance act
 * - blobs in Vercel Blob for those documents
 *
 * Generated .docx files are not stored and are not part of deletion.
 */
export async function deleteInvoiceAndRelatedRecords(invoiceId: string): Promise<void> {
  const actRows = await db.query.acceptanceActs.findMany({
    where: eq(acceptanceActs.invoiceId, invoiceId),
    columns: { id: true },
  });
  const actIds = actRows.map((a) => a.id);

  const invoiceDocs = await db.query.documents.findMany({
    where: and(eq(documents.entityType, "INVOICE"), eq(documents.entityId, invoiceId)),
  });
  const actDocs =
    actIds.length > 0
      ? await db.query.documents.findMany({
          where: and(eq(documents.entityType, "ACCEPTANCE_ACT"), inArray(documents.entityId, actIds)),
        })
      : [];

  const seen = new Set<string>();
  const allDocs = [...invoiceDocs, ...actDocs].filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  await deleteBlobRows(allDocs.map((d) => ({ id: d.id, storageKey: d.storageKey })));

  const docIds = allDocs.map((d) => d.id);

  await db.transaction(async (tx) => {
    if (docIds.length > 0) {
      await tx.delete(documents).where(inArray(documents.id, docIds));
    }
    if (actIds.length > 0) {
      await tx.delete(acceptanceActs).where(inArray(acceptanceActs.id, actIds));
    }
    await tx.delete(invoices).where(eq(invoices.id, invoiceId));
  });
}

