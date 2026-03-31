"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { FiCopy, FiEdit2, FiInfo, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { DetailRow } from "@/components/data-table/detail-row";
import { EmptyListState } from "@/components/data-table/empty-list-state";
import { ListPagePagination } from "@/components/data-table/list-page-pagination";
import { ListPageToolbar } from "@/components/data-table/list-page-toolbar";
import { listTableHeaderClass, tableActionIconClassName } from "@/components/data-table/list-styles";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useDebouncedListSearch } from "@/hooks/use-debounced-list-search";
import { useListUrlParams } from "@/hooks/use-list-url-params";
import { formatMoney } from "@/lib/totals";

export type InvoiceRow = {
  id: string;
  number: string;
  date: string;
  workType: "WORKS" | "SERVICES";
  origin: "standalone" | "contract" | "external";
  lineItemsPreview: string;
  customerCompany: string;
  contractorCompany: string;
  totalWithoutVat: string;
  vat20: string;
  totalWithVat: string;
};

type SortBy = "number" | "date" | "workType" | "totalWithVat";
type SortDir = "asc" | "desc";

type OriginFilter = "standalone" | "contract" | "external";

function originLabel(o: InvoiceRow["origin"]): string {
  if (o === "external") return "Зовнішній";
  if (o === "contract") return "Від договору";
  return "Окремий";
}

function invoicesTableHeadClass(columnId: string): string {
  const narrow = "w-0 px-2 py-3 whitespace-nowrap";
  switch (columnId) {
    case "actions":
      return `${narrow} text-center`;
    case "lineItems":
      return "min-w-0 px-3 py-3";
    case "totalWithVat":
      return `${narrow} text-right tabular-nums`;
    case "number":
    case "date":
    case "workType":
    case "origin":
      return narrow;
    default:
      return "px-3 py-3";
  }
}

function invoicesTableCellClass(columnId: string): string {
  const base = "align-top py-3";
  const narrow = `${base} w-0 px-2 whitespace-nowrap`;
  switch (columnId) {
    case "actions":
      return narrow;
    case "lineItems":
      return `${base} min-w-0 px-3`;
    case "totalWithVat":
      return `${narrow} text-right tabular-nums`;
    case "number":
    case "date":
    case "workType":
    case "origin":
      return narrow;
    default:
      return `${base} px-3`;
  }
}

