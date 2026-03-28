import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import type { DocumentType } from "@/db/schema";
import { formatDocNumber, monthlyCounters } from "@/db/schema";

/** Next number for a month without incrementing the counter (for UI preview). */
export async function peekNextDocumentNumber(opts: { documentType: DocumentType; at: Date }) {
  const year = opts.at.getUTCFullYear();
  const month = opts.at.getUTCMonth() + 1;

  const [row] = await db
    .select({ value: monthlyCounters.value })
    .from(monthlyCounters)
    .where(
      and(
        eq(monthlyCounters.documentType, opts.documentType),
        eq(monthlyCounters.year, year),
        eq(monthlyCounters.month, month),
      ),
    )
    .limit(1);

  const current = row?.value ?? 0;
  return formatDocNumber({ seq: current + 1, year, month });
}

export async function nextDocumentNumber(opts: { documentType: DocumentType; at: Date }) {
  const year = opts.at.getUTCFullYear();
  const month = opts.at.getUTCMonth() + 1; // 1-12

  return await db.transaction(async (tx) => {
    // Ensure row exists (no lock needed).
    await tx.execute(
      sql`insert into monthly_counters (document_type, year, month, value)
          values (${opts.documentType}, ${year}, ${month}, 0)
          on conflict (document_type, year, month) do nothing`,
    );

    const updated = await tx.execute<{ value: number }>(
      sql`update monthly_counters
          set value = value + 1, updated_at = now()
          where document_type = ${opts.documentType} and year = ${year} and month = ${month}
          returning value`,
    );

    const seq = Number(updated.rows[0]?.value ?? 0);
    return formatDocNumber({ seq, year, month });
  });
}

