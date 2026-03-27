"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiEdit2, FiInfo } from "react-icons/fi";

import { InfoDialog } from "@/components/modals/InfoDialog";
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

const actionIconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
          <span className="line-clamp-2 max-w-[min(28rem,50vw)] text-zinc-800" title={row.original.lineItemsPreview}>
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
                triggerClassName={actionIconBtn}
              >
                <div className="grid gap-2">
                  <Row k="Дата" v={new Date(c.date).toLocaleDateString("uk-UA")} />
                  <Row k="Тип" v={c.workType === "WORKS" ? "Роботи" : "Послуги"} />
                  <Row k="Місце" v={c.signingLocation} />
                  <Row k="Позиції" v={c.lineItemsPreview} />
                  <Row k="Разом (без ПДВ)" v={c.totalWithoutVat} />
                  <Row k="ПДВ 20%" v={c.vat20} />
                  <Row k="Разом з ПДВ" v={c.totalWithVat} />
                </div>
              </InfoDialog>
              <a
                className={actionIconBtn}
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

  function updateParams(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const [queryInput, setQueryInput] = useState(q);
  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  useEffect(() => {
    const normalizedCurrent = q.trim();
    const normalizedNext = queryInput.trim();
    if (normalizedCurrent === normalizedNext) return;
    const timer = setTimeout(() => {
      updateParams({ q: normalizedNext || null, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [queryInput, q]);

  function toggleSort(column: SortBy) {
    if (sortBy !== column) {
      updateParams({ sortBy: column, sortDir: "asc", page: 1 });
      return;
    }
    updateParams({ sortBy: column, sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 });
  }

  if (rows.length === 0 && !q) {
    return (
      <div className="overflow-hidden rounded-xl border bg-white p-8 text-center text-sm text-zinc-500">
        Поки що немає договорів.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border bg-white p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <input
            value={queryInput}
            placeholder="Пошук: номер, місце складання"
            className="h-10 w-full rounded-md border px-3 text-sm md:max-w-md"
            onChange={(e) => setQueryInput(e.currentTarget.value)}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600">На сторінці:</span>
            <select
              value={String(pageSize)}
              className="h-9 rounded-md border px-2"
              onChange={(e) => updateParams({ pageSize: e.target.value, page: 1 })}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF7E5] text-left text-zinc-700">
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
                <div className="text-base font-medium text-zinc-900">{c.number}</div>
                <div className="mt-1 text-xs text-zinc-600">
                  {new Date(c.date).toLocaleDateString("uk-UA")} · {c.workType === "WORKS" ? "Роботи" : "Послуги"}
                </div>
                <div className="mt-1 text-xs text-zinc-700">{c.lineItemsPreview}</div>
                <div className="mt-1 text-sm font-medium tabular-nums text-zinc-900">
                  З ПДВ: {formatMoney(Number.parseFloat(c.totalWithVat) || 0)}
                </div>
                <div className="mt-3 flex gap-2">
                  <InfoDialog
                    title={`Договір ${c.number}`}
                    trigger={<FiInfo aria-hidden="true" className="size-4" />}
                    triggerAriaLabel="Інформація про договір"
                    triggerClassName={actionIconBtn}
                  >
                    <div className="grid gap-2">
                      <Row k="Дата" v={new Date(c.date).toLocaleDateString("uk-UA")} />
                      <Row k="Тип" v={c.workType === "WORKS" ? "Роботи" : "Послуги"} />
                      <Row k="Місце" v={c.signingLocation} />
                      <Row k="Позиції" v={c.lineItemsPreview} />
                      <Row k="Разом (без ПДВ)" v={c.totalWithoutVat} />
                      <Row k="ПДВ 20%" v={c.vat20} />
                      <Row k="Разом з ПДВ" v={c.totalWithVat} />
                    </div>
                  </InfoDialog>
                  <a
                    className={actionIconBtn}
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
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm">
        <span className="text-zinc-600">
          Сторінка {page} з {totalPages} (всього: {total})
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="h-9 rounded-md border px-3 disabled:opacity-50"
            onClick={() => updateParams({ page: page - 1 })}
          >
            Назад
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            className="h-9 rounded-md border px-3 disabled:opacity-50"
            onClick={() => updateParams({ page: page + 1 })}
          >
            Далі
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-zinc-500">{k}</div>
      <div className="col-span-2 text-zinc-900">{v}</div>
    </div>
  );
}
