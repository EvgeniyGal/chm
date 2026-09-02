import { and, eq, like, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  acceptanceActs,
  canInheritFromContractNumber,
  contracts,
  documentSequence,
  firstFreeSuffixNumber,
  formatDocNumber,
  invoices,
  parseDocNumber,
  rewriteAutoNumberForDate,
} from "@/db/schema";

export {
  canInheritFromContractNumber,
  firstFreeSuffixNumber,
  formatDocNumber,
  parseDocNumber,
  rewriteAutoNumberForDate,
};

type Executor = {
  execute: typeof db.execute;
  select: typeof db.select;
  query: typeof db.query;
  update: typeof db.update;
};

function utcYearMonth(at: Date) {
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1 };
}

async function incrementSequenceOn(tx: Pick<Executor, "execute">, at: Date) {
  const { year, month } = utcYearMonth(at);
  await tx.execute(
    sql`insert into document_sequence (id, value)
        values (1, 0)
        on conflict (id) do nothing`,
  );
  const updated = await tx.execute<{ value: number }>(
    sql`update document_sequence
        set value = value + 1, updated_at = now()
        where id = 1
        returning value`,
  );
  const seq = Number(updated.rows[0]?.value ?? 0);
  return formatDocNumber({ seq, year, month });
}

async function takenInvoiceNumbers(
  client: Pick<Executor, "select">,
  opts: { seq: number; year: number; month: number; excludeInvoiceId?: string },
) {
  const base = formatDocNumber({ seq: opts.seq, year: opts.year, month: opts.month });
  const filter = opts.excludeInvoiceId
    ? and(or(eq(invoices.number, base), like(invoices.number, `${base}/%`)), ne(invoices.id, opts.excludeInvoiceId))
    : or(eq(invoices.number, base), like(invoices.number, `${base}/%`));
  const rows = await client.select({ number: invoices.number }).from(invoices).where(filter);
  return new Set(rows.map((r) => r.number));
}

async function linkedInvoiceNumber(
  client: Pick<Executor, "select">,
  opts: { contractNumber: string; at: Date; excludeInvoiceId?: string },
) {
  const parsed = parseDocNumber(opts.contractNumber);
  if (!parsed || parsed.suffix !== 1) return null;
  const { year, month } = utcYearMonth(opts.at);
  const taken = await takenInvoiceNumbers(client, {
    seq: parsed.seq,
    year,
    month,
    excludeInvoiceId: opts.excludeInvoiceId,
  });
  return firstFreeSuffixNumber({ seq: parsed.seq, year, month, taken });
}

/** Next global sequence number without incrementing (UI preview). */
export async function peekNextSequenceNumber(at: Date) {
  const { year, month } = utcYearMonth(at);
  const [row] = await db
    .select({ value: documentSequence.value })
    .from(documentSequence)
    .where(eq(documentSequence.id, 1))
    .limit(1);
  const current = row?.value ?? 0;
  return formatDocNumber({ seq: current + 1, year, month });
}

/** Atomically increment the shared sequence and format `{seq}/{MM}-{YYYY}`. */
export async function allocateSequenceNumber(at: Date) {
  return await db.transaction(async (tx) => incrementSequenceOn(tx, at));
}

/** Preview helper used by treaty (and other) create forms. */
export async function peekNextDocumentNumber(opts: { at: Date; documentType?: string }) {
  return peekNextSequenceNumber(opts.at);
}

/** Allocate the next shared sequence number. */
export async function nextDocumentNumber(opts: { at: Date; documentType?: string }) {
  return allocateSequenceNumber(opts.at);
}

export async function peekInvoiceNumber(opts: {
  at: Date;
  contractId?: string | null;
}) {
  if (opts.contractId) {
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, opts.contractId),
    });
    if (contract && canInheritFromContractNumber(contract.number)) {
      const inherited = await linkedInvoiceNumber(db, {
        contractNumber: contract.number,
        at: opts.at,
      });
      if (inherited) return inherited;
    }
  }
  return peekNextSequenceNumber(opts.at);
}

export async function nextInvoiceNumberOn(
  tx: Pick<Executor, "execute" | "select" | "query">,
  opts: { at: Date; contractId?: string | null; excludeInvoiceId?: string },
) {
  if (!opts.contractId) {
    return incrementSequenceOn(tx, opts.at);
  }

  await tx.execute(sql`select id from contracts where id = ${opts.contractId} for update`);
  const contract = await tx.query.contracts.findFirst({
    where: eq(contracts.id, opts.contractId),
  });
  if (contract && canInheritFromContractNumber(contract.number)) {
    const inherited = await linkedInvoiceNumber(tx, {
      contractNumber: contract.number,
      at: opts.at,
      excludeInvoiceId: opts.excludeInvoiceId,
    });
    if (inherited) return inherited;
  }
  return incrementSequenceOn(tx, opts.at);
}

export async function nextInvoiceNumber(opts: {
  at: Date;
  contractId?: string | null;
  excludeInvoiceId?: string;
}) {
  return await db.transaction(async (tx) => nextInvoiceNumberOn(tx, opts));
}

export async function nextContractNumberOnDateChange(opts: {
  existingNumber: string;
  at: Date;
  excludeContractId: string;
}) {
  const rewritten = rewriteAutoNumberForDate(opts.existingNumber, opts.at);
  if (!rewritten) return null;
  const clash = await db.query.contracts.findFirst({
    where: and(eq(contracts.number, rewritten), ne(contracts.id, opts.excludeContractId)),
  });
  if (clash) return { error: "NUMBER_ALREADY_EXISTS" as const };
  return { number: rewritten };
}

export async function nextStandaloneInvoiceNumberOnDateChange(opts: {
  existingNumber: string;
  at: Date;
  excludeInvoiceId: string;
}) {
  const rewritten = rewriteAutoNumberForDate(opts.existingNumber, opts.at);
  if (!rewritten) return null;
  const clash = await db.query.invoices.findFirst({
    where: and(eq(invoices.number, rewritten), ne(invoices.id, opts.excludeInvoiceId)),
  });
  if (clash) return { error: "NUMBER_ALREADY_EXISTS" as const };
  return { number: rewritten };
}

/**
 * If an act exists for this invoice and still has the previous invoice number
 * (copied, not custom), update it to the new invoice number.
 */
export async function copyInvoiceNumberToActIfUnchanged(
  tx: Pick<Executor, "query" | "update">,
  opts: { invoiceId: string; previousNumber: string; nextNumber: string },
) {
  if (opts.previousNumber === opts.nextNumber) return;
  const act = await tx.query.acceptanceActs.findFirst({
    where: eq(acceptanceActs.invoiceId, opts.invoiceId),
  });
  if (!act || act.number !== opts.previousNumber) return;
  const clash = await tx.query.acceptanceActs.findFirst({
    where: and(eq(acceptanceActs.number, opts.nextNumber), ne(acceptanceActs.id, act.id)),
  });
  if (clash) return;
  await tx
    .update(acceptanceActs)
    .set({ number: opts.nextNumber, updatedAt: new Date() })
    .where(eq(acceptanceActs.id, act.id));
}
