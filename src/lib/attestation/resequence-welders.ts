import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { welderCertifications } from "@/db/schema/attestation";

/** After delete (or manual fix), renumber `order_in_group` to 1..n within the group. */
export async function resequenceWelderOrdersInGroup(groupId: string): Promise<void> {
  const rest = await db
    .select()
    .from(welderCertifications)
    .where(eq(welderCertifications.groupId, groupId))
    .orderBy(asc(welderCertifications.orderInGroup));

  const now = new Date();
  for (let i = 0; i < rest.length; i++) {
    const row = rest[i]!;
    const next = i + 1;
    if (row.orderInGroup !== next) {
      await db
        .update(welderCertifications)
        .set({ orderInGroup: next, updatedAt: now })
        .where(eq(welderCertifications.id, row.id));
    }
  }
}
