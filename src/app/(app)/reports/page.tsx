import { and, eq, gte, lte, sql } from "drizzle-orm";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/db";
import { acceptanceActs, companies, contracts, documents, invoices } from "@/db/schema";
import { requireRole } from "@/lib/authz";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ReportStats = {
  totalCount: number;
  signedCount: number;
  archivedCount: number;
  totalAmount: number;
  signedAmount: number;
};

type ContractorOption = {
  id: string;
  label: string;
};

const monthLabelFmt = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric", timeZone: "UTC" });
const monthNameFmt = new Intl.DateTimeFormat("uk-UA", { month: "long", timeZone: "UTC" });
const amountFmt = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseMonth(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  const [yearStr, monthStr] = s.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return `${yearStr}-${monthStr}`;
}

function parseMonthNumber(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const month = Number(s);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return month;
}

function parseYear(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{4}$/.test(s)) return null;
  const year = Number(s);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return year;
}

function currentMonthUtc(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthBoundsUtc(yyyyMm: string): { start: Date; end: Date; monthDate: Date } {
  const [yearStr, monthStr] = yyyyMm.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59, 999));
  return { start, end, monthDate: start };
}

function yearBoundsUtc(year: number): { start: Date; end: Date; yearDate: Date } {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { start, end, yearDate: start };
}

function splitMonth(yyyyMm: string): { year: number; month: number } {
  const [yearStr, monthStr] = yyyyMm.split("-");
  return { year: Number(yearStr), month: Number(monthStr) };
}

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(v: number): string {
  return `${amountFmt.format(v)} грн`;
}

function monthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  for (let month = 1; month <= 12; month += 1) {
    const d = new Date(Date.UTC(2000, month - 1, 1, 0, 0, 0, 0));
    options.push({
      value: String(month),
      label: monthNameFmt.format(d).replace(/^./, (ch) => ch.toUpperCase()),
    });
  }
  return options;
}

function yearOptions(selectedYear: number): Array<{ value: string; label: string }> {
  const currentYear = new Date().getUTCFullYear();
  const startYear = Math.min(selectedYear, currentYear - 5);
  const endYear = Math.max(selectedYear, currentYear);
  const options: Array<{ value: string; label: string }> = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
}

async function loadActsStats(start: Date, end: Date, contractorId: string | null): Promise<ReportStats> {
  const whereParts = [gte(acceptanceActs.date, start), lte(acceptanceActs.date, end)];
  if (contractorId) whereParts.push(eq(acceptanceActs.contractorCompanyId, contractorId));
  const rows = await db
    .select({
      totalCount: sql<number>`count(*)`,
      signedCount: sql<number>`count(*) filter (where ${acceptanceActs.isSigned} = true)`,
      archivedCount: sql<number>`count(*) filter (where ${acceptanceActs.isArchived} = true)`,
      totalAmount: sql<string>`coalesce(sum(${acceptanceActs.totalWithVat}), 0)`,
      signedAmount: sql<string>`coalesce(sum(${acceptanceActs.totalWithVat}) filter (where ${acceptanceActs.isSigned} = true), 0)`,
    })
    .from(acceptanceActs)
    .where(and(...whereParts));
  const row = rows[0];
  return {
    totalCount: num(row?.totalCount),
    signedCount: num(row?.signedCount),
    archivedCount: num(row?.archivedCount),
    totalAmount: num(row?.totalAmount),
    signedAmount: num(row?.signedAmount),
  };
}

async function loadContractsStats(start: Date, end: Date, contractorId: string | null): Promise<ReportStats> {
  const whereParts = [gte(contracts.date, start), lte(contracts.date, end)];
  if (contractorId) whereParts.push(eq(contracts.contractorCompanyId, contractorId));
  const rows = await db
    .select({
      totalCount: sql<number>`count(*)`,
      signedCount: sql<number>`count(*) filter (where ${contracts.isSigned} = true)`,
      archivedCount: sql<number>`count(*) filter (where ${contracts.isArchived} = true)`,
      totalAmount: sql<string>`coalesce(sum(${contracts.totalWithVat}), 0)`,
    })
    .from(contracts)
    .where(and(...whereParts));
  const row = rows[0];
  return {
    totalCount: num(row?.totalCount),
    signedCount: num(row?.signedCount),
    archivedCount: num(row?.archivedCount),
    totalAmount: num(row?.totalAmount),
    signedAmount: 0,
  };
}

async function loadInvoicesStats(start: Date, end: Date, contractorId: string | null): Promise<ReportStats> {
  const whereParts = [gte(invoices.date, start), lte(invoices.date, end)];
  if (contractorId) whereParts.push(eq(invoices.contractorCompanyId, contractorId));
  const rows = await db
    .select({
      totalCount: sql<number>`count(*)`,
      signedCount: sql<number>`count(*) filter (where exists (
        select 1
        from ${documents}
        where ${documents.entityType} = 'INVOICE'
          and ${documents.kind} = 'SIGNED_SCAN'
          and ${documents.entityId} = ${invoices.id}
      ))`,
      totalAmount: sql<string>`coalesce(sum(${invoices.totalWithVat}), 0)`,
    })
    .from(invoices)
    .where(and(...whereParts));
  const row = rows[0];
  const signedCount = num(row?.signedCount);
  return {
    totalCount: num(row?.totalCount),
    signedCount,
    archivedCount: 0,
    totalAmount: num(row?.totalAmount),
    signedAmount: 0,
  };
}

