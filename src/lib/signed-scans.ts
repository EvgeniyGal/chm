import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";

export type SignedScanListItem = {
  id: string;
  originalFilename: string | null;
  contentType: string;
  createdAt: string;
};

export async function getSignedScansForEntity(
  entityType: "CONTRACT" | "INVOICE" | "ACCEPTANCE_ACT",
  entityId: string,
): Promise<SignedScanListItem[]> {
  const rows = await db
    .select({
      id: documents.id,
      originalFilename: documents.originalFilename,
      contentType: documents.contentType,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.entityType, entityType),
        eq(documents.entityId, entityId),
        eq(documents.kind, "SIGNED_SCAN"),
      ),
    )
    .orderBy(asc(documents.createdAt));

  return rows.map((r) => ({
    id: r.id,
    originalFilename: r.originalFilename,
    contentType: r.contentType,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));
}
