"use client";

import { Award, Copy, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { WelderListConfirmDialog } from "@/components/attestation/WelderListConfirmDialog";
import { tableActionIconClassName } from "@/components/data-table/list-styles";
import { deleteWelderAction } from "@/lib/attestation/delete-welder-action";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";
import { cn } from "@/lib/utils";

const iconDestructiveClassName = cn(
  tableActionIconClassName,
  "border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive",
);

export function WelderListRowActions({
  welderId,
  groupStatus,
}: {
  welderId: string;
  groupStatus: string;
}) {
  const router = useRouter();
  const canMutate = groupStatus !== "completed" && groupStatus !== "archived";

  const [dupOpen, setDupOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function confirmDelete() {
    const fd = new FormData();
    fd.set("welderId", welderId);
    setDeletePending(true);
    try {
      await deleteWelderAction(fd);
    } catch (e) {
      if (isNextNavigationError(e)) {
        setDelOpen(false);
        return;
      }
      toast.error(getServerActionErrorMessage(e));
    } finally {
      setDeletePending(false);
    }
  }

  function confirmDuplicate() {
    setDupOpen(false);
    router.push(`/attestation/welders/new?from=${welderId}`);
  }

  return (
    <>
      <div className="flex flex-nowrap items-center justify-end gap-1">
        <button
          type="button"
          className={tableActionIconClassName}
          title="Новий запис за шаблоном (ПІБ, стаж і компанію ввести заново; група — лише якщо активна)"
          aria-label="Дублювати як новий запис"
          onClick={() => setDupOpen(true)}
        >
          <Copy className="size-4 shrink-0" aria-hidden />
        </button>
        <a
          className={tableActionIconClassName}
          href={`/api/attestation/documents/protocol?welderId=${welderId}`}
          title="Згенерувати протокол"
          aria-label="Згенерувати протокол"
        >
          <FileText className="size-4 shrink-0" aria-hidden />
        </a>
        <a
          className={tableActionIconClassName}
          href={`/api/attestation/documents/certificate?welderId=${welderId}`}
          title="Згенерувати посвідчення"
          aria-label="Згенерувати посвідчення"
        >
          <Award className="size-4 shrink-0" aria-hidden />
        </a>
        {canMutate ? (
          <Link
            className={tableActionIconClassName}
            href={`/attestation/welders/${welderId}/edit`}
            title="Редагувати атестацію"
            aria-label="Редагувати атестацію"
          >
            <Pencil className="size-4 shrink-0" aria-hidden />
          </Link>
        ) : null}
        {canMutate ? (
          <button
            type="button"
            className={iconDestructiveClassName}
            title="Видалити запис атестації"
            aria-label="Видалити запис атестації"
            onClick={() => setDelOpen(true)}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
          </button>
        ) : null}
      </div>

      <WelderListConfirmDialog
        open={dupOpen}
        onOpenChange={setDupOpen}
        title="Створити новий запис за шаблоном?"
        message="Відкриється форма нової атестації з копією технічних даних цього запису. Прізвище, імʼя, по батькові, місце народження, дати, попереднє посвідчення, стаж і компанію потрібно буде ввести заново. Група підставиться лише якщо вона в статусі «Активна»."
        confirmLabel="Продовжити"
        onConfirm={confirmDuplicate}
      />

      <WelderListConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Видалити запис атестації?"
        message="Запис буде видалено безповоротно. Номери інших зварників у групі не змінюються; вільний номер згодом займе новий запис."
        confirmLabel="Видалити"
        confirmVariant="destructive"
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
