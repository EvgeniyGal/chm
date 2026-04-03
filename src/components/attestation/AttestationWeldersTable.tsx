"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { EmptyListState } from "@/components/data-table/empty-list-state";
import { ListPagePagination } from "@/components/data-table/list-page-pagination";
import { ListPageToolbar } from "@/components/data-table/list-page-toolbar";
import { listTableHeaderClass } from "@/components/data-table/list-styles";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useDebouncedListSearch } from "@/hooks/use-debounced-list-search";
import { useListUrlParams } from "@/hooks/use-list-url-params";
import { certificationGroupStatusLabelUa } from "@/lib/attestation/labels-uk";

import type { ShowFilter } from "@/components/attestation/AttestationGroupsTable";
import { WelderListRowActions } from "@/components/attestation/WelderListRowActions";

type WelderListRow = {
  id: string;
  groupNumber: string;
  protocolDate: string;
  orderInGroup: number;
  lastName: string;
  firstName: string;
  middleName: string | null;
  groupStatus: string;
};

export type WeldersSortBy =
  | "groupNumber"
  | "protocolDate"
  | "orderInGroup"
  | "lastName"
  | "createdAt"
  | "groupStatus";

type SortDir = "asc" | "desc";

const DEFAULT_SORT_DIR: Record<WeldersSortBy, SortDir> = {
  protocolDate: "desc",
  groupNumber: "asc",
  orderInGroup: "asc",
  lastName: "asc",
  createdAt: "desc",
  groupStatus: "asc",
};

function fullName(w: Pick<WelderListRow, "lastName" | "firstName" | "middleName">): string {
  return [w.lastName, w.firstName, w.middleName ?? ""].filter(Boolean).join(" ");
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  column: WeldersSortBy;
  sortBy: WeldersSortBy;
  sortDir: SortDir;
  onSort: (column: WeldersSortBy) => void;
}) {
  const active = sortBy === column;
  return (
    <th className="px-3 py-3" aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="-mx-1 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left font-semibold text-foreground/90 hover:bg-black/5 hover:text-foreground"
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-4 shrink-0 text-foreground" aria-hidden />
          ) : (
            <ArrowDown className="size-4 shrink-0 text-foreground" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-4 shrink-0 text-foreground/35" aria-hidden />
        )}
      </button>
    </th>
  );
}

