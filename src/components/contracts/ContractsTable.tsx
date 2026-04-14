"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { FiArchive, FiCheckCircle, FiCopy, FiDownload, FiEdit2, FiFileMinus, FiFileText, FiInfo, FiTrash2, FiUpload } from "react-icons/fi";
import { toast } from "sonner";

import { DetailRow } from "@/components/data-table/detail-row";
import { EmptyListState } from "@/components/data-table/empty-list-state";
import { ListPagePagination } from "@/components/data-table/list-page-pagination";
import { ListPageToolbar } from "@/components/data-table/list-page-toolbar";
import { listTableHeaderClass, tableActionIconClassName } from "@/components/data-table/list-styles";
import { InfoDialog } from "@/components/modals/InfoDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDebouncedListSearch } from "@/hooks/use-debounced-list-search";
import { useListUrlParams } from "@/hooks/use-list-url-params";
import { formatMoney } from "@/lib/totals";
import { exportRowsToXlsx } from "@/lib/xlsx-export";

type ContractRow = {
  id: string;
  number: string;
  date: string;
  signingLocation: string;
  workType: "WORKS" | "SERVICES";
  isSigned: boolean;
  isArchived: boolean;
  customerCompanyShortName: string;
  contractorCompanyShortName: string;
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

type DeleteConfirm = {
  contractId: string;
  contractNumber: string;
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
    case "select":
      return `${narrow} text-center`;
    case "actions":
      return `${narrow} text-center`;
    case "lineItems":
      return "min-w-0 px-3 py-3";
    case "customer":
      return "w-[120px] px-3 py-3";
    case "totalWithVat":
      return `${narrow} text-right tabular-nums`;
    case "isSigned":
    case "isArchived":
      return `${narrow} text-center`;
    case "numberDate":
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
    case "select":
      return narrow;
    case "actions":
      return `${narrow}`;
    case "lineItems":
      return `${base} min-w-0 px-3`;
    case "customer":
      return `${base} w-[120px] px-3`;
    case "totalWithVat":
      return `${narrow} text-right tabular-nums`;
    case "isSigned":
    case "isArchived":
      return `${narrow} text-center`;
    case "numberDate":
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
  isDatabaseEmpty,
  filterWorkType,
  filterSigned,
  filterArchived,
  filterDateFrom,
  filterDateTo,
  dateRangeInvalid,
  canManageContracts = true,
  canDeleteContracts = false,
  canGenerateAnalogue = false,
  canGenerateDocuments = false,
}: {
  rows: ContractRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sortBy: SortBy;
  sortDir: SortDir;
  isDatabaseEmpty: boolean;
  filterWorkType: "WORKS" | "SERVICES" | null;
  filterSigned: "yes" | "no" | null;
  filterArchived: "yes" | "no" | null;
  filterDateFrom: string | null;
  filterDateTo: string | null;
  dateRangeInvalid: boolean;
  canManageContracts?: boolean;
  canDeleteContracts?: boolean;
  canGenerateAnalogue?: boolean;
  canGenerateDocuments?: boolean;
}) {
  const router = useRouter();
  const { updateParams } = useListUrlParams();
  const [paperConfirm, setPaperConfirm] = useState<PaperConfirm | null>(null);
  const [paperPendingId, setPaperPendingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [duplicatePendingId, setDuplicatePendingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

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

  const applyDeleteContract = useCallback(async () => {
    if (!deleteConfirm) return;
    const { contractId } = deleteConfirm;
    setDeletePendingId(contractId);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(
          data?.error === "FORBIDDEN"
            ? "Недостатньо прав."
            : data?.error === "NOT_FOUND"
              ? "Договір не знайдено."
              : "Не вдалося видалити.",
        );
        return;
      }
      toast.success("Договір і пов’язані дані видалено.");
      setDeleteConfirm(null);
      router.refresh();
    } catch {
      toast.error("Не вдалося видалити.");
    } finally {
      setDeletePendingId(null);
    }
  }, [deleteConfirm, router]);

  const applyDuplicateContract = useCallback(
    async (contractId: string) => {
      setDuplicatePendingId(contractId);
      try {
        const res = await fetch(`/api/contracts/${contractId}/analogue`, { method: "POST" });
        const data = (await res.json().catch(() => null)) as { data?: { id: string }; error?: string } | null;
        if (!res.ok) {
          toast.error(
            data?.error === "FORBIDDEN"
              ? "Недостатньо прав."
              : data?.error === "NOT_FOUND"
                ? "Договір не знайдено."
                : "Не вдалося створити аналог.",
          );
          return;
        }
        const newId = data?.data?.id;
        if (!newId) {
          toast.error("Не вдалося створити аналог.");
          return;
        }
        toast.success("Створено договір-аналог.");
        router.push(`/contracts/${newId}/edit`);
      } catch {
        toast.error("Не вдалося створити аналог.");
      } finally {
        setDuplicatePendingId(null);
      }
    },
    [router],
  );

  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selectedCount = useMemo(() => visibleIds.filter((id) => selectedIds[id]).length, [visibleIds, selectedIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;

  const exportSelectedToXlsx = useCallback(async () => {
    const selectedRows = rows.filter((row) => selectedIds[row.id]);
    if (selectedRows.length === 0) return;

    await exportRowsToXlsx(
      selectedRows.map((row) => ({
        number: row.number,
        date: new Date(row.date).toLocaleDateString("uk-UA"),
        workType: row.workType === "WORKS" ? "Роботи" : "Послуги",
        isSigned: row.isSigned ? "Так" : "Ні",
        isArchived: row.isArchived ? "Так" : "Ні",
        customer: row.customerCompanyShortName,
        lineItems: row.lineItemsPreview,
        totalWithoutVat: Number.parseFloat(row.totalWithoutVat) || 0,
        vat20: Number.parseFloat(row.vat20) || 0,
        totalWithVat: Number.parseFloat(row.totalWithVat) || 0,
      })),
      [
        { header: "Номер", key: "number", width: 16 },
        { header: "Дата", key: "date", width: 14 },
        { header: "Тип", key: "workType", width: 14 },
        { header: "Підписаний", key: "isSigned", width: 12 },
        { header: "В архіві", key: "isArchived", width: 12 },
        { header: "Замовник", key: "customer", width: 24 },
        { header: "Позиції", key: "lineItems", width: 36 },
        { header: "Сума без ПДВ", key: "totalWithoutVat", type: "number", width: 16 },
        { header: "ПДВ 20%", key: "vat20", type: "number", width: 14 },
        { header: "Сума з ПДВ", key: "totalWithVat", type: "number", width: 16 },
      ],
      `contracts-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Contracts",
    );
  }, [rows, selectedIds]);

  const columns = useMemo<ColumnDef<ContractRow>[]>(
    () => [
      ...(canManageContracts
        ? [
            {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            aria-label="Вибрати всі договори на сторінці"
            checked={allVisibleSelected}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectedIds((prev) => {
                const next = { ...prev };
                for (const id of visibleIds) next[id] = checked;
                return next;
              });
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Вибрати договір ${row.original.number}`}
            checked={Boolean(selectedIds[row.original.id])}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectedIds((prev) => ({ ...prev, [row.original.id]: checked }));
            }}
          />
        ),
      } as ColumnDef<ContractRow>,
          ]
        : []),
      {
        id: "numberDate",
        header: "Номер / Дата",
        cell: ({ row }) => (
          <div className="grid gap-0.5">
            <span className="font-medium text-foreground">{row.original.number}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(row.original.date).toLocaleDateString("uk-UA")}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "workType",
        header: "Тип",
        cell: ({ row }) => (row.original.workType === "WORKS" ? "Роботи" : "Послуги"),
      },
      {
        id: "isSigned",
        header: () => (
          <span className="inline-flex items-center justify-center" title="Підписаний" aria-label="Підписаний">
            <FiCheckCircle aria-hidden="true" className="size-4" />
          </span>
        ),
        cell: ({ row }) =>
          row.original.isSigned ? (
            <span className="font-medium text-emerald-800">Так</span>
          ) : (
            <span className="text-muted-foreground">Ні</span>
          ),
      },
      {
        id: "isArchived",
        header: () => (
          <span className="inline-flex items-center justify-center" title="В архіві" aria-label="В архіві">
            <FiArchive aria-hidden="true" className="size-4" />
          </span>
        ),
        cell: ({ row }) =>
          row.original.isArchived ? (
            <span className="font-medium text-sky-900">Так</span>
          ) : (
            <span className="text-muted-foreground">Ні</span>
          ),
      },
      {
        id: "customer",
        header: "Замовник",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[16rem] text-foreground/90" title={row.original.customerCompanyShortName}>
            {row.original.customerCompanyShortName}
          </span>
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
          const rowBusy = paperPendingId === c.id || deletePendingId === c.id || duplicatePendingId === c.id;
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
                  <DetailRow label="Замовник" value={c.customerCompanyShortName} />
                  <DetailRow label="Виконавець" value={c.contractorCompanyShortName} />
                  <DetailRow label="Підписаний" value={c.isSigned ? "Так" : "Ні"} />
                  <DetailRow label="В архіві" value={c.isArchived ? "Так" : "Ні"} />
                  <DetailRow label="Місце" value={c.signingLocation} />
                  <DetailRow label="Позиції" value={c.lineItemsPreview} />
                  <DetailRow label="Разом (без ПДВ)" value={c.totalWithoutVat} />
                  <DetailRow label="ПДВ 20%" value={c.vat20} />
                  <DetailRow label="Разом з ПДВ" value={c.totalWithVat} />
                </div>
              </InfoDialog>
              {canGenerateDocuments ? (
                <>
                  <a
                    className={tableActionIconClassName}
                    href={`/api/documents/contract/${c.id}?variant=short`}
                    aria-label="Сформувати скорочений договір"
                    title="Сформувати скорочений договір"
                  >
                    <FiFileMinus aria-hidden="true" className="size-4" />
                  </a>
                  <a
                    className={tableActionIconClassName}
                    href={`/api/documents/contract/${c.id}?variant=full`}
                    aria-label="Сформувати повний договір"
                    title="Сформувати повний договір"
                  >
                    <FiFileText aria-hidden="true" className="size-4" />
                  </a>
                  <a
                    className={tableActionIconClassName}
                    href={`/contracts/${c.id}/scans`}
                    aria-label="Додати скан документа"
                    title="Додати скан документа"
                  >
                    <FiUpload aria-hidden="true" className="size-4" />
                  </a>
                </>
              ) : null}
              {canManageContracts ? (
                <a
                  className={tableActionIconClassName}
                  href={`/contracts/${c.id}/edit`}
                  aria-label="Редагувати договір"
                  title="Редагувати договір"
                >
                  <FiEdit2 aria-hidden="true" className="size-4" />
                </a>
              ) : null}
              {canGenerateAnalogue ? (
                <button
                  type="button"
                  className={tableActionIconClassName}
                  aria-label="Створити договір-аналог"
                  title="Згенерувати аналог"
                  disabled={rowBusy}
                  onClick={() => void applyDuplicateContract(c.id)}
                >
                  <FiCopy aria-hidden="true" className="size-4" />
                </button>
              ) : null}
              {canDeleteContracts ? (
                <button
                  type="button"
                  className={cn(
                    tableActionIconClassName,
                    "border-destructive/40 text-destructive hover:bg-destructive/10",
                  )}
                  aria-label="Видалити договір"
                  title="Видалити договір"
                  disabled={rowBusy}
                  onClick={() => setDeleteConfirm({ contractId: c.id, contractNumber: c.number })}
                >
                  <FiTrash2 aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [
      allVisibleSelected,
      canManageContracts,
      canDeleteContracts,
      canGenerateAnalogue,
      canGenerateDocuments,
      applyDuplicateContract,
      deletePendingId,
      duplicatePendingId,
      paperPendingId,
      selectedIds,
      visibleIds,
    ],
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
      id === "select" ||
      id === "customer" ||
      id === "lineItems" ||
      id === "isSigned" ||
      id === "isArchived"
    );
  }

  function getSortKeyByColumnId(columnId: string): SortBy | null {
    if (columnId === "numberDate") return "number";
    if (columnId === "workType") return "workType";
    if (columnId === "totalWithVat") return "totalWithVat";
    if (columnId === "number" || columnId === "date") return columnId;
    return null;
  }

  if (isDatabaseEmpty) {
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

      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => {
            if (deletePendingId) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (deletePendingId) e.preventDefault();
          }}
        >
          <DialogTitle>Видалити договір?</DialogTitle>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Договір № <span className="font-medium text-foreground">{deleteConfirm?.contractNumber}</span> буде
              видалено без можливості відновлення.
            </p>
            <p>Також буде видалено:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>усі рахунки, прив’язані до цього договору;</li>
              <li>усі акти приймання-передачі, пов’язані з цими рахунками;</li>
              <li>завантажені скани та інші файли в хмарному сховищі (Vercel Blob) для цих документів.</li>
            </ul>
            <p className="text-xs">
              Згенеровані .docx завантажуються з сервера за запитом і в окремому сховищі не зберігаються.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deletePendingId !== null}
              onClick={() => setDeleteConfirm(null)}
            >
              Скасувати
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePendingId !== null}
              onClick={() => void applyDeleteContract()}
            >
              {deletePendingId ? "Видалення…" : "Видалити назавжди"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ListPageToolbar
        queryInput={queryInput}
        onQueryChange={setQueryInput}
        searchPlaceholder="Пошук: номер, назва компанії, назва робіт/послуг"
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
              <Label className="text-muted-foreground">Підписаний</Label>
              <NativeSelect
                className="h-10 w-full min-w-[10rem] sm:w-auto"
                value={filterSigned ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({
                    signed: v === "yes" || v === "no" ? v : null,
                    page: 1,
                  });
                }}
              >
                <option value="">Усі</option>
                <option value="yes">Так</option>
                <option value="no">Ні</option>
              </NativeSelect>
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-sm">
              <Label className="text-muted-foreground">В архіві</Label>
              <NativeSelect
                className="h-10 w-full min-w-[10rem] sm:w-auto"
                value={filterArchived ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateParams({
                    archived: v === "yes" || v === "no" ? v : null,
                    page: 1,
                  });
                }}
              >
                <option value="">Усі</option>
                <option value="yes">Так</option>
                <option value="no">Ні</option>
              </NativeSelect>
            </div>
          </div>
        }
      />
      {canManageContracts ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Вибрано: <span className="font-medium text-foreground">{selectedCount}</span>
          </span>
          <Button type="button" variant="outline" disabled={selectedCount === 0} onClick={() => void exportSelectedToXlsx()}>
            <FiDownload aria-hidden="true" className="mr-2 size-4" />
            Експорт XLSX
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className={listTableHeaderClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className={contractsTableHeadClass(header.column.id)}>
                      {header.isPlaceholder ? null : isNonSortableColumn(header.column.id) ? (
                        <div className={`inline-flex items-center gap-1 ${header.column.id === "actions" ? "w-full justify-center" : ""}`}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${header.column.id === "actions" ? "w-full justify-center" : ""}`}
                          onClick={() => {
                            const sortKey = getSortKeyByColumnId(header.column.id);
                            if (!sortKey) return;
                            toggleSort(sortKey);
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {(() => {
                            const sortKey = getSortKeyByColumnId(header.column.id);
                            if (!sortKey || sortBy !== sortKey) return "";
                            return sortDir === "asc" ? "↑" : "↓";
                          })()}
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
            const rowBusy = paperPendingId === c.id || deletePendingId === c.id || duplicatePendingId === c.id;
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
                      <DetailRow label="Замовник" value={c.customerCompanyShortName} />
                      <DetailRow label="Виконавець" value={c.contractorCompanyShortName} />
                      <DetailRow label="Підписаний" value={c.isSigned ? "Так" : "Ні"} />
                      <DetailRow label="В архіві" value={c.isArchived ? "Так" : "Ні"} />
                      <DetailRow label="Місце" value={c.signingLocation} />
                      <DetailRow label="Позиції" value={c.lineItemsPreview} />
                      <DetailRow label="Разом (без ПДВ)" value={c.totalWithoutVat} />
                      <DetailRow label="ПДВ 20%" value={c.vat20} />
                      <DetailRow label="Разом з ПДВ" value={c.totalWithVat} />
                    </div>
                  </InfoDialog>
                  {canGenerateDocuments ? (
                    <>
                      <a
                        className={tableActionIconClassName}
                        href={`/api/documents/contract/${c.id}?variant=short`}
                        aria-label="Сформувати скорочений договір"
                        title="Сформувати скорочений договір"
                      >
                        <FiFileMinus aria-hidden="true" className="size-4" />
                      </a>
                      <a
                        className={tableActionIconClassName}
                        href={`/api/documents/contract/${c.id}?variant=full`}
                        aria-label="Сформувати повний договір"
                        title="Сформувати повний договір"
                      >
                        <FiFileText aria-hidden="true" className="size-4" />
                      </a>
                      <a
                        className={tableActionIconClassName}
                        href={`/contracts/${c.id}/scans`}
                        aria-label="Додати скан документа"
                        title="Додати скан документа"
                      >
                        <FiUpload aria-hidden="true" className="size-4" />
                      </a>
                    </>
                  ) : null}
                  {canManageContracts ? (
                    <a
                      className={tableActionIconClassName}
                      href={`/contracts/${c.id}/edit`}
                      aria-label="Редагувати договір"
                      title="Редагувати договір"
                    >
                      <FiEdit2 aria-hidden="true" className="size-4" />
                    </a>
                  ) : null}
                  {canGenerateAnalogue ? (
                    <button
                      type="button"
                      className={tableActionIconClassName}
                      aria-label="Створити договір-аналог"
                      title="Згенерувати аналог"
                      disabled={rowBusy}
                      onClick={() => void applyDuplicateContract(c.id)}
                    >
                      <FiCopy aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                  {canDeleteContracts ? (
                    <button
                      type="button"
                      className={cn(
                        tableActionIconClassName,
                        "border-destructive/40 text-destructive hover:bg-destructive/10",
                      )}
                      aria-label="Видалити договір"
                      title="Видалити договір"
                      disabled={rowBusy}
                      onClick={() => setDeleteConfirm({ contractId: c.id, contractNumber: c.number })}
                    >
                      <FiTrash2 aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
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
