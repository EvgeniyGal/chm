import { eq } from "drizzle-orm";

import { db } from "@/db";
import { welderCertifications } from "@/db/schema/attestation";

/** Smallest positive integer not used as `order_in_group` in this group (reuses gaps after deletes). */
export async function allocateNextFreeOrderInGroup(groupId: string): Promise<number> {
  const rows = await db
    .select({ o: welderCertifications.orderInGroup })
    .from(welderCertifications)
    .where(eq(welderCertifications.groupId, groupId));
  const used = new Set(rows.map((r) => r.o));
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}
