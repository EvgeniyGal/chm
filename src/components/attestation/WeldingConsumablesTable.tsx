"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, RotateCcw } from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { ArchiveSettingsRowConfirmDialog } from "@/components/attestation/ArchiveSettingsRowConfirmDialog";
import { listTableHeaderClass } from "@/components/data-table/list-styles";
import { WELDING_COATING_TYPES } from "@/lib/attestation/welding-consumable-coating-options";
import {
  archiveWeldingConsumableAction,
  restoreWeldingConsumableAction,
  updateWeldingConsumableAction,
} from "@/lib/attestation/welding-consumables-actions";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";

export type WeldingConsumableRow = {
  id: string;
  materialGrade: string;
  coatingType: string;
  isActive: boolean;
};

const iconBtn =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 dark:border-border dark:text-foreground dark:hover:bg-muted/60";
const iconBtnDanger =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10";
const iconBtnRestore =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-emerald-600/40 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-950/40";

export function WeldingConsumablesTable({ rows }: { rows: WeldingConsumableRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; materialGrade: string; coatingType: string } | null>(
    null,
  );
  const [archiving, setArchiving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function confirmArchive() {
    if (!archiveConfirm) return;
    setArchiving(true);
    try {
      const fd = new FormData();
      fd.set("id", archiveConfirm.id);
      await archiveWeldingConsumableAction(fd);
      toast.success("Запис архівовано.");
      setArchiveConfirm(null);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(getServerActionErrorMessage(e));
    } finally {
      setArchiving(false);
    }
  }

  async function restoreRow(id: string) {
    setRestoringId(id);
    try {
      const fd = new FormData();
      fd.set("id", id);
      await restoreWeldingConsumableAction(fd);
      toast.success("Запис відновлено з архіву.");
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(getServerActionErrorMessage(e));
    } finally {
      setRestoringId(null);
    }
  }

  const columns = useMemo<ColumnDef<WeldingConsumableRow>[]>(
    () => [
      {
        accessorKey: "materialGrade",
        header: "Марка",
        cell: ({ row }) => <span className="font-medium break-words">{row.original.materialGrade}</span>,
      },
      {
        accessorKey: "coatingType",
        header: "Покриття",
        cell: ({ row }) => <span>{row.original.coatingType}</span>,
      },
      {
        id: "status",
        accessorFn: (r) => (r.isActive ? "активний" : "архів"),
        header: "Статус",
        cell: ({ row }) => <span>{row.original.isActive ? "активний" : "архів"}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Дії</span>,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {r.isActive ? (
                <>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => setEditingId((id) => (id === r.id ? null : r.id))}
                    aria-label="Редагувати"
                    title="Редагувати"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconBtnDanger}
                    onClick={() =>
                      setArchiveConfirm({ id: r.id, materialGrade: r.materialGrade, coatingType: r.coatingType })
                    }
                    aria-label="Архівувати"
                    title="Архівувати"
                  >
                    <Archive className="size-4" aria-hidden />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={iconBtnRestore}
                  onClick={() => void restoreRow(r.id)}
                  disabled={restoringId === r.id}
                  aria-label="Відновити з архіву"
                  title="Відновити з архіву"
                >
                  <RotateCcw className="size-4" aria-hidden />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [restoringId],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function EditForm({ row }: { row: WeldingConsumableRow }) {
    return (
      <form
        className="flex flex-col gap-2"
        action={async (formData) => {
          try {
            await updateWeldingConsumableAction(formData);
            toast.success("Зміни збережено.");
            setEditingId(null);
            router.refresh();
          } catch (e) {
            toast.error(getServerActionErrorMessage(e));
          }
        }}
      >
        <input type="hidden" name="id" value={row.id} />
        <div className="text-xs font-medium text-foreground">Редагування зварювального матеріалу</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Марка</span>
            <input
              name="materialGrade"
              required
              defaultValue={row.materialGrade}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm dark:bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Тип покриття</span>
            <select
              name="coatingType"
              required
              defaultValue={row.coatingType}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm dark:bg-background"
            >
              {WELDING_COATING_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="crm-btn-primary h-9 px-3 text-sm">
            Зберегти
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
            onClick={() => setEditingId(null)}
          >
            Скасувати
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className={listTableHeaderClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-2 py-2 text-left">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <Fragment key={row.original.id}>
                  <tr className="border-b border-border">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-2 py-2 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {editingId === row.original.id ? (
                    <tr className="border-b border-border bg-muted/30">
                      <td colSpan={4} className="p-3">
                        <EditForm row={row.original} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const r = row.original;
          return (
            <Fragment key={r.id}>
              <div className="rounded-lg border border-border bg-card px-3 py-3 text-card-foreground shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="text-base font-semibold leading-tight break-words">{r.materialGrade}</div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Покриття</dt>
                      <dd>{r.coatingType}</dd>
                      <dt className="text-muted-foreground">Статус</dt>
                      <dd>{r.isActive ? "активний" : "архів"}</dd>
                    </dl>
                  </div>
                  <div className="flex shrink-0 flex-row flex-wrap items-start justify-end gap-1.5">
                    {r.isActive ? (
                      <>
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => setEditingId((id) => (id === r.id ? null : r.id))}
                          aria-label="Редагувати"
                          title="Редагувати"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={iconBtnDanger}
                          onClick={() =>
                            setArchiveConfirm({ id: r.id, materialGrade: r.materialGrade, coatingType: r.coatingType })
                          }
                          aria-label="Архівувати"
                          title="Архівувати"
                        >
                          <Archive className="size-4" aria-hidden />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={iconBtnRestore}
                        onClick={() => void restoreRow(r.id)}
                        disabled={restoringId === r.id}
                        aria-label="Відновити з архіву"
                        title="Відновити з архіву"
                      >
                        <RotateCcw className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                {editingId === r.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <EditForm row={r} />
                  </div>
                ) : null}
              </div>
            </Fragment>
          );
        })}
      </div>

      <ArchiveSettingsRowConfirmDialog
        open={archiveConfirm !== null}
        onOpenChange={(open) => !open && setArchiveConfirm(null)}
        title="Архівувати зварювальний матеріал?"
        message={
          archiveConfirm
            ? `Марка «${archiveConfirm.materialGrade}», покриття ${archiveConfirm.coatingType} — запис буде приховано з активного довідника.`
            : ""
        }
        archiving={archiving}
        onConfirm={confirmArchive}
      />
    </>
  );
}