export function InvoicesTable({
  rows,
  total,
  page,
  pageSize,
  q,
  sortBy,
  sortDir,
  isDatabaseEmpty,
  filterWorkType,
  filterOrigin,
  filterDateFrom,
  filterDateTo,
  dateRangeInvalid,
  canGenerateAnalogue = false,
}: {
  rows: InvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sortBy: SortBy;
  sortDir: SortDir;
  isDatabaseEmpty: boolean;
  filterWorkType: "WORKS" | "SERVICES" | null;
  filterOrigin: OriginFilter | null;
  filterDateFrom: string | null;
  filterDateTo: string | null;
  dateRangeInvalid: boolean;
  canGenerateAnalogue?: boolean;
}) {
  const router = useRouter();
  const { updateParams } = useListUrlParams();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; number: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [duplicatePendingId, setDuplicatePendingId] = useState<string | null>(null);

  const onSearchCommit = useCallback(
    (trimmed: string) => {
      updateParams({ q: trimmed || null, page: 1 });
    },
    [updateParams],
  );

  const [queryInput, setQueryInput] = useDebouncedListSearch(q, onSearchCommit);

  const confirmDeleteInvoice = useCallback(async () => {
    if (!deleteConfirm || deleteBusy) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/invoices/${deleteConfirm.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "Не вдалося видалити рахунок.");
        return;
      }
      toast.success(`Рахунок № ${deleteConfirm.number} видалено.`);
      setDeleteConfirm(null);
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteConfirm, deleteBusy, router]);

  const duplicateInvoice = useCallback(
    async (invoiceId: string) => {
      setDuplicatePendingId(invoiceId);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/analogue`, { method: "POST" });
        const data = (await res.json().catch(() => null)) as { data?: { id: string }; error?: string } | null;
        if (!res.ok) {
          toast.error(data?.error === "NOT_FOUND" ? "Рахунок не знайдено." : "Не вдалося створити аналог.");
          return;
        }
        const newId = data?.data?.id;
        if (!newId) {
          toast.error("Не вдалося створити аналог.");
          return;
        }
        toast.success("Створено рахунок-аналог.");
        router.push(`/invoices/${newId}/edit`);
      } catch {
        toast.error("Не вдалося створити аналог.");
      } finally {
        setDuplicatePendingId(null);
      }
    },
    [router],
  );

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
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
        id: "origin",
        header: "Походження",
        cell: ({ row }) => originLabel(row.original.origin),
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
          const inv = row.original;
          const rowBusy = duplicatePendingId === inv.id;
          return (
            <div className="flex flex-nowrap items-center justify-center gap-1">
              <InfoDialog
                title={`Рахунок ${inv.number}`}
                trigger={<FiInfo aria-hidden="true" className="size-4" />}
                triggerAriaLabel="Інформація про рахунок"
                triggerClassName={tableActionIconClassName}
              >
                <div className="grid gap-2">
                  <DetailRow label="Дата" value={new Date(inv.date).toLocaleDateString("uk-UA")} />
                  <DetailRow label="Тип" value={inv.workType === "WORKS" ? "Роботи" : "Послуги"} />
                  <DetailRow label="Походження" value={originLabel(inv.origin)} />
                  <DetailRow label="Замовник" value={inv.customerCompany} />
                  <DetailRow label="Виконавець" value={inv.contractorCompany} />
                  <DetailRow label="Позиції" value={inv.lineItemsPreview} />
                  <DetailRow label="Разом (без ПДВ)" value={inv.totalWithoutVat} />
                  <DetailRow label="ПДВ 20%" value={inv.vat20} />
                  <DetailRow label="Разом з ПДВ" value={inv.totalWithVat} />
                </div>
              </InfoDialog>
              <a
                className={tableActionIconClassName}
                href={`/invoices/${inv.id}/edit`}
                aria-label="Редагувати рахунок"
                title="Редагувати"
              >
                <FiEdit2 aria-hidden="true" className="size-4" />
              </a>
              {canGenerateAnalogue && inv.origin !== "contract" ? (
                <button
                  type="button"
                  className={tableActionIconClassName}
                  aria-label="Створити рахунок-аналог"
                  title="Згенерувати аналог"
                  disabled={rowBusy}
                  onClick={() => void duplicateInvoice(inv.id)}
                >
                  <FiCopy aria-hidden="true" className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                className={cn(
                  tableActionIconClassName,
                  "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40",
                )}
                aria-label="Видалити рахунок"
                title="Видалити"
                onClick={() => setDeleteConfirm({ id: inv.id, number: inv.number })}
                disabled={rowBusy}
              >
                <FiTrash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [canGenerateAnalogue, duplicateInvoice, duplicatePendingId],
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

  function isNonSortableColumn(id: string) {
    return id === "actions" || id === "lineItems" || id === "origin";
  }

  if (isDatabaseEmpty) {
    return <EmptyListState message="Поки що немає рахунків." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteConfirm(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => {
            if (deleteBusy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (deleteBusy) e.preventDefault();
          }}
        >
          <DialogTitle>Видалення рахунку</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {deleteConfirm
              ? `Ви дійсно хочете видалити рахунок № ${deleteConfirm.number}? Будуть також видалені пов’язаний акт (якщо існує), усі завантажені скани рахунку та акту (включно з файлами у хмарному сховищі). Цю дію не можна скасувати.`
              : null}
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={deleteBusy} onClick={() => setDeleteConfirm(null)}>
              Скасувати
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void confirmDeleteInvoice()}
            >
              {deleteBusy ? "Видалення…" : "Видалити"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ListPageToolbar
        queryInput={queryInput}
        onQueryChange={setQueryInput}
        searchPlaceholder="Пошук за номером рахунку"
        filters={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            {dateRangeInvalid ? (
              <p className="w-full text-sm text-destructive" role="alert">
                «Дата від» пізніша за «Дату до». Виправте діапазон — фільтр за датою тимчасово вимкнено.
              </p>
            ) : null}
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Дата від</Label>
              <Input
                type="date"
                className="h-10 w-full min-w-[10.5rem] sm:w-auto"
                value={filterDateFrom ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({ dateFrom: v || null, page: 1 });
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Дата до</Label>
              <Input
                type="date"
                className="h-10 w-full min-w-[10.5rem] sm:w-auto"
                value={filterDateTo ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({ dateTo: v || null, page: 1 });
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Тип</Label>
              <NativeSelect
                className="h-10 w-full min-w-[10rem] sm:w-auto"
                value={filterWorkType ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({
                    workType: v === "WORKS" || v === "SERVICES" ? v : null,
                    page: 1,
                  });
                }}
              >
                <option value="">Усі</option>
                <option value="WORKS">Роботи</option>
                <option value="SERVICES">Послуги</option>
              </NativeSelect>
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">Походження</Label>
              <NativeSelect
                className="h-10 w-full min-w-[11rem] sm:w-auto"
                value={filterOrigin ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({
                    origin: v === "standalone" || v === "contract" || v === "external" ? v : null,
                    page: 1,
                  });
                }}
              >
                <option value="">Усі</option>
                <option value="standalone">Окремий</option>
                <option value="contract">Від договору</option>
                <option value="external">Зовнішній</option>
              </NativeSelect>
            </div>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className={listTableHeaderClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className={invoicesTableHeadClass(header.column.id)}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${
                            header.column.id === "actions" ? "w-full justify-center" : ""
                          }`}
                          onClick={() => {
                            if (isNonSortableColumn(header.column.id)) return;
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
                    <td key={cell.id} className={invoicesTableCellClass(cell.column.id)}>
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
            const inv = row.original;
            const rowBusy = duplicatePendingId === inv.id;
            return (
              <div key={inv.id} className="rounded-lg border p-3">
                <div className="text-base font-medium text-foreground">{inv.number}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(inv.date).toLocaleDateString("uk-UA")} · {inv.workType === "WORKS" ? "Роботи" : "Послуги"} ·{" "}
                  {originLabel(inv.origin)}
                </div>
                <div className="mt-1 text-xs text-foreground/85">{inv.lineItemsPreview}</div>
                <div className="mt-1 text-sm font-medium tabular-nums text-foreground">
                  З ПДВ: {formatMoney(Number.parseFloat(inv.totalWithVat) || 0)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <InfoDialog
                    title={`Рахунок ${inv.number}`}
                    trigger={<FiInfo aria-hidden="true" className="size-4" />}
                    triggerAriaLabel="Інформація про рахунок"
                    triggerClassName={tableActionIconClassName}
                  >
                    <div className="grid gap-2">
                      <DetailRow label="Дата" value={new Date(inv.date).toLocaleDateString("uk-UA")} />
                      <DetailRow label="Тип" value={inv.workType === "WORKS" ? "Роботи" : "Послуги"} />
                      <DetailRow label="Походження" value={originLabel(inv.origin)} />
                      <DetailRow label="Замовник" value={inv.customerCompany} />
                      <DetailRow label="Виконавець" value={inv.contractorCompany} />
                      <DetailRow label="Позиції" value={inv.lineItemsPreview} />
                      <DetailRow label="Разом (без ПДВ)" value={inv.totalWithoutVat} />
                      <DetailRow label="ПДВ 20%" value={inv.vat20} />
                      <DetailRow label="Разом з ПДВ" value={inv.totalWithVat} />
                    </div>
                  </InfoDialog>
                  <a
                    className={tableActionIconClassName}
                    href={`/invoices/${inv.id}/edit`}
                    aria-label="Редагувати рахунок"
                    title="Редагувати"
                  >
                    <FiEdit2 aria-hidden="true" className="size-4" />
                  </a>
                  {canGenerateAnalogue && inv.origin !== "contract" ? (
                    <button
                      type="button"
                      className={tableActionIconClassName}
                      aria-label="Створити рахунок-аналог"
                      title="Згенерувати аналог"
                      disabled={rowBusy}
                      onClick={() => void duplicateInvoice(inv.id)}
                    >
                      <FiCopy aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={cn(
                      tableActionIconClassName,
                      "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40",
                    )}
                    aria-label="Видалити рахунок"
                    title="Видалити"
                    onClick={() => setDeleteConfirm({ id: inv.id, number: inv.number })}
                    disabled={rowBusy}
                  >
                    <FiTrash2 aria-hidden="true" className="size-4" />
                  </button>
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
