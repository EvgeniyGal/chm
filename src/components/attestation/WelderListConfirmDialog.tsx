"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function WelderListConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel = "Скасувати",
  pending,
  confirmVariant = "default",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md px-4 text-sm font-medium text-white shadow-sm disabled:opacity-50 sm:w-auto",
              confirmVariant === "destructive"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary/90",
            )}
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending ? "Зачекайте…" : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
