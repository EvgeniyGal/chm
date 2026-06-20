"use client";

import { FiArchive, FiCheckCircle, FiFileText, FiTrash2, FiUpload } from "react-icons/fi";

import { TableActionButton } from "@/components/data-table/table-action-button";
import { cn } from "@/lib/utils";

type PaperConfirm = {
  actId: string;
  actNumber: string;
  field: "isSigned" | "isArchived";
  nextValue: boolean;
};

export function AcceptanceActRowActions({
  act,
  rowBusy,
  paperPendingId,
  deleteLoading,
  canGenerateDocuments,
  canManageActs,
  onPaperConfirm,
  onDeleteConfirm,
}: {
  act: { id: string; number: string; isSigned: boolean; isArchived: boolean };
  rowBusy: boolean;
  paperPendingId: string | null;
  deleteLoading: boolean;
  canGenerateDocuments: boolean;
  canManageActs: boolean;
  onPaperConfirm: (confirm: PaperConfirm) => void;
  onDeleteConfirm: (confirm: { id: string; number: string }) => void;
}) {
  return (
    <>
      <TableActionButton
        className={cn(act.isSigned && "border-emerald-600/60 bg-emerald-50 text-emerald-900")}
        aria-label={act.isSigned ? "Зняти статус «підписаний»" : "Позначити як підписаний"}
        title={act.isSigned ? "Зняти «підписаний»" : "Підписаний"}
        disabled={rowBusy}
        loading={paperPendingId === act.id}
        onClick={() =>
          onPaperConfirm({
            actId: act.id,
            actNumber: act.number,
            field: "isSigned",
            nextValue: !act.isSigned,
          })
        }
      >
        <FiCheckCircle aria-hidden="true" className="size-4" />
      </TableActionButton>
      <TableActionButton
        className={cn(act.isArchived && "border-sky-600/60 bg-sky-50 text-sky-900")}
        aria-label={act.isArchived ? "Зняти з архіву" : "Позначити як в архіві"}
        title={act.isArchived ? "Зняти «в архіві»" : "В архіві"}
        disabled={rowBusy}
        loading={paperPendingId === act.id}
        onClick={() =>
          onPaperConfirm({
            actId: act.id,
            actNumber: act.number,
            field: "isArchived",
            nextValue: !act.isArchived,
          })
        }
      >
        <FiArchive aria-hidden="true" className="size-4" />
      </TableActionButton>
      {canGenerateDocuments ? (
        <>
          <TableActionButton
            href={`/api/documents/acceptance-act/${act.id}`}
            aria-label="Сформувати акт"
            title="Сформувати акт"
          >
            <FiFileText aria-hidden="true" className="size-4" />
          </TableActionButton>
          <TableActionButton
            href={`/acceptance-acts/${act.id}/scans`}
            aria-label="Додати скан документа"
            title="Додати скан документа"
          >
            <FiUpload aria-hidden="true" className="size-4" />
          </TableActionButton>
        </>
      ) : null}
      {canManageActs ? (
        <TableActionButton
          className={cn(
            "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40",
          )}
          aria-label="Видалити акт"
          title="Видалити"
          disabled={rowBusy}
          loading={deleteLoading}
          onClick={() => onDeleteConfirm({ id: act.id, number: act.number })}
        >
          <FiTrash2 aria-hidden="true" className="size-4" />
        </TableActionButton>
      ) : null}
    </>
  );
}
