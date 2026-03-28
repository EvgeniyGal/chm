"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { FiArchive, FiCheckCircle, FiEdit2, FiInfo } from "react-icons/fi";
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
import { cn } from "@/lib/utils";
import { useDebouncedListSearch } from "@/hooks/use-debounced-list-search";
import { useListUrlParams } from "@/hooks/use-list-url-params";
import { formatMoney } from "@/lib/totals";

export type ContractRow = {
  id: string;
  number: string;
  date: string;
  signingLocation: string;
  workType: "WORKS" | "SERVICES";
  isSigned: boolean;
  isArchived: boolean;
  lineItemsPreview: string;
  totalWithoutVat: string;
  vat20: string;
  totalWithVat: string;
};

type SortBy = "number" | "date" | "workType" | "totalWithVat";
type SortDir = "asc" | "desc";

type PaperConfirm = {
  contractId: string;
  contractNumber: string;
  field: "isSigned" | "isArchived";
  nextValue: boolean;
};

function paperConfirmMessage(c: PaperConfirm): string {
  if (c.field === "isSigned") {
    return c.nextValue
      ? `Позначити договір № ${c.contractNumber} як підписаний?`
      : `Зняти статус «підписаний» з договору № ${c.contractNumber}?`;
  }
  return c.nextValue
    ? `Позначити договір № ${c.contractNumber} як такий, що в архіві?`
    : `Зняти позначку «в архіві» з договору № ${c.contractNumber}?`;
}

/** Shrink-wrap column width to cell content (`w-0` + nowrap is the classic table pattern). */
function contractsTableHeadClass(columnId: string): string {
  const narrow = "w-0 px-2 py-3 whitespace-nowrap";
  switch (columnId) {
    case "actions":
      return `${narrow} text-center`;
    case "lineItems":
      return "min-w-0 px-3 py-3";
    case "totalWithVat":
      return `${narrow} text-right tabular-nums`;
    case "isSigned":
    case "isArchived":
      return `${narrow} text-center`;
    case "number":
    case "date":
    case "workType":
      return narrow;
    default:
      return "px-3 py-3";
  }
}

