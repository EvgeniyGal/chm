import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { DocumentType } from "@/db/schema";
import { formatDocNumber } from "@/db/schema";

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

