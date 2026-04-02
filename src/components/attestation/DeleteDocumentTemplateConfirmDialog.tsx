"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  deleting: boolean;
  onConfirm: () => void | Promise<void>;
};

export function DeleteDocumentTemplateConfirmDialog({
  open,
  onOpenChange,
  templateName,
  deleting,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Видалити шаблон?</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Шаблон «{templateName}» буде видалено зі сховища. Продовжити?
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Скасувати
          </button>
          <button
            type="button"
            className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:w-auto"
            onClick={() => void onConfirm()}
            disabled={deleting}
          >
            {deleting ? "Видалення…" : "Видалити"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