function contractsTableCellClass(columnId: string): string {
  const base = "align-top py-3";
  const narrow = `${base} w-0 px-2 whitespace-nowrap`;
  switch (columnId) {
    case "actions":
      return `${narrow}`;
    case "lineItems":
      return `${base} min-w-0 px-3`;
    case "totalWithVat":
      return `${narrow} text-right tabular-nums`;
    case "isSigned":
    case "isArchived":
      return `${narrow} text-center`;
    case "number":
    case "date":
    case "workType":
      return narrow;
    default:
      return `${base} px-3`;
  }
}

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
  const { updateParams } = useListUrlParams();
  const [paperConfirm, setPaperConfirm] = useState<PaperConfirm | null>(null);
  const [paperPendingId, setPaperPendingId] = useState<string | null>(null);

  const onSearchCommit = useCallback(
    (trimmed: string) => {
      updateParams({ q: trimmed || null, page: 1 });
    },
    [updateParams],
  );

  const [queryInput, setQueryInput] = useDebouncedListSearch(q, onSearchCommit);

  const applyPaperFlag = useCallback(async () => {
    if (!paperConfirm) return;
    const { contractId, field, nextValue } = paperConfirm;
    setPaperPendingId(contractId);
    try {
      const body =
        field === "isSigned" ? { isSigned: nextValue } : { isArchived: nextValue };
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error === "FORBIDDEN" ? "Недостатньо прав." : data?.error ?? "Не вдалося зберегти.");
        return;
      }
      toast.success("Зміни збережено.");
      setPaperConfirm(null);
      router.refresh();
    } catch {
      toast.error("Не вдалося зберегти.");
    } finally {
      setPaperPendingId(null);
    }
  }, [paperConfirm, router]);

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
        id: "isSigned",
        header: "Підписаний",
        cell: ({ row }) =>
          row.original.isSigned ? (
            <span className="font-medium text-emerald-800">Так</span>
          ) : (
            <span className="text-muted-foreground">Ні</span>
          ),
      },
      {
        id: "isArchived",
        header: "В архіві",
        cell: ({ row }) =>
          row.original.isArchived ? (
            <span className="font-medium text-sky-900">Так</span>
          ) : (
            <span className="text-muted-foreground">Ні</span>
          ),
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
          const rowBusy = paperPendingId === c.id;
          return (
            <div className="flex flex-nowrap items-center justify-center gap-1">
              <button
                type="button"
                className={cn(
                  tableActionIconClassName,
                  c.isSigned && "border-emerald-600/60 bg-emerald-50 text-emerald-900",
                )}
                aria-label={c.isSigned ? "Зняти статус «підписаний»" : "Позначити як підписаний"}
                title={c.isSigned ? "Зняти «підписаний»" : "Підписаний"}
                disabled={rowBusy}
                onClick={() =>
                  setPaperConfirm({
                    contractId: c.id,
                    contractNumber: c.number,
                    field: "isSigned",
                    nextValue: !c.isSigned,
                  })
                }
              >
                <FiCheckCircle aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className={cn(
                  tableActionIconClassName,
                  c.isArchived && "border-sky-600/60 bg-sky-50 text-sky-900",
                )}
                aria-label={c.isArchived ? "Зняти з архіву" : "Позначити як в архіві"}
                title={c.isArchived ? "Зняти «в архіві»" : "В архіві"}
                disabled={rowBusy}
                onClick={() =>
                  setPaperConfirm({
                    contractId: c.id,
                    contractNumber: c.number,
                    field: "isArchived",
                    nextValue: !c.isArchived,
                  })
                }
              >
                <FiArchive aria-hidden="true" className="size-4" />
              </button>
              <InfoDialog
                title={`Договір ${c.number}`}
                trigger={<FiInfo aria-hidden="true" className="size-4" />}
                triggerAriaLabel="Інформація про договір"
                triggerClassName={tableActionIconClassName}
              >
                <div className="grid gap-2">
                  <DetailRow label="Дата" value={new Date(c.date).toLocaleDateString("uk-UA")} />
                  <DetailRow label="Тип" value={c.workType === "WORKS" ? "Роботи" : "Послуги"} />
                  <DetailRow label="Підписаний" value={c.isSigned ? "Так" : "Ні"} />
                  <DetailRow label="В архіві" value={c.isArchived ? "Так" : "Ні"} />
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
    [paperPendingId],
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
    return (
      id === "actions" ||
      id === "lineItems" ||
      id === "isSigned" ||
      id === "isArchived"
    );
  }

  if (rows.length === 0 && !q) {
    return <EmptyListState message="Поки що немає договорів." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Dialog
        open={paperConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPaperConfirm(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => {
            if (paperPendingId) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (paperPendingId) e.preventDefault();
          }}
        >
          <DialogTitle>Підтвердження</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {paperConfirm ? paperConfirmMessage(paperConfirm) : null}
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={paperPendingId !== null}
              onClick={() => setPaperConfirm(null)}
            >
              Скасувати
            </Button>
            <Button type="button" disabled={paperPendingId !== null} onClick={() => void applyPaperFlag()}>
              {paperPendingId ? "Збереження…" : "Підтвердити"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    <th key={header.id} className={contractsTableHeadClass(header.column.id)}>
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
                    <td key={cell.id} className={contractsTableCellClass(cell.column.id)}>
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
            const rowBusy = paperPendingId === c.id;
            return (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="text-base font-medium text-foreground">{c.number}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(c.date).toLocaleDateString("uk-UA")} · {c.workType === "WORKS" ? "Роботи" : "Послуги"}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Підписаний</span>
                  <span className={c.isSigned ? "font-medium text-emerald-800" : "text-muted-foreground"}>
                    {c.isSigned ? "Так" : "Ні"}
                  </span>
                  <span className="text-muted-foreground">В архіві</span>
                  <span className={c.isArchived ? "font-medium text-sky-900" : "text-muted-foreground"}>
                    {c.isArchived ? "Так" : "Ні"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-foreground/85">{c.lineItemsPreview}</div>
                <div className="mt-1 text-sm font-medium tabular-nums text-foreground">
                  З ПДВ: {formatMoney(Number.parseFloat(c.totalWithVat) || 0)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      tableActionIconClassName,
                      c.isSigned && "border-emerald-600/60 bg-emerald-50 text-emerald-900",
                    )}
                    aria-label={c.isSigned ? "Зняти статус «підписаний»" : "Позначити як підписаний"}
                    disabled={rowBusy}
                    onClick={() =>
                      setPaperConfirm({
                        contractId: c.id,
                        contractNumber: c.number,
                        field: "isSigned",
                        nextValue: !c.isSigned,
                      })
                    }
                  >
                    <FiCheckCircle aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      tableActionIconClassName,
                      c.isArchived && "border-sky-600/60 bg-sky-50 text-sky-900",
                    )}
                    aria-label={c.isArchived ? "Зняти з архіву" : "Позначити як в архіві"}
                    disabled={rowBusy}
                    onClick={() =>
                      setPaperConfirm({
                        contractId: c.id,
                        contractNumber: c.number,
                        field: "isArchived",
                        nextValue: !c.isArchived,
                      })
                    }
                  >
                    <FiArchive aria-hidden="true" className="size-4" />
                  </button>
                  <InfoDialog
                    title={`Договір ${c.number}`}
                    trigger={<FiInfo aria-hidden="true" className="size-4" />}
                    triggerAriaLabel="Інформація про договір"
                    triggerClassName={tableActionIconClassName}
                  >
                    <div className="grid gap-2">
                      <DetailRow label="Дата" value={new Date(c.date).toLocaleDateString("uk-UA")} />
                      <DetailRow label="Тип" value={c.workType === "WORKS" ? "Роботи" : "Послуги"} />
                      <DetailRow label="Підписаний" value={c.isSigned ? "Так" : "Ні"} />
                      <DetailRow label="В архіві" value={c.isArchived ? "Так" : "Ні"} />
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
