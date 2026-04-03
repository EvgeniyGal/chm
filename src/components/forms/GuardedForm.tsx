"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { type ComponentPropsWithoutRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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

export type GuardedFormHandle = {
  /** Після успішного програмного збереження оновити «чистий» знімок форми (щоб не лишався прапор незбережених змін). */
  markClean: () => void;
};

type GuardedFormProps = {
  /** Server actions можуть повертати `{ welderId }` при `_skipRedirect` (ігнорується формою). */
  action: (formData: FormData) => void | Promise<void | { welderId: string }>;
  className?: string;
  children: React.ReactNode;
  successMessage?: string;
  /** Після успішного submit очистити поля (для форм «додати рядок»). */
  resetOnSuccess?: boolean;
  /** Якщо `true`, у діалозі показується «Зберегти та перейти» — server action має ігнорувати `redirect`, коли в FormData є `_skipRedirect=1`. */
  enableSaveAndProceed?: boolean;
  /** Атрибути для кореневого `<form>` (наприклад `id`, `data-*`), без `action` / `onSubmit` / `className`. */
  formProps?: Omit<
    ComponentPropsWithoutRef<"form">,
    "action" | "children" | "className" | "onInputCapture" | "onChangeCapture" | "onSubmit" | "ref"
  >;
};

export const GuardedForm = forwardRef<GuardedFormHandle, GuardedFormProps>(function GuardedForm(
  { action, className, children, successMessage, resetOnSuccess, enableSaveAndProceed, formProps },
  ref,
) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const initialSnapshotRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const suppressBeforeUnloadOnce = useUnsavedChangesGuard(isDirty);

  useImperativeHandle(ref, () => ({
    markClean: () => {
      const form = formRef.current;
      if (!form) return;
      initialSnapshotRef.current = snapshotForm(form);
      setIsDirty(false);
    },
  }));

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
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest("a");
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
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
    <>
      <form
        ref={formRef}
        {...formProps}
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          try {
            await action(formData);
            const form = e.currentTarget;
            if (resetOnSuccess) {
              form.reset();
              initialSnapshotRef.current = snapshotForm(form);
            }
            setIsDirty(false);
            if (successMessage) toast.success(successMessage);
          } catch (err) {
            if (isNextNavigationError(err)) {
              if (successMessage) toast.success(successMessage);
              setIsDirty(false);
              throw err;
            }
            toast.error(getServerActionErrorMessage(err));
            // Без атрибута action: React не скидає форму; без повторного throw — немає runtime overlay.
          }
        }}
        className={className}
        onInputCapture={recalcDirty}
        onChangeCapture={recalcDirty}
      >
        {children}
      </form>

      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPendingHref(null);
        }}
      >
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
                  className="min-h-9 w-full rounded-md border px-3 text-center text-sm leading-tight whitespace-normal hover:bg-zinc-50 disabled:opacity-60"
                >
                  Залишитись
                </button>
              </Dialog.Close>
              {enableSaveAndProceed ? (
                <button
                  type="button"
                  disabled={saving}
                  className="min-h-9 w-full rounded-md border border-emerald-600 bg-emerald-600 px-3 text-center text-sm leading-tight text-white whitespace-normal hover:bg-emerald-700 disabled:opacity-60"
                  onClick={async () => {
                    const form = formRef.current;
                    if (!form || !pendingHref) return;
                    if (!form.checkValidity()) {
                      form.reportValidity();
                      toast.error("Заповніть обов’язкові поля перед збереженням.");
                      return;
                    }
                    setSaving(true);
                    try {
                      const fd = new FormData(form);
                      fd.set("_skipRedirect", "1");
                      await action(fd);
                      if (initialSnapshotRef.current !== null) {
                        initialSnapshotRef.current = snapshotForm(form);
                      }
                      setIsDirty(false);
                      const href = pendingHref;
                      setPendingHref(null);
                      setOpen(false);
                      if (successMessage) toast.success(successMessage);
                      suppressBeforeUnloadOnce();
                      window.location.assign(href);
                    } catch (err) {
                      if (isNextNavigationError(err)) {
                        return;
                      }
                      toast.error(getServerActionErrorMessage(err));
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
                  className="min-h-9 w-full rounded-md bg-red-600 px-3 text-center text-sm leading-tight text-white whitespace-normal hover:bg-red-700 disabled:opacity-60"
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
});

