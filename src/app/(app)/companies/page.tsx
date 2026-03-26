import { and, asc, count, desc, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { requireRole } from "@/lib/authz";

const pageSizeOptions = new Set([25, 50, 100]);
type SortBy = "shortName" | "edrpouCode" | "address" | "createdAt";
type SortDir = "asc" | "desc";

function getSortColumn(sortBy: SortBy, sortDir: SortDir) {
  const dir = sortDir === "asc" ? asc : desc;
  if (sortBy === "shortName") return dir(companies.shortName);
  if (sortBy === "edrpouCode") return dir(companies.edrpouCode);
  if (sortBy === "address") return dir(companies.address);
  return dir(companies.createdAt);
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const sortByRaw = String(sp.sortBy ?? "createdAt");
  const sortDirRaw = String(sp.sortDir ?? "desc");
  const pageRaw = Number(String(sp.page ?? "1"));
  const pageSizeRaw = Number(String(sp.pageSize ?? "25"));

  const sortBy: SortBy =
    sortByRaw === "shortName" || sortByRaw === "edrpouCode" || sortByRaw === "address" || sortByRaw === "createdAt"
      ? sortByRaw
      : "createdAt";
  const sortDir: SortDir = sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : "desc";
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = pageSizeOptions.has(pageSizeRaw) ? pageSizeRaw : 25;

  const where = q
    ? or(
        ilike(companies.shortName, `%${q}%`),
        ilike(companies.edrpouCode, `%${q}%`),
        ilike(companies.address, `%${q}%`),
      )
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(companies).where(where);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(companies)
    .where(where)
    .orderBy(getSortColumn(sortBy, sortDir), desc(companies.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Компанії</h1>
        </div>
        <a
          className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          href="/companies/new"
        >
          Додати
        </a>
      </div>

      <CompaniesTable
        total={Number(total)}
        page={page}
        pageSize={pageSize}
        q={q}
        sortBy={sortBy}
        sortDir={sortDir}
        rows={rows.map((c) => ({
          id: c.id,
          shortName: c.shortName,
          edrpouCode: c.edrpouCode,
          address: c.address,
          fullName: c.fullName,
          vatIdTin: c.vatIdTin,
          iban: c.iban,
          bank: c.bank,
          contacts: c.contacts,
        }))}
      />
    </div>
  );
}

