"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteDocumentTemplateConfirmDialog } from "@/components/attestation/DeleteDocumentTemplateConfirmDialog";

const iconBtn =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-border dark:text-foreground dark:hover:bg-muted/60";
const iconBtnDanger =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-40";

export function TemplateRowActions({
  templateId,
  initialName,
  isActive,
}: {
  templateId: string;
  initialName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function confirmDelete() {
    setPendingDelete(true);
    try {
      const res = await fetch(`/api/attestation/templates/${templateId}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          j.error === "CANNOT_DELETE_ACTIVE_TEMPLATE" ? "Не можна видалити активний шаблон" : "Помилка видалення",
        );
        return;
      }
      toast.success("Видалено");
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setPendingDelete(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 max-w-[180px] rounded border border-border px-2 text-sm"
        aria-label="Назва шаблону"
      />
      <button
        type="button"
        disabled={pending || pendingDelete || name.trim() === "" || name.trim() === initialName}
        className={iconBtn}
        title="Зберегти назву"
        aria-label="Зберегти назву"
        onClick={async () => {
          setPending(true);
          try {
            const res = await fetch(`/api/attestation/templates/${templateId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim() }),
            });
            if (!res.ok) {
              toast.error("Не вдалося перейменувати");
              return;
            }
            toast.success("Назву оновлено");
            router.refresh();
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
      </button>
      {!isActive ? (
        <button
          type="button"
          disabled={pending || pendingDelete}
          className={iconBtnDanger}
          title="Видалити"
          aria-label="Видалити"
          onClick={() => setDeleteOpen(true)}
        >
          {pendingDelete ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        </button>
      ) : null}
      <DeleteDocumentTemplateConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        templateName={name.trim() || initialName}
        deleting={pendingDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
