"use client";

import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function InfoDialog({
  title,
  triggerLabel = "Info",
  trigger,
  triggerAriaLabel,
  triggerClassName,
  children,
}: {
  title: string;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName ?? "underline"} aria-label={triggerAriaLabel}>
          {trigger ?? triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex items-start justify-between gap-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted">
            Закрити
          </DialogClose>
        </div>
        <div className="mt-3 text-sm text-foreground/90">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
