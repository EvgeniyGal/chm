"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";

function snapshotForm(form: HTMLFormElement) {
  const entries = Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)] as const);
  entries.sort(([ka, va], [kb, vb]) => {
    if (ka === kb) return va.localeCompare(vb);
    return ka.localeCompare(kb);
  });
  return JSON.stringify(entries);
}

export function GuardedForm({
  action,
  className,
  children,
  successMessage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
  successMessage?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const initialSnapshotRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const suppressBeforeUnloadOnce = useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    initialSnapshotRef.current = snapshotForm(form);
  }, []);

  function recalcDirty() {
    const form = formRef.current;
    if (!form || !initialSnapshotRef.current) return;
    setIsDirty(snapshotForm(form) !== initialSnapshotRef.current);
  }

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (!isDirty) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest("a");
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(a.href);
      setOpen(true);
    };

    window.addEventListener("click", onClickCapture, true);
    return () => window.removeEventListener("click", onClickCapture, true);
  }, [isDirty]);

  return (
    <>
      <form
        ref={formRef}
        action={async (formData) => {
          try {
            await action(formData);
            setIsDirty(false);
            if (successMessage) toast.success(successMessage);
          } catch (e) {
            if (isNextNavigationError(e)) {
              if (successMessage) toast.success(successMessage);
              setIsDirty(false);
              throw e;
            }
            toast.error(getServerActionErrorMessage(e));
          }
        }}
        className={className}
        onInputCapture={recalcDirty}
        onChangeCapture={recalcDirty}
      >
        {children}
      </form>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-foreground">Незбережені зміни</Dialog.Title>
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
                    setIsDirty(false);
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
    </>
  );
}

