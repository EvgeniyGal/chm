"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  name: string;
  archiving: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ArchiveRegulatoryConfirmDialog({
  open,
  onOpenChange,
  code,
  name,
  archiving,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Архівувати нормативний документ?</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Запис «{code}» — {name} — буде приховано з активного довідника. Продовжити?
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={archiving}
          >
            Скасувати
          </button>
          <button
            type="button"
            className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:w-auto"
            onClick={() => void onConfirm()}
            disabled={archiving}
          >
            {archiving ? "Архівування…" : "Архівувати"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
