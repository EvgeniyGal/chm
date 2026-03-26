"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FiTrash2 } from "react-icons/fi";

export function DeleteOptionButton({
  disabled,
  optionLabel,
  onConfirm,
}: {
  disabled: boolean;
  optionLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          aria-label="Видалити вибраний варіант"
          title="Видалити вибраний варіант"
          disabled={disabled}
        >
          <FiTrash2 className="size-4" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-zinc-900">Підтвердження видалення</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-700">
            Ви дійсно хочете видалити варіант "{optionLabel}"? Цю дію не можна скасувати.
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-zinc-50">
                Скасувати
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-9 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700"
                onClick={onConfirm}
              >
                Видалити
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

