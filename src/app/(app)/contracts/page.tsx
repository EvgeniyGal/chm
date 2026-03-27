import { asc, count, desc, ilike, inArray, or } from "drizzle-orm";

import { ContractsTable } from "@/components/contracts/ContractsTable";
import { db } from "@/db";
import { contracts, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";

const pageSizeOptions = new Set([25, 50, 100]);
type SortBy = "number" | "date" | "workType" | "totalWithVat";
type SortDir = "asc" | "desc";

function getSortColumn(sortBy: SortBy, sortDir: SortDir) {
  const dir = sortDir === "asc" ? asc : desc;
  if (sortBy === "number") return dir(contracts.number);
  if (sortBy === "date") return dir(contracts.date);
  if (sortBy === "workType") return dir(contracts.workType);
  return dir(contracts.totalWithVat);
}

function formatLineItemsPreview(titles: string[]): string {
  if (titles.length === 0) return "—";
  const maxShow = 3;
  const slice = titles.slice(0, maxShow);
  const joined = slice.join(" · ");
  if (titles.length > maxShow) return `${joined}… (+${titles.length - maxShow})`;
  return joined;
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const sortByRaw = String(sp.sortBy ?? "date");
  const sortDirRaw = String(sp.sortDir ?? "desc");
  const pageRaw = Number(String(sp.page ?? "1"));
  const pageSizeRaw = Number(String(sp.pageSize ?? "25"));

  const sortBy: SortBy =
    sortByRaw === "number" ||
    sortByRaw === "date" ||
    sortByRaw === "workType" ||
    sortByRaw === "totalWithVat"
      ? sortByRaw
      : "date";
  const sortDir: SortDir = sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : "desc";
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = pageSizeOptions.has(pageSizeRaw) ? pageSizeRaw : 25;

  const where = q
    ? or(ilike(contracts.number, `%${q}%`), ilike(contracts.signingLocation, `%${q}%`))
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(contracts).where(where);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(contracts)
    .where(where)
    .orderBy(getSortColumn(sortBy, sortDir), desc(contracts.createdAt))
    .limit(pageSize)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const lineItemTitlesByContract = new Map<string, string[]>();
  if (ids.length > 0) {
    const liRows = await db
      .select({ contractId: lineItems.contractId, title: lineItems.title })
      .from(lineItems)
      .where(inArray(lineItems.contractId, ids))
      .orderBy(asc(lineItems.contractId), asc(lineItems.id));

    for (const row of liRows) {
      if (!row.contractId) continue;
      const list = lineItemTitlesByContract.get(row.contractId) ?? [];
      list.push(row.title);
      lineItemTitlesByContract.set(row.contractId, list);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="page-title">Договори</h1>
        <a
          className="crm-btn-primary"
          href="/contracts/new"
        >
          Додати договір
        </a>
      </div>

      <ContractsTable
        total={Number(total)}
        page={page}
        pageSize={pageSize}
        q={q}
        sortBy={sortBy}
        sortDir={sortDir}
        rows={rows.map((c) => ({
          id: c.id,
          number: c.number,
          date: c.date instanceof Date ? c.date.toISOString() : String(c.date),
          signingLocation: c.signingLocation,
          workType: c.workType,
          lineItemsPreview: formatLineItemsPreview(lineItemTitlesByContract.get(c.id) ?? []),
          totalWithoutVat: String(c.totalWithoutVat),
          vat20: String(c.vat20),
          totalWithVat: String(c.totalWithVat),
        }))}
      />
    </div>
  );
}
