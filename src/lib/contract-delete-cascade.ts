import { BlobNotFoundError, del } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { acceptanceActs, contracts, documents, invoices } from "@/db/schema";
import { blobReadWriteToken, vercelPrivateBlobUrlFromStorageKey } from "@/lib/blob-token";

async function deleteBlobRows(rows: { id: string; storageKey: string }[]): Promise<void> {
  const token = blobReadWriteToken();
  if (!token) {
    console.warn("[contract-delete-cascade] BLOB_READ_WRITE_TOKEN missing; skipping blob deletion");
    return;
  }
  for (const row of rows) {
    let blobUrl: string;
    try {
      blobUrl = vercelPrivateBlobUrlFromStorageKey(row.storageKey, token);
    } catch (e) {
      console.error("[contract-delete-cascade] invalid blob token", e);
      continue;
    }
    try {
      await del(blobUrl, { token });
    } catch (e) {
      if (e instanceof BlobNotFoundError) continue;
      console.error("[contract-delete-cascade] blob del failed", row.id, e);
    }
  }
}

/**
 * Deletes a contract and all invoices / acceptance acts linked to it, plus `documents` rows
 * (signed scans in Vercel Blob). Generated .docx files are not stored — they are produced on demand.
 */
export async function deleteContractAndRelatedRecords(contractId: string): Promise<void> {
  const invoiceRows = await db.query.invoices.findMany({
    where: eq(invoices.contractId, contractId),
  });
  const invoiceIds = invoiceRows.map((r) => r.id);

  const actRows =
    invoiceIds.length > 0
      ? await db.query.acceptanceActs.findMany({
          where: inArray(acceptanceActs.invoiceId, invoiceIds),
        })
      : [];
  const actIds = actRows.map((a) => a.id);

  const contractDocs = await db.query.documents.findMany({
    where: and(eq(documents.entityType, "CONTRACT"), eq(documents.entityId, contractId)),
  });
  const invoiceDocs =
    invoiceIds.length > 0
      ? await db.query.documents.findMany({
          where: and(eq(documents.entityType, "INVOICE"), inArray(documents.entityId, invoiceIds)),
        })
      : [];
  const actDocs =
    actIds.length > 0
      ? await db.query.documents.findMany({
          where: and(eq(documents.entityType, "ACCEPTANCE_ACT"), inArray(documents.entityId, actIds)),
        })
      : [];

  const seen = new Set<string>();
  const allDocs = [...contractDocs, ...invoiceDocs, ...actDocs].filter((d) => {
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
    if (invoiceIds.length > 0) {
      await tx.delete(invoices).where(inArray(invoices.id, invoiceIds));
    }
    await tx.delete(contracts).where(eq(contracts.id, contractId));
  });
}
