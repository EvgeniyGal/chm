"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteCompanyTextButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Не вдалося видалити компанію.");
        return;
      }
      toast.success("Компанію видалено.");
      router.push("/companies");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-md border border-red-300 px-4 text-sm text-red-700 hover:bg-red-50"
        >
          Видалити
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-zinc-900">Видалення компанії</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-700">
            Ви дійсно хочете видалити компанію "{companyName}"? Цю дію не можна скасувати.
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
                disabled={busy}
                onClick={onDelete}
                className="h-9 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700 disabled:opacity-50"
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