export function AttestationWeldersTable({
  rows,
  total,
  page,
  pageSize,
  q,
  sortBy,
  sortDir,
  show,
  statusFilter,
  protocolFrom,
  protocolTo,
  dateRangeInvalid,
  isDatabaseEmpty,
}: {
  rows: WelderListRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sortBy: WeldersSortBy;
  sortDir: SortDir;
  show: ShowFilter;
  statusFilter: string | null;
  protocolFrom: string | null;
  protocolTo: string | null;
  dateRangeInvalid: boolean;
  isDatabaseEmpty: boolean;
}) {
  const { updateParams } = useListUrlParams();

  const onSearchCommit = useCallback(
    (trimmed: string) => {
      updateParams({ q: trimmed || null, page: 1 });
    },
    [updateParams],
  );

  const [queryInput, setQueryInput] = useDebouncedListSearch(q, onSearchCommit);

  const onHeaderSort = useCallback(
    (column: WeldersSortBy) => {
      if (sortBy === column) {
        updateParams({ sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 });
      } else {
        updateParams({ sortBy: column, sortDir: DEFAULT_SORT_DIR[column], page: 1 });
      }
    },
    [sortBy, sortDir, updateParams],
  );

  const columns = useMemo<ColumnDef<WelderListRow>[]>(
    () => [
      {
        id: "groupNumber",
        accessorKey: "groupNumber",
        header: "№ групи",
        cell: ({ row }) => <span className="font-medium">№{row.original.groupNumber}</span>,
      },
      {
        id: "protocolDate",
        accessorKey: "protocolDate",
        header: "Дата протоколу",
        cell: ({ row }) => (
          <span className="tabular-nums">{new Date(row.original.protocolDate).toLocaleDateString("uk-UA")}</span>
        ),
      },
      {
        id: "orderInGroup",
        accessorKey: "orderInGroup",
        header: "№ у групі",
        cell: ({ row }) => <span className="tabular-nums">{row.original.orderInGroup}</span>,
      },
      {
        id: "fullName",
        header: "ПІБ",
        cell: ({ row }) => <span className="text-foreground/90">{fullName(row.original)}</span>,
      },
      {
        id: "groupStatus",
        accessorKey: "groupStatus",
        header: "Статус групи",
        cell: ({ row }) => <span>{certificationGroupStatusLabelUa(row.original.groupStatus)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="font-semibold">Дії</span>,
        cell: ({ row }) => (
          <WelderListRowActions welderId={row.original.id} groupStatus={row.original.groupStatus} />
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const emptyMessage = "Нічого не знайдено. Змініть пошук або фільтри.";

  if (isDatabaseEmpty) {
    return <EmptyListState message="Поки що немає атестацій зварників. Додайте запис." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ListPageToolbar
        queryInput={queryInput}
        onQueryChange={setQueryInput}
        searchPlaceholder="Пошук: прізвище, імʼя, по батькові, номер групи"
        filters={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            {dateRangeInvalid ? (
              <p className="w-full text-sm text-destructive" role="alert">
                «Дата протоколу від» пізніша за «Дату до». Виправте діапазон — фільтр за датою тимчасово вимкнено.
              </p>
            ) : null}
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Дата протоколу від</Label>
              <Input
                type="date"
                className="h-10 w-full min-w-[10.5rem] sm:w-auto"
                value={protocolFrom ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({ protocolFrom: v || null, page: 1 });
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Дата протоколу до</Label>
              <Input
                type="date"
                className="h-10 w-full min-w-[10.5rem] sm:w-auto"
                value={protocolTo ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({ protocolTo: v || null, page: 1 });
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Статус групи</Label>
              <NativeSelect
                className="h-10 w-full min-w-[11rem] sm:w-auto"
                value={statusFilter ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({
                    status: v === "draft" || v === "active" || v === "completed" || v === "archived" ? v : null,
                    page: 1,
                  });
                }}
              >
                <option value="">Усі</option>
                <option value="draft">Чернетка</option>
                <option value="active">Активна</option>
                <option value="completed">Завершена</option>
                <option value="archived">Архів</option>
              </NativeSelect>
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Показати</Label>
              <NativeSelect
                className="h-10 w-full min-w-[12rem] sm:w-auto"
                value={show}
                disabled={Boolean(statusFilter)}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({
                    show: v === "active" || v === "all" || v === "archived" ? v : "all",
                    page: 1,
                  });
                }}
              >
                <option value="all">Усі</option>
                <option value="archived">Архівні</option>
                <option value="active">Активні</option>
              </NativeSelect>
            </div>
          </div>
        }
      />

      <div className="md:hidden">
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <Label className="text-muted-foreground">Сортування</Label>
          <NativeSelect
            className="h-10 w-full"
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const v = e.target.value;
              const [sb, sd] = v.split(":");
              const nextSortBy: WeldersSortBy =
                sb === "groupNumber" ||
                sb === "protocolDate" ||
                sb === "orderInGroup" ||
                sb === "lastName" ||
                sb === "createdAt" ||
                sb === "groupStatus"
                  ? sb
                  : "protocolDate";
              const nextSortDir: SortDir = sd === "asc" || sd === "desc" ? sd : "desc";
              updateParams({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
            }}
          >
            <option value="protocolDate:desc">Дата протоколу (спочатку нові)</option>
            <option value="protocolDate:asc">Дата протоколу (спочатку старі)</option>
            <option value="groupNumber:asc">№ групи (А → Я)</option>
            <option value="groupNumber:desc">№ групи (Я → А)</option>
            <option value="orderInGroup:asc">№ у групі (зростання)</option>
            <option value="orderInGroup:desc">№ у групі (спадання)</option>
            <option value="lastName:asc">Прізвище (А → Я)</option>
            <option value="lastName:desc">Прізвище (Я → А)</option>
            <option value="createdAt:desc">Додано (спочатку нові)</option>
            <option value="createdAt:asc">Додано (спочатку старі)</option>
            <option value="groupStatus:asc">Статус групи (А → Я)</option>
            <option value="groupStatus:desc">Статус групи (Я → А)</option>
          </NativeSelect>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className={listTableHeaderClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const id = header.column.id;
                    if (id === "groupNumber") {
                      return (
                        <SortableHeader
                          key={header.id}
                          label="№ групи"
                          column="groupNumber"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={onHeaderSort}
                        />
                      );
                    }
                    if (id === "protocolDate") {
                      return (
                        <SortableHeader
                          key={header.id}
                          label="Дата протоколу"
                          column="protocolDate"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={onHeaderSort}
                        />
                      );
                    }
                    if (id === "orderInGroup") {
                      return (
                        <SortableHeader
                          key={header.id}
                          label="№ у групі"
                          column="orderInGroup"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={onHeaderSort}
                        />
                      );
                    }
                    if (id === "fullName") {
                      return (
                        <SortableHeader
                          key={header.id}
                          label="ПІБ"
                          column="lastName"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={onHeaderSort}
                        />
                      );
                    }
                    if (id === "groupStatus") {
                      return (
                        <SortableHeader
                          key={header.id}
                          label="Статус групи"
                          column="groupStatus"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={onHeaderSort}
                        />
                      );
                    }
                    return (
                      <th key={header.id} className={`px-3 py-3 ${id === "actions" ? "text-right" : ""}`}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="border-t border-border px-3 py-8 text-center text-muted-foreground" colSpan={6}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-3 py-3 align-top ${cell.column.id === "fullName" ? "min-w-0 max-w-[min(24rem,40vw)]" : ""} ${cell.column.id === "actions" ? "text-right" : ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            table.getRowModel().rows.map((row) => {
              const w = row.original;
              return (
                <div
                  key={w.id}
                  className="rounded-lg border border-border bg-card px-3 py-3 text-card-foreground shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="text-base font-semibold leading-tight text-foreground">№{w.groupNumber}</div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                        <dt className="text-muted-foreground">Дата протоколу</dt>
                        <dd className="tabular-nums text-foreground">
                          {new Date(w.protocolDate).toLocaleDateString("uk-UA")}
                        </dd>
                        <dt className="text-muted-foreground">№ у групі</dt>
                        <dd className="tabular-nums text-foreground">{w.orderInGroup}</dd>
                        <dt className="text-muted-foreground">ПІБ</dt>
                        <dd className="min-w-0 break-words text-foreground">{fullName(w)}</dd>
                        <dt className="text-muted-foreground">Статус групи</dt>
                        <dd>{certificationGroupStatusLabelUa(w.groupStatus)}</dd>
                      </dl>
                    </div>
                    <WelderListRowActions welderId={w.id} groupStatus={w.groupStatus} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <ListPagePagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPrev={() => updateParams({ page: Math.max(1, page - 1) })}
        onNext={() => updateParams({ page: Math.min(totalPages, page + 1) })}
        pageSize={pageSize}
        onPageSizeChange={(next) => updateParams({ pageSize: next, page: 1 })}
      />
    </div>
  );
}
