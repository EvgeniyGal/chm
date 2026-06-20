"use client";

import { FiCopy, FiFileText, FiTrash2, FiUpload } from "react-icons/fi";

import { TableActionButton } from "@/components/data-table/table-action-button";
import { cn } from "@/lib/utils";

export function InvoiceRowActions({
  invoiceId,
  invoiceNumber,
  origin,
  rowBusy,
  duplicatePendingId,
  canGenerateDocuments,
  canGenerateAnalogue,
  canManageInvoices,
  onDuplicate,
  onDeleteConfirm,
}: {
  invoiceId: string;
  invoiceNumber: string;
  origin: string;
  rowBusy: boolean;
  duplicatePendingId: string | null;
  canGenerateDocuments: boolean;
  canGenerateAnalogue: boolean;
  canManageInvoices: boolean;
  onDuplicate: (invoiceId: string) => void;
  onDeleteConfirm: (confirm: { id: string; number: string }) => void;
}) {
  return (
    <>
      {canGenerateDocuments ? (
        <>
          <TableActionButton
            href={`/api/documents/invoice/${invoiceId}`}
            aria-label="Сформувати рахунок"
            title="Сформувати рахунок"
          >
            <FiFileText aria-hidden="true" className="size-4" />
          </TableActionButton>
          <TableActionButton
            href={`/invoices/${invoiceId}/scans`}
            aria-label="Додати скан документа"
            title="Додати скан документа"
          >
            <FiUpload aria-hidden="true" className="size-4" />
          </TableActionButton>
        </>
      ) : null}
      {canGenerateAnalogue && origin !== "contract" ? (
        <TableActionButton
          aria-label="Створити рахунок-аналог"
          title="Згенерувати аналог"
          disabled={rowBusy}
          loading={duplicatePendingId === invoiceId}
          onClick={() => onDuplicate(invoiceId)}
        >
          <FiCopy aria-hidden="true" className="size-4" />
        </TableActionButton>
      ) : null}
      {canManageInvoices ? (
        <TableActionButton
          className={cn(
            "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40",
          )}
          aria-label="Видалити рахунок"
          title="Видалити"
          onClick={() => onDeleteConfirm({ id: invoiceId, number: invoiceNumber })}
          disabled={rowBusy}
        >
          <FiTrash2 aria-hidden="true" className="size-4" />
        </TableActionButton>
      ) : null}
    </>
  );
}
