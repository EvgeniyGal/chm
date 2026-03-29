import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";

import { AcceptanceActsTable } from "@/components/acceptance-acts/AcceptanceActsTable";
import { db } from "@/db";
import { acceptanceActs, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";

const pageSizeOptions = new Set([25, 50, 100]);
type SortBy = "number" | "date" | "workType" | "totalWithVat";
type SortDir = "asc" | "desc";

function getSortColumn(sortBy: SortBy, sortDir: SortDir) {
  const dir = sortDir === "asc" ? asc : desc;
  if (sortBy === "number") return dir(acceptanceActs.number);
  if (sortBy === "date") return dir(acceptanceActs.date);
  if (sortBy === "workType") return dir(invoices.workType);
  return dir(acceptanceActs.totalWithVat);
}

function parseIsoDateOnly(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === s ? s : null;
}

function utcDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function utcDayEnd(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

function formatLineItemsPreview(titles: string[]): string {
  if (titles.length === 0) return "—";
  const maxShow = 3;
  const slice = titles.slice(0, maxShow);
  const joined = slice.join(" · ");
  if (titles.length > maxShow) return `${joined}… (+${titles.length - maxShow})`;
  return joined;
}

export default async function AcceptanceActsPage({
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
    sortByRaw === "number" || sortByRaw === "date" || sortByRaw === "workType" || sortByRaw === "totalWithVat"
      ? sortByRaw
      : "date";
  const sortDir: SortDir = sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : "desc";
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = pageSizeOptions.has(pageSizeRaw) ? pageSizeRaw : 25;

  const workTypeRaw = String(sp.workType ?? "");
  const workTypeFilter = workTypeRaw === "WORKS" || workTypeRaw === "SERVICES" ? workTypeRaw : null;

  const hasContractRaw = String(sp.hasContract ?? "");
  const hasContractFilter = hasContractRaw === "yes" || hasContractRaw === "no" ? hasContractRaw : null;

  const dateFromRaw = parseIsoDateOnly(String(sp.dateFrom ?? ""));
  const dateToRaw = parseIsoDateOnly(String(sp.dateTo ?? ""));
  const dateRangeInvalid = Boolean(dateFromRaw && dateToRaw && dateFromRaw > dateToRaw);

  const searchWhere = q
    ? or(
        ilike(acceptanceActs.number, `%${q}%`),
        ilike(acceptanceActs.signingLocation, `%${q}%`),
        ilike(invoices.number, `%${q}%`),
      )
    : undefined;

  const filterParts = [];
  if (searchWhere) filterParts.push(searchWhere);
  if (workTypeFilter) filterParts.push(eq(invoices.workType, workTypeFilter));
  if (hasContractFilter === "yes") filterParts.push(isNotNull(acceptanceActs.contractId));
  if (hasContractFilter === "no") filterParts.push(isNull(acceptanceActs.contractId));
  if (!dateRangeInvalid && dateFromRaw) filterParts.push(gte(acceptanceActs.date, utcDayStart(dateFromRaw)));
  if (!dateRangeInvalid && dateToRaw) filterParts.push(lte(acceptanceActs.date, utcDayEnd(dateToRaw)));

  const where =
    filterParts.length === 0 ? undefined : filterParts.length === 1 ? filterParts[0]! : and(...filterParts);

  const [{ dbTotal }] = await db.select({ dbTotal: count() }).from(acceptanceActs);

  const countJoined = db
    .select({ total: count() })
    .from(acceptanceActs)
    .innerJoin(invoices, eq(acceptanceActs.invoiceId, invoices.id));
  const [{ total }] = await (where ? countJoined.where(where) : countJoined);

  const offset = (page - 1) * pageSize;

  const listBase = db
    .select({
      id: acceptanceActs.id,
      number: acceptanceActs.number,
      date: acceptanceActs.date,
      signingLocation: acceptanceActs.signingLocation,
      contractId: acceptanceActs.contractId,
      totalWithoutVat: acceptanceActs.totalWithoutVat,
      vat20: acceptanceActs.vat20,
      totalWithVat: acceptanceActs.totalWithVat,
      invoiceNumber: invoices.number,
      workType: invoices.workType,
    })
    .from(acceptanceActs)
    .innerJoin(invoices, eq(acceptanceActs.invoiceId, invoices.id));

  const listFiltered = where ? listBase.where(where) : listBase;

  const rows = await listFiltered
    .orderBy(getSortColumn(sortBy, sortDir), desc(acceptanceActs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const lineItemTitlesByAct = new Map<string, string[]>();
  if (ids.length > 0) {
    const liRows = await db
      .select({ acceptanceActId: lineItems.acceptanceActId, title: lineItems.title })
      .from(lineItems)
      .where(inArray(lineItems.acceptanceActId, ids))
      .orderBy(asc(lineItems.acceptanceActId), asc(lineItems.id));

    for (const row of liRows) {
      if (!row.acceptanceActId) continue;
      const list = lineItemTitlesByAct.get(row.acceptanceActId) ?? [];
      list.push(row.title);
      lineItemTitlesByAct.set(row.acceptanceActId, list);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Акти</h1>
          <p className="text-sm text-muted-foreground">
            Акти приймання-передачі на основі рахунків. Пошук, фільтри та пагінація — як у списках рахунків і договорів.
          </p>
        </div>
        <a className="crm-btn-primary" href="/acceptance-acts/new">
          Додати акт
        </a>
      </div>

      <AcceptanceActsTable
        total={Number(total)}
        page={page}
        pageSize={pageSize}
        q={q}
        sortBy={sortBy}
        sortDir={sortDir}
        isDatabaseEmpty={Number(dbTotal) === 0}
        filterWorkType={workTypeFilter}
        filterHasContract={hasContractFilter}
        filterDateFrom={dateFromRaw}
        filterDateTo={dateToRaw}
        dateRangeInvalid={dateRangeInvalid}
        rows={rows.map((r) => ({
          id: r.id,
          number: r.number,
          date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
          workType: r.workType,
          invoiceNumber: r.invoiceNumber,
          hasContract: r.contractId != null,
          signingLocation: r.signingLocation,
          lineItemsPreview: formatLineItemsPreview(lineItemTitlesByAct.get(r.id) ?? []),
          totalWithoutVat: String(r.totalWithoutVat),
          vat20: String(r.vat20),
          totalWithVat: String(r.totalWithVat),
        }))}
      />
    </div>
  );
}
