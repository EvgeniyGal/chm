"use client";

import {
  FiArchive,
  FiCheckCircle,
  FiCopy,
  FiFileMinus,
  FiFileText,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";

import { TableActionButton } from "@/components/data-table/table-action-button";
import { cn } from "@/lib/utils";

type ContractRow = {
  id: string;
  number: string;
  isSigned: boolean;
  isArchived: boolean;
};

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

export function ContractRowActions({
  contract: c,
  rowBusy,
  paperPendingId,
  duplicatePendingId,
  canGenerateDocuments,
  canGenerateAnalogue,
  canDeleteContracts,
  deletePendingId,
  onPaperConfirm,
  onDuplicate,
  onDeleteConfirm,
}: {
  contract: ContractRow;
  rowBusy: boolean;
  paperPendingId: string | null;
  duplicatePendingId: string | null;
  canGenerateDocuments: boolean;
  canGenerateAnalogue: boolean;
  canDeleteContracts: boolean;
  deletePendingId: string | null;
  onPaperConfirm: (confirm: PaperConfirm) => void;
  onDuplicate: (contractId: string) => void;
  onDeleteConfirm: (confirm: DeleteConfirm) => void;
}) {
  return (
    <>
      <TableActionButton
        className={cn(c.isSigned && "border-emerald-600/60 bg-emerald-50 text-emerald-900")}
        aria-label={c.isSigned ? "Зняти статус «підписаний»" : "Позначити як підписаний"}
        title={c.isSigned ? "Зняти «підписаний»" : "Підписаний"}
        disabled={rowBusy}
        loading={paperPendingId === c.id}
        onClick={() =>
          onPaperConfirm({
            contractId: c.id,
            contractNumber: c.number,
            field: "isSigned",
            nextValue: !c.isSigned,
          })
        }
      >
        <FiCheckCircle aria-hidden="true" className="size-4" />
      </TableActionButton>
      <TableActionButton
        className={cn(c.isArchived && "border-sky-600/60 bg-sky-50 text-sky-900")}
        aria-label={c.isArchived ? "Зняти з архіву" : "Позначити як в архіві"}
        title={c.isArchived ? "Зняти «в архіві»" : "В архіві"}
        disabled={rowBusy}
        loading={paperPendingId === c.id}
        onClick={() =>
          onPaperConfirm({
            contractId: c.id,
            contractNumber: c.number,
            field: "isArchived",
            nextValue: !c.isArchived,
          })
        }
      >
        <FiArchive aria-hidden="true" className="size-4" />
      </TableActionButton>
      {canGenerateDocuments ? (
        <>
          <TableActionButton
            href={`/api/documents/contract/${c.id}?variant=short`}
            aria-label="Сформувати скорочений договір"
            title="Сформувати скорочений договір"
          >
            <FiFileMinus aria-hidden="true" className="size-4" />
          </TableActionButton>
          <TableActionButton
            href={`/api/documents/contract/${c.id}?variant=full`}
            aria-label="Сформувати повний договір"
            title="Сформувати повний договір"
          >
            <FiFileText aria-hidden="true" className="size-4" />
          </TableActionButton>
          <TableActionButton
            href={`/contracts/${c.id}/scans`}
            aria-label="Додати скан документа"
            title="Додати скан документа"
          >
            <FiUpload aria-hidden="true" className="size-4" />
          </TableActionButton>
        </>
      ) : null}
      {canGenerateAnalogue ? (
        <TableActionButton
          aria-label="Створити договір-аналог"
          title="Згенерувати аналог"
          disabled={rowBusy}
          loading={duplicatePendingId === c.id}
          onClick={() => onDuplicate(c.id)}
        >
          <FiCopy aria-hidden="true" className="size-4" />
        </TableActionButton>
      ) : null}
      {canDeleteContracts ? (
        <TableActionButton
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
          aria-label="Видалити договір"
          title="Видалити договір"
          disabled={rowBusy}
          loading={deletePendingId === c.id}
          onClick={() => onDeleteConfirm({ contractId: c.id, contractNumber: c.number })}
        >
          <FiTrash2 aria-hidden="true" className="size-4" />
        </TableActionButton>
      ) : null}
    </>
  );
}
