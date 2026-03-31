import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte } from "drizzle-orm";

import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { db } from "@/db";
import { companies, invoices, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";

const pageSizeOptions = new Set([25, 50, 100]);
type SortBy = "number" | "date" | "workType" | "totalWithVat";
type SortDir = "asc" | "desc";

function getSortColumn(sortBy: SortBy, sortDir: SortDir) {
  const dir = sortDir === "asc" ? asc : desc;
  if (sortBy === "number") return dir(invoices.number);
  if (sortBy === "date") return dir(invoices.date);
  if (sortBy === "workType") return dir(invoices.workType);
  return dir(invoices.totalWithVat);
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

function originFromRow(r: { contractId: string | null; isExternalContract: boolean }): "standalone" | "contract" | "external" {
  if (r.isExternalContract) return "external";
  if (r.contractId) return "contract";
  return "standalone";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role } = await requireRole("MANAGER");
  const canGenerateAnalogue = role === "ADMIN" || role === "OWNER";
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

  const originRaw = String(sp.origin ?? "");
  const originFilter =
    originRaw === "standalone" || originRaw === "contract" || originRaw === "external" ? originRaw : null;

  const dateFromRaw = parseIsoDateOnly(String(sp.dateFrom ?? ""));
  const dateToRaw = parseIsoDateOnly(String(sp.dateTo ?? ""));
  const dateRangeInvalid = Boolean(dateFromRaw && dateToRaw && dateFromRaw > dateToRaw);

  const searchWhere = q ? ilike(invoices.number, `%${q}%`) : undefined;

  const filterParts = [];
  if (searchWhere) filterParts.push(searchWhere);
  if (workTypeFilter) filterParts.push(eq(invoices.workType, workTypeFilter));
  if (originFilter === "standalone") {
    filterParts.push(and(isNull(invoices.contractId), eq(invoices.isExternalContract, false)));
  } else if (originFilter === "contract") {
    filterParts.push(isNotNull(invoices.contractId));
  } else if (originFilter === "external") {
    filterParts.push(eq(invoices.isExternalContract, true));
  }
  if (!dateRangeInvalid && dateFromRaw) filterParts.push(gte(invoices.date, utcDayStart(dateFromRaw)));
  if (!dateRangeInvalid && dateToRaw) filterParts.push(lte(invoices.date, utcDayEnd(dateToRaw)));

  const where =
    filterParts.length === 0 ? undefined : filterParts.length === 1 ? filterParts[0]! : and(...filterParts);

  const [{ dbTotal }] = await db.select({ dbTotal: count() }).from(invoices);
  const [{ total }] = await db.select({ total: count() }).from(invoices).where(where);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(getSortColumn(sortBy, sortDir), desc(invoices.createdAt))
    .limit(pageSize)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const lineItemTitlesByInvoice = new Map<string, string[]>();
  const companyNameById = new Map<string, string>();
  if (ids.length > 0) {
    const liRows = await db
      .select({ invoiceId: lineItems.invoiceId, title: lineItems.title })
      .from(lineItems)
      .where(inArray(lineItems.invoiceId, ids))
      .orderBy(asc(lineItems.invoiceId), asc(lineItems.id));

    for (const row of liRows) {
      if (!row.invoiceId) continue;
      const list = lineItemTitlesByInvoice.get(row.invoiceId) ?? [];
      list.push(row.title);
      lineItemTitlesByInvoice.set(row.invoiceId, list);
    }

    const companyIds = Array.from(
      new Set(rows.flatMap((r) => [r.customerCompanyId, r.contractorCompanyId]).filter((id): id is string => Boolean(id))),
    );
    if (companyIds.length > 0) {
      const companyRows = await db
        .select({ id: companies.id, shortName: companies.shortName, fullName: companies.fullName })
        .from(companies)
        .where(inArray(companies.id, companyIds));
      for (const company of companyRows) {
        companyNameById.set(company.id, company.shortName || company.fullName || "—");
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="page-title">Рахунки</h1>
        <a className="crm-btn-primary" href="/invoices/new">
          Додати рахунок
        </a>
      </div>

      <InvoicesTable
        total={Number(total)}
        page={page}
        pageSize={pageSize}
        q={q}
        sortBy={sortBy}
        sortDir={sortDir}
        isDatabaseEmpty={Number(dbTotal) === 0}
        filterWorkType={workTypeFilter}
        filterOrigin={originFilter}
        filterDateFrom={dateFromRaw}
        filterDateTo={dateToRaw}
        dateRangeInvalid={dateRangeInvalid}
        canGenerateAnalogue={canGenerateAnalogue}
        rows={rows.map((inv) => ({
          id: inv.id,
          number: inv.number,
          date: inv.date instanceof Date ? inv.date.toISOString() : String(inv.date),
          workType: inv.workType,
          origin: originFromRow({
            contractId: inv.contractId,
            isExternalContract: Boolean(inv.isExternalContract),
          }),
          lineItemsPreview: formatLineItemsPreview(lineItemTitlesByInvoice.get(inv.id) ?? []),
          customerCompany: companyNameById.get(inv.customerCompanyId) ?? "—",
          contractorCompany: companyNameById.get(inv.contractorCompanyId) ?? "—",
          totalWithoutVat: String(inv.totalWithoutVat),
          vat20: String(inv.vat20),
          totalWithVat: String(inv.totalWithVat),
        }))}
      />
    </div>
  );
}
