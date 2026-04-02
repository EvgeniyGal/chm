"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";

type Props = {
  archiveGroup: () => Promise<void>;
  groupNumber: string;
};

export function ArchiveAttestationGroupButton({ archiveGroup, groupNumber }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      try {
        await archiveGroup();
        setOpen(false);
      } catch (e) {
        if (isNextNavigationError(e)) throw e;
        toast.error(getServerActionErrorMessage(e));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="rounded-md border border-destructive px-3 py-1.5 text-destructive"
        onClick={() => setOpen(true)}
      >
        Архівувати групу
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Архівувати групу?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Групу №{groupNumber} буде переміщено до архіву. Редагування групи та зварників після цього буде недоступне. Продовжити?
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Скасувати
            </button>
            <button
              type="button"
              className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:w-auto"
              onClick={() => void onConfirm()}
              disabled={isPending}
            >
              {isPending ? "Архівування…" : "Архівувати"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
