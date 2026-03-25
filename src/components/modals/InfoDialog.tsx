"use client";

import * as Dialog from "@radix-ui/react-dialog";

export function InfoDialog({
  title,
  triggerLabel = "Info",
  children,
}: {
  title: string;
  triggerLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="underline">
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-sm font-semibold text-zinc-900">{title}</Dialog.Title>
            <Dialog.Close className="rounded-md border px-2 py-1 text-xs">Закрити</Dialog.Close>
          </div>
          <div className="mt-3 text-sm text-zinc-800">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

