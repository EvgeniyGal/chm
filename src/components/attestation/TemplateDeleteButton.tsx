"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const deleteIconBtn =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-40 dark:border-destructive/50 dark:hover:bg-destructive/15";

export function TemplateDeleteButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    setPending(true);
    try {
      const res = await fetch(`/api/attestation/templates/${templateId}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          j.error === "CANNOT_DELETE_ACTIVE_TEMPLATE" ? "Не можна видалити активний шаблон" : "Помилка видалення",
        );
        return;
      }
      toast.success("Шаблон видалено");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={deleteIconBtn}
        title="Видалити шаблон"
        aria-label="Видалити шаблон"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(420px,calc(100vw-24px))]">
          <DialogTitle>Видалити шаблон?</DialogTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Буде видалено «{templateName.trim() || "шаблон"}» зі сховища. Цю дію не можна скасувати.
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              disabled={pending}
              className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted/60 disabled:opacity-60"
              onClick={() => setOpen(false)}
            >
              Скасувати
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              onClick={() => void confirmDelete()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Видалити
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
