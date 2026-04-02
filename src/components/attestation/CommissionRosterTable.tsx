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

import { ArchiveCommissionConfirmDialog } from "@/components/attestation/ArchiveCommissionConfirmDialog";
import { listTableHeaderClass } from "@/components/data-table/list-styles";
import { commissionMemberRoleLabelUk } from "@/lib/attestation/commission-member-labels";
import {
  archiveCommissionMemberAction,
  restoreCommissionMemberAction,
  updateCommissionMemberAction,
} from "@/lib/attestation/commission-roster-actions";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";

export type CommissionRosterRow = {
  id: string;
  fullName: string;
  position: string | null;
  role: string;
  isActive: boolean;
};

/** Matches CommissionGroupPickers “Керувати списком” icon button */
const iconBtn =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50";
const iconBtnDanger =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10";
const iconBtnRestore =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-emerald-600/40 text-emerald-800 hover:bg-emerald-50";

export function CommissionRosterTable({
  rosterRows,
  onRequestArchive,
}: {
  rosterRows: CommissionRosterRow[];
  /** When set (e.g. from CommissionManageDialog), archive confirm is shown by parent — avoids nested Radix dialogs. */
  onRequestArchive?: (member: { id: string; fullName: string }) => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; fullName: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function confirmArchive() {
    if (!archiveConfirm) return;
    setArchiving(true);
    try {
      const fd = new FormData();
      fd.set("id", archiveConfirm.id);
      await archiveCommissionMemberAction(fd);
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

  async function restoreMember(id: string) {
    setRestoringId(id);
    try {
      const fd = new FormData();
      fd.set("id", id);
      await restoreCommissionMemberAction(fd);
      toast.success("Запис відновлено з архіву.");
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(getServerActionErrorMessage(e));
    } finally {
      setRestoringId(null);
    }
  }

  const columns = useMemo<ColumnDef<CommissionRosterRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "ПІБ",
        cell: ({ row }) => <span>{row.original.fullName}</span>,
      },
      {
        accessorKey: "position",
        header: "Посада",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.position?.trim() ? row.original.position : "—"}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Роль",
        cell: ({ row }) => <span>{commissionMemberRoleLabelUk(row.original.role)}</span>,
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
          const m = row.original;
          return (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {m.isActive ? (
                <>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => setEditingId((id) => (id === m.id ? null : m.id))}
                    aria-label="Редагувати"
                    title="Редагувати"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconBtnDanger}
                    onClick={() =>
                      onRequestArchive
                        ? onRequestArchive({ id: m.id, fullName: m.fullName })
                        : setArchiveConfirm({ id: m.id, fullName: m.fullName })
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
                  onClick={() => void restoreMember(m.id)}
                  disabled={restoringId === m.id}
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
    [onRequestArchive, restoringId],
  );

  const table = useReactTable({
    data: rosterRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function EditForm({ m }: { m: CommissionRosterRow }) {
    return (
      <form
        className="flex flex-col gap-2"
        action={async (formData) => {
          try {
            await updateCommissionMemberAction(formData);
            toast.success("Зміни збережено.");
            setEditingId(null);
            router.refresh();
          } catch (e) {
            toast.error(getServerActionErrorMessage(e));
          }
        }}
      >
        <input type="hidden" name="id" value={m.id} />
        <div className="text-xs font-medium text-foreground">Редагування</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">ПІБ</span>
            <input
              name="fullName"
              required
              defaultValue={m.fullName}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Посада</span>
            <input
              name="position"
              defaultValue={m.position ?? ""}
              placeholder="Для протоколу"
              className="h-10 rounded-md border border-border bg-white px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Роль</span>
            <select
              name="role"
              defaultValue={m.role}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="member">Член комісії</option>
              <option value="head">Голова комісії</option>
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
          <table className="w-full min-w-[520px] border-collapse text-sm">
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
                      <td colSpan={5} className="p-3">
                        <EditForm m={row.original} />
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
          const m = row.original;
          return (
            <Fragment key={m.id}>
              <div className="rounded-lg border border-border bg-card px-3 py-3 text-card-foreground shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="text-base font-semibold leading-tight">{m.fullName}</div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Посада</dt>
                      <dd className="break-words">{m.position?.trim() ? m.position : "—"}</dd>
                      <dt className="text-muted-foreground">Роль</dt>
                      <dd>{commissionMemberRoleLabelUk(m.role)}</dd>
                      <dt className="text-muted-foreground">Статус</dt>
                      <dd>{m.isActive ? "активний" : "архів"}</dd>
                    </dl>
                  </div>
                  <div className="flex shrink-0 flex-row flex-wrap items-start justify-end gap-1.5">
                    {m.isActive ? (
                      <>
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => setEditingId((id) => (id === m.id ? null : m.id))}
                          aria-label="Редагувати"
                          title="Редагувати"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={iconBtnDanger}
                          onClick={() =>
                            onRequestArchive
                              ? onRequestArchive({ id: m.id, fullName: m.fullName })
                              : setArchiveConfirm({ id: m.id, fullName: m.fullName })
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
                        onClick={() => void restoreMember(m.id)}
                        disabled={restoringId === m.id}
                        aria-label="Відновити з архіву"
                        title="Відновити з архіву"
                      >
                        <RotateCcw className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                {editingId === m.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <EditForm m={m} />
                  </div>
                ) : null}
              </div>
            </Fragment>
          );
        })}
      </div>

      {onRequestArchive ? null : (
        <ArchiveCommissionConfirmDialog
          open={archiveConfirm !== null}
          onOpenChange={(open) => !open && setArchiveConfirm(null)}
          fullName={archiveConfirm?.fullName ?? ""}
          archiving={archiving}
          onConfirm={confirmArchive}
        />
      )}
    </>
  );
}
