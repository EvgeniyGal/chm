"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

export function UnsavedChangesNavigationDialog({
  isDirty,
  suppressBeforeUnloadOnce,
  onSaveAndProceed,
}: {
  isDirty: boolean;
  suppressBeforeUnloadOnce: () => void;
  onSaveAndProceed?: () => Promise<void> | void;
}) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      // Ignore explicit download links and temporary blob/data links used for file export.
      if (a.hasAttribute("download")) return;
      if (href.startsWith("blob:") || href.startsWith("data:")) return;
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
          <Dialog.Title className="text-sm font-semibold text-foreground">Незбережені зміни</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-700">
            Є незбережені зміни. Вийти зі сторінки без збереження?
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={saving}
                className="min-h-9 w-full rounded-md border px-3 text-center text-sm leading-tight hover:bg-zinc-50 whitespace-normal disabled:opacity-60"
              >
                Залишитись
              </button>
            </Dialog.Close>
            {onSaveAndProceed ? (
              <button
                type="button"
                disabled={saving}
                className="min-h-9 w-full rounded-md border border-emerald-600 bg-emerald-600 px-3 text-center text-sm leading-tight text-white hover:bg-emerald-700 whitespace-normal disabled:opacity-60"
                onClick={async () => {
                  if (!pendingHref) return;
                  setSaving(true);
                  try {
                    await onSaveAndProceed();
                    const href = pendingHref;
                    setPendingHref(null);
                    suppressBeforeUnloadOnce();
                    window.location.assign(href);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Збереження…" : "Зберегти та перейти"}
              </button>
            ) : null}
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={saving}
                className="min-h-9 w-full rounded-md bg-red-600 px-3 text-center text-sm leading-tight text-white hover:bg-red-700 whitespace-normal disabled:opacity-60"
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

