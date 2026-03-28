"use client";

import { useCallback, useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FiEdit2, FiInfo } from "react-icons/fi";

import { DeleteCompanyButton } from "@/components/companies/DeleteCompanyButton";
import { DetailRow } from "@/components/data-table/detail-row";
import { EmptyListState } from "@/components/data-table/empty-list-state";
import { ListPagePagination } from "@/components/data-table/list-page-pagination";
import { ListPageToolbar } from "@/components/data-table/list-page-toolbar";
import { listTableHeaderClass, tableActionIconClassName } from "@/components/data-table/list-styles";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { Card } from "@/components/ui/card";
import { useDebouncedListSearch } from "@/hooks/use-debounced-list-search";
import { useListUrlParams } from "@/hooks/use-list-url-params";

type CompanyRow = {
  id: string;
  shortName: string;
  edrpouCode: string;
  address: string;
  fullName: string;
  vatIdTin: string | null;
  iban: string;
  bank: string;
  contacts: string;
};

type SortBy = "shortName" | "edrpouCode" | "address" | "createdAt";
type SortDir = "asc" | "desc";

export function CompaniesTable({
  rows,
  total,
  page,
  pageSize,
  q,
  sortBy,
  sortDir,
}: {
  rows: CompanyRow[];
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

  const columns = useMemo<ColumnDef<CompanyRow>[]>(
    () => [
      {
        accessorKey: "shortName",
        header: "Скорочена назва",
      },
      {
        accessorKey: "edrpouCode",
        header: "ЄДРПОУ",
      },
      {
        accessorKey: "address",
        header: "Адреса",
      },
      {
        id: "actions",
        header: "Дії",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <InfoDialog
                title={`Компанія: ${c.shortName}`}
                trigger={<FiInfo aria-hidden="true" className="size-4" />}
                triggerAriaLabel="Інформація про компанію"
                triggerClassName={tableActionIconClassName}
              >
                <div className="grid gap-2">
                  <DetailRow label="Повна назва" value={c.fullName} />
                  <DetailRow label="ЄДРПОУ" value={c.edrpouCode} />
                  <DetailRow label="ІПН" value={c.vatIdTin ?? "—"} />
                  <DetailRow label="IBAN" value={c.iban} />
                  <DetailRow label="Банк" value={c.bank} />
                  <DetailRow label="Адреса" value={c.address} />
                  <DetailRow label="Контакти" value={formatContacts(c.contacts)} />
                </div>
              </InfoDialog>
              <a
                className={tableActionIconClassName}
                href={`/companies/${c.id}/edit`}
                aria-label="Редагувати компанію"
                title="Редагувати компанію"
              >
                <FiEdit2 aria-hidden="true" className="size-4" />
              </a>
              <DeleteCompanyButton companyId={c.id} companyName={c.shortName} />
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
    return <EmptyListState message="Поки що немає компаній." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ListPageToolbar
        queryInput={queryInput}
        onQueryChange={setQueryInput}
        searchPlaceholder="Пошук: назва, ЄДРПОУ, адреса"
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
                        header.column.id === "actions" ? "w-[148px] whitespace-nowrap text-center" : ""
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${
                            header.column.id === "actions" ? "w-full justify-center" : ""
                          }`}
                          onClick={() => {
                            if (header.column.id === "actions") return;
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
                        cell.column.id === "actions" ? "w-[148px] whitespace-nowrap" : ""
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
                <div className="text-base font-medium text-foreground">{c.shortName}</div>
                <div className="mt-1 text-xs text-muted-foreground">ЄДРПОУ: {c.edrpouCode}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.address}</div>
                <div className="mt-3 flex gap-2">
                  <InfoDialog
                    title={`Компанія: ${c.shortName}`}
                    trigger={<FiInfo aria-hidden="true" className="size-4" />}
                    triggerAriaLabel="Інформація про компанію"
                    triggerClassName={tableActionIconClassName}
                  >
                    <div className="grid gap-2">
                      <DetailRow label="Повна назва" value={c.fullName} />
                      <DetailRow label="ЄДРПОУ" value={c.edrpouCode} />
                      <DetailRow label="ІПН" value={c.vatIdTin ?? "—"} />
                      <DetailRow label="IBAN" value={c.iban} />
                      <DetailRow label="Банк" value={c.bank} />
                      <DetailRow label="Адреса" value={c.address} />
                      <DetailRow label="Контакти" value={formatContacts(c.contacts)} />
                    </div>
                  </InfoDialog>
                  <a
                    className={tableActionIconClassName}
                    href={`/companies/${c.id}/edit`}
                    aria-label="Редагувати компанію"
                    title="Редагувати компанію"
                  >
                    <FiEdit2 aria-hidden="true" className="size-4" />
                  </a>
                  <DeleteCompanyButton companyId={c.id} companyName={c.shortName} />
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
        pageSize={pageSize}
        onPageSizeChange={(next) => updateParams({ pageSize: next, page: 1 })}
        onPrev={() => updateParams({ page: page - 1 })}
        onNext={() => updateParams({ page: page + 1 })}
      />
    </div>
  );
}

function formatContacts(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Array<{ type?: string; value?: string }>;
    if (!Array.isArray(parsed) || parsed.length === 0) return "—";
    const lines = parsed
      .map((c) => {
        const value = String(c.value ?? "").trim();
        if (!value) return "";
        const type = c.type === "email" ? "Email" : "Тел.";
        return `${type}: ${value}`;
      })
      .filter(Boolean);
    return lines.length > 0 ? lines.join(" | ") : "—";
  } catch {
    return "—";
  }
}