async function loadContractorOptions(): Promise<ContractorOption[]> {
  const rows = await db
    .select({ id: companies.id, shortName: companies.shortName, fullName: companies.fullName })
    .from(companies)
    .orderBy(sql`lower(${companies.shortName})`, sql`lower(${companies.fullName})`);

  return rows.map((r) => ({
    id: r.id,
    label: r.shortName || r.fullName || "—",
  }));
}

function StatsCard({ title, description, stats }: { title: string; description: string; stats: ReportStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Кількість</dt>
          <dd className="text-right font-medium">{stats.totalCount}</dd>

          <dt className="text-muted-foreground">Підписано</dt>
          <dd className="text-right font-medium">{stats.signedCount}</dd>

          <dt className="text-muted-foreground">В архіві</dt>
          <dd className="text-right font-medium">{stats.archivedCount}</dd>

          <dt className="text-muted-foreground">Сума (з ПДВ)</dt>
          <dd className="text-right font-semibold">{formatAmount(stats.totalAmount)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const rawMonth = String(sp.month ?? "").trim();
  const legacyMonthParam = parseMonth(rawMonth);
  const currentMonth = splitMonth(currentMonthUtc());
  const selectedYear = legacyMonthParam
    ? splitMonth(legacyMonthParam).year
    : parseYear(String(sp.year ?? "")) ?? currentMonth.year;
  const selectedMonth = legacyMonthParam
    ? splitMonth(legacyMonthParam).month
    : parseMonthNumber(rawMonth);
  const contractorParamRaw = String(sp.contractorId ?? "").trim();
  const monthParam = selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}` : null;
  const period = monthParam ? monthBoundsUtc(monthParam) : yearBoundsUtc(selectedYear);
  const periodTitle = "monthDate" in period ? monthLabelFmt.format(period.monthDate).replace(/^./, (ch) => ch.toUpperCase()) : `${selectedYear} рік`;
  const { start, end } = period;
  const contractorOptions = await loadContractorOptions();
  const contractorIds = new Set(contractorOptions.map((c) => c.id));
  const contractorId = contractorIds.has(contractorParamRaw) ? contractorParamRaw : null;
  const selectedContractor = contractorId ? contractorOptions.find((c) => c.id === contractorId) : null;

  const [actsStats, contractsStats, invoicesStats] = await Promise.all([
    loadActsStats(start, end, contractorId),
    loadContractsStats(start, end, contractorId),
    loadInvoicesStats(start, end, contractorId),
  ]);

  const totalAmount = actsStats.signedAmount;
  const totalCount = actsStats.totalCount + contractsStats.totalCount + invoicesStats.totalCount;
  const totalSigned = actsStats.signedCount + contractsStats.signedCount + invoicesStats.signedCount;
  const totalArchived = actsStats.archivedCount + contractsStats.archivedCount + invoicesStats.archivedCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Звіти</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Статистика за актами, рахунками та договорами
            {selectedContractor ? ` для підрядника: ${selectedContractor.label}.` : "."}
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground" htmlFor="month">
              Місяць
            </label>
            <NativeSelect id="month" name="month" defaultValue={selectedMonth ? String(selectedMonth) : ""} className="h-10 min-w-[180px]">
              <option value="">Увесь рік</option>
              {monthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground" htmlFor="year">
              Рік
            </label>
            <NativeSelect id="year" name="year" defaultValue={String(selectedYear)} className="h-10 min-w-[120px]">
              {yearOptions(selectedYear).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground" htmlFor="contractorId">
              Підрядник
            </label>
            <NativeSelect id="contractorId" name="contractorId" defaultValue={contractorId ?? ""} className="h-10 min-w-[260px]">
              <option value="">Усі підрядники</option>
              {contractorOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <button className="crm-btn-primary" type="submit">
            Показати
          </button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {`Разом за ${periodTitle}`}
          </CardTitle>
          <CardDescription>
            {monthParam
              ? "Підсумок по всіх типах документів за вибраний місяць."
              : "Підсумок по всіх типах документів за вибраний рік."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <dt className="text-muted-foreground">Кількість документів</dt>
              <dd className="mt-1 text-xl font-semibold">{totalCount}</dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <dt className="text-muted-foreground">Підписано</dt>
              <dd className="mt-1 text-xl font-semibold">{totalSigned}</dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <dt className="text-muted-foreground">В архіві</dt>
              <dd className="mt-1 text-xl font-semibold">{totalArchived}</dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <dt className="text-muted-foreground">Сума підписаних актів (з ПДВ)</dt>
              <dd className="mt-1 text-xl font-semibold">{formatAmount(totalAmount)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatsCard title="Акти" description={monthParam ? "Показники актів за місяць." : "Показники актів за рік."} stats={actsStats} />
        <StatsCard title="Рахунки" description="Підписано: за наявністю завантаженого signed scan." stats={invoicesStats} />
        <StatsCard
          title="Договори"
          description={monthParam ? "Показники договорів за місяць." : "Показники договорів за рік."}
          stats={contractsStats}
        />
      </div>
    </div>
  );
}
