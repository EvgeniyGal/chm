"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

export function UnsavedChangesNavigationDialog({
  isDirty,
  suppressBeforeUnloadOnce,
}: {
  isDirty: boolean;
  suppressBeforeUnloadOnce: () => void;
}) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (!isDirty) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const a = target?.closest("a");
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!a.href || a.href === window.location.href) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(a.href);
      setOpen(true);
    };

    window.addEventListener("click", onClickCapture, true);
    return () => window.removeEventListener("click", onClickCapture, true);
  }, [isDirty]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-zinc-900">Незбережені зміни</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-700">
            Є незбережені зміни. Вийти зі сторінки без збереження?
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-zinc-50">
                Залишитись
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-9 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700"
                onClick={() => {
                  const href = pendingHref;
                  setPendingHref(null);
                  suppressBeforeUnloadOnce();
                  if (href) window.location.assign(href);
                }}
              >
                Вийти без збереження
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

