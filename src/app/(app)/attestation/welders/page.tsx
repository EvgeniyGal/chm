import Link from "next/link";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, type SQL } from "drizzle-orm";

import { AttestationMigrationMissingNotice } from "@/components/attestation/AttestationMigrationMissingNotice";
import type { ShowFilter } from "@/components/attestation/AttestationGroupsTable";
import { AttestationWeldersTable, type WeldersSortBy } from "@/components/attestation/AttestationWeldersTable";
import { db } from "@/db";
import { certificationGroups, welderCertifications } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";
import { getPgErrorCode } from "@/lib/pg-error-code";

const NON_ARCHIVED_GROUP_STATUSES = ["draft", "active", "completed"] as const;

const pageSizeOptions = new Set([25, 50, 100]);
type SortDir = "asc" | "desc";

function parseIsoDateOnly(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === s ? s : null;
}

function buildWhere(args: {
  q: string;
  statusFilter: string | null;
  show: ShowFilter;
  protocolFrom: string | null;
  protocolTo: string | null;
  dateRangeInvalid: boolean;
}): SQL | undefined {
  const { q, statusFilter, show, protocolFrom, protocolTo, dateRangeInvalid } = args;
  const parts: SQL[] = [];

  const trimmed = q.trim();
  if (trimmed) {
    const like = `%${trimmed}%`;
    parts.push(
      or(
        ilike(welderCertifications.lastName, like),
        ilike(welderCertifications.firstName, like),
        ilike(welderCertifications.middleName, like),
        ilike(certificationGroups.groupNumber, like),
      )!,
    );
  }

  if (!dateRangeInvalid && protocolFrom) {
    parts.push(gte(certificationGroups.protocolDate, protocolFrom));
  }
  if (!dateRangeInvalid && protocolTo) {
    parts.push(lte(certificationGroups.protocolDate, protocolTo));
  }

  if (statusFilter === "draft" || statusFilter === "active" || statusFilter === "completed" || statusFilter === "archived") {
    parts.push(eq(certificationGroups.status, statusFilter));
  } else if (show === "active") {
    parts.push(inArray(certificationGroups.status, [...NON_ARCHIVED_GROUP_STATUSES]));
  } else if (show === "archived") {
    parts.push(eq(certificationGroups.status, "archived"));
  }

  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return and(...parts);
}

function orderByClause(sortBy: WeldersSortBy, sortDir: SortDir) {
  const dir = sortDir === "asc" ? asc : desc;
  const tieBreaker = desc(welderCertifications.createdAt);
  if (sortBy === "groupNumber") return [dir(certificationGroups.groupNumber), tieBreaker];
  if (sortBy === "orderInGroup") return [dir(welderCertifications.orderInGroup), tieBreaker];
  if (sortBy === "lastName") return [dir(welderCertifications.lastName), tieBreaker];
  if (sortBy === "createdAt") return [dir(welderCertifications.createdAt)];
  if (sortBy === "groupStatus") return [dir(certificationGroups.status), tieBreaker];
  return [dir(certificationGroups.protocolDate), tieBreaker];
}

export default async function AttestationWeldersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;

  const q = String(sp.q ?? "").trim();
  const pageRaw = Number(String(sp.page ?? "1"));
  const pageSizeRaw = Number(String(sp.pageSize ?? "25"));

  const sortByRaw = String(sp.sortBy ?? "protocolDate");
  const sortDirRaw = String(sp.sortDir ?? "desc");
  const sortBy: WeldersSortBy =
    sortByRaw === "groupNumber" ||
    sortByRaw === "protocolDate" ||
    sortByRaw === "orderInGroup" ||
    sortByRaw === "lastName" ||
    sortByRaw === "createdAt" ||
    sortByRaw === "groupStatus"
      ? sortByRaw
      : "protocolDate";
  const sortDir: SortDir = sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : "desc";

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = pageSizeOptions.has(pageSizeRaw) ? pageSizeRaw : 25;

  const statusRaw = String(sp.status ?? "").trim();
  const statusFilter =
    statusRaw === "draft" || statusRaw === "active" || statusRaw === "completed" || statusRaw === "archived"
      ? statusRaw
      : null;

  const showRaw = String(sp.show ?? "");
  const allParam = Array.isArray(sp.all) ? sp.all[0] : sp.all;
  const legacyAll = allParam === "1" || allParam === "true";
  const show: ShowFilter =
    legacyAll || showRaw === "all" ? "all" : showRaw === "archived" ? "archived" : "active";

  const protocolFromRaw = parseIsoDateOnly(String(sp.protocolFrom ?? ""));
  const protocolToRaw = parseIsoDateOnly(String(sp.protocolTo ?? ""));
  const dateRangeInvalid = Boolean(protocolFromRaw && protocolToRaw && protocolFromRaw > protocolToRaw);

  const where = buildWhere({
    q,
    statusFilter,
    show,
    protocolFrom: protocolFromRaw,
    protocolTo: protocolToRaw,
    dateRangeInvalid,
  });

  let dbTotal = 0;
  let total = 0;
  let rows: {
    w: typeof welderCertifications.$inferSelect;
    groupNumber: string;
    protocolDate: string;
    groupStatus: string;
  }[] = [];

  try {
    const [{ n }] = await db.select({ n: count() }).from(welderCertifications);
    dbTotal = Number(n);

    const base = db
      .select({
        w: welderCertifications,
        groupNumber: certificationGroups.groupNumber,
        protocolDate: certificationGroups.protocolDate,
        groupStatus: certificationGroups.status,
      })
      .from(welderCertifications)
      .innerJoin(certificationGroups, eq(welderCertifications.groupId, certificationGroups.id));

    const [{ t }] = await db
      .select({ t: count() })
      .from(welderCertifications)
      .innerJoin(certificationGroups, eq(welderCertifications.groupId, certificationGroups.id))
      .where(where);
    total = Number(t);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    rows = await base.where(where).orderBy(...orderByClause(sortBy, sortDir)).limit(pageSize).offset(offset);
  } catch (e) {
    if (getPgErrorCode(e) === "42P01") {
      return <AttestationMigrationMissingNotice />;
    }
    throw e;
  }

  const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="page-title">Зварники</h1>
        <Link className="crm-btn-primary shrink-0" href="/attestation/welders/new">
          Додати атестацію
        </Link>
      </div>

      <AttestationWeldersTable
        rows={rows.map(({ w, groupNumber, protocolDate, groupStatus }) => ({
          id: w.id,
          groupNumber,
          protocolDate: String(protocolDate).slice(0, 10),
          orderInGroup: w.orderInGroup,
          lastName: w.lastName,
          firstName: w.firstName,
          middleName: w.middleName,
          groupStatus,
        }))}
        total={total}
        page={safePage}
        pageSize={pageSize}
        q={q}
        sortBy={sortBy}
        sortDir={sortDir}
        show={show}
        statusFilter={statusFilter}
        protocolFrom={protocolFromRaw}
        protocolTo={protocolToRaw}
        dateRangeInvalid={dateRangeInvalid}
        isDatabaseEmpty={dbTotal === 0}
      />
    </div>
  );
}
