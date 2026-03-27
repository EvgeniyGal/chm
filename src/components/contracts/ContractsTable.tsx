"use client";

import { useCallback, useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FiEdit2, FiInfo } from "react-icons/fi";

import { DetailRow } from "@/components/data-table/detail-row";
import { EmptyListState } from "@/components/data-table/empty-list-state";
import { ListPagePagination } from "@/components/data-table/list-page-pagination";
import { ListPageToolbar } from "@/components/data-table/list-page-toolbar";
import { listTableHeaderClass, tableActionIconClassName } from "@/components/data-table/list-styles";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { Card } from "@/components/ui/card";
import { useDebouncedListSearch } from "@/hooks/use-debounced-list-search";
import { useListUrlParams } from "@/hooks/use-list-url-params";
import { formatMoney } from "@/lib/totals";

export type ContractRow = {
  id: string;
  number: string;
  date: string;
  signingLocation: string;
  workType: "WORKS" | "SERVICES";
  lineItemsPreview: string;
  totalWithoutVat: string;
  vat20: string;
  totalWithVat: string;
};

type SortBy = "number" | "date" | "workType" | "totalWithVat";
type SortDir = "asc" | "desc";

export function ContractsTable({
  rows,
  total,
  page,
  pageSize,
  q,
  sortBy,
  sortDir,
}: {
  rows: ContractRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sortBy: SortBy;
  sortDir: SortDir;
}) {
  const { updateParams } = useListUrlParams();

  const onSearchCommit = useCallback(
    (trimmed: string) => {
      updateParams({ q: trimmed || null, page: 1 });
    },
    [updateParams],
  );

  const [queryInput, setQueryInput] = useDebouncedListSearch(q, onSearchCommit);

  const columns = useMemo<ColumnDef<ContractRow>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Номер",
      },
      {
        accessorKey: "date",
        header: "Дата",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString("uk-UA"),
      },
      {
        accessorKey: "workType",
        header: "Тип",
        cell: ({ row }) => (row.original.workType === "WORKS" ? "Роботи" : "Послуги"),
      },
      {
        id: "lineItems",
        header: "Позиції",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[min(28rem,50vw)] text-foreground/90" title={row.original.lineItemsPreview}>
            {row.original.lineItemsPreview}
          </span>
        ),
      },
      {
        accessorKey: "totalWithVat",
        header: "Сума з ПДВ",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(Number.parseFloat(row.original.totalWithVat) || 0)}</span>
        ),
      },
      {
        id: "actions",
        header: "Дії",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <InfoDialog
                title={`Договір ${c.number}`}
                trigger={<FiInfo aria-hidden="true" className="size-4" />}
                triggerAriaLabel="Інформація про договір"
                triggerClassName={tableActionIconClassName}
              >
                <div className="grid gap-2">
                  <DetailRow label="Дата" value={new Date(c.date).toLocaleDateString("uk-UA")} />
                  <DetailRow label="Тип" value={c.workType === "WORKS" ? "Роботи" : "Послуги"} />
                  <DetailRow label="Місце" value={c.signingLocation} />
                  <DetailRow label="Позиції" value={c.lineItemsPreview} />
                  <DetailRow label="Разом (без ПДВ)" value={c.totalWithoutVat} />
                  <DetailRow label="ПДВ 20%" value={c.vat20} />
                  <DetailRow label="Разом з ПДВ" value={c.totalWithVat} />
                </div>
              </InfoDialog>
              <a
                className={tableActionIconClassName}
                href={`/contracts/${c.id}/edit`}
                aria-label="Редагувати договір"
                title="Редагувати договір"
              >
                <FiEdit2 aria-hidden="true" className="size-4" />
              </a>
            </div>
          );
        },
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

  function toggleSort(column: SortBy) {
    if (sortBy !== column) {
      updateParams({ sortBy: column, sortDir: "asc", page: 1 });
      return;
    }
    updateParams({ sortBy: column, sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 });
  }

  if (rows.length === 0 && !q) {
    return <EmptyListState message="Поки що немає договорів." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ListPageToolbar
        queryInput={queryInput}
        onQueryChange={setQueryInput}
        searchPlaceholder="Пошук: номер, місце складання"
        pageSize={pageSize}
        onPageSizeChange={(next) => updateParams({ pageSize: next, page: 1 })}
      />

      <Card className="overflow-hidden p-0">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className={listTableHeaderClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-4 py-3 ${
                        header.column.id === "actions"
                          ? "w-[100px] whitespace-nowrap text-center"
                          : header.column.id === "lineItems"
                            ? "min-w-[200px] max-w-md"
                            : header.column.id === "totalWithVat"
                              ? "w-[120px] whitespace-nowrap text-right tabular-nums"
                              : ""
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${
                            header.column.id === "actions" ? "w-full justify-center" : ""
                          }`}
                          onClick={() => {
                            if (header.column.id === "actions" || header.column.id === "lineItems") return;
                            toggleSort(header.column.id as SortBy);
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortBy === header.column.id ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 align-top ${
                        cell.column.id === "actions"
                          ? "w-[100px] whitespace-nowrap"
                          : cell.column.id === "totalWithVat"
                            ? "text-right"
                            : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {table.getRowModel().rows.map((row) => {
            const c = row.original;
            return (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="text-base font-medium text-foreground">{c.number}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(c.date).toLocaleDateString("uk-UA")} · {c.workType === "WORKS" ? "Роботи" : "Послуги"}
                </div>
                <div className="mt-1 text-xs text-foreground/85">{c.lineItemsPreview}</div>
                <div className="mt-1 text-sm font-medium tabular-nums text-foreground">
                  З ПДВ: {formatMoney(Number.parseFloat(c.totalWithVat) || 0)}
                </div>
                <div className="mt-3 flex gap-2">
                  <InfoDialog
                    title={`Договір ${c.number}`}
                    trigger={<FiInfo aria-hidden="true" className="size-4" />}
                    triggerAriaLabel="Інформація про договір"
                    triggerClassName={tableActionIconClassName}
                  >
                    <div className="grid gap-2">
                      <DetailRow label="Дата" value={new Date(c.date).toLocaleDateString("uk-UA")} />
                      <DetailRow label="Тип" value={c.workType === "WORKS" ? "Роботи" : "Послуги"} />
                      <DetailRow label="Місце" value={c.signingLocation} />
                      <DetailRow label="Позиції" value={c.lineItemsPreview} />
                      <DetailRow label="Разом (без ПДВ)" value={c.totalWithoutVat} />
                      <DetailRow label="ПДВ 20%" value={c.vat20} />
                      <DetailRow label="Разом з ПДВ" value={c.totalWithVat} />
                    </div>
                  </InfoDialog>
                  <a
                    className={tableActionIconClassName}
                    href={`/contracts/${c.id}/edit`}
                    aria-label="Редагувати договір"
                    title="Редагувати договір"
                  >
                    <FiEdit2 aria-hidden="true" className="size-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ListPagePagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPrev={() => updateParams({ page: page - 1 })}
        onNext={() => updateParams({ page: page + 1 })}
      />
    </div>
  );
}
