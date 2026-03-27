"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { DROPDOWN_SCOPE } from "@/lib/dropdown-scopes";

function sortUa(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk"));
}

export function ManageLineItemUnitsDialog({
  open,
  onOpenChange,
  optionsFromBackend,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  optionsFromBackend: string[];
}) {
  const [list, setList] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setList(sortUa([...new Set(optionsFromBackend.map((v) => v.trim()).filter(Boolean))]));
      setNewValue("");
      setError(null);
    }
  }, [open, optionsFromBackend]);

  async function addUnit() {
    const v = newValue.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/dropdown-options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: DROPDOWN_SCOPE.LINE_ITEM_UNIT, value: v }),
    });
    setBusy(false);
    if (!res.ok) {
      const msg = "Не вдалося зберегти.";
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success("Одиницю додано.");
    setList((prev) => sortUa([...new Set([...prev, v])]));
    setNewValue("");
    window.dispatchEvent(
      new CustomEvent("dropdown-options:changed", {
        detail: { scope: DROPDOWN_SCOPE.LINE_ITEM_UNIT, action: "add", value: v },
      }),
    );
  }

  async function removeUnit(value: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/dropdown-options", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: DROPDOWN_SCOPE.LINE_ITEM_UNIT, value }),
    });
    setBusy(false);
    if (!res.ok) {
      const msg = "Не вдалося видалити.";
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success("Одиницю видалено зі списку.");
    setList((prev) => prev.filter((x) => x !== value));
    window.dispatchEvent(
      new CustomEvent("dropdown-options:changed", {
        detail: { scope: DROPDOWN_SCOPE.LINE_ITEM_UNIT, action: "delete", value },
      }),
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[min(85vh,calc(100vh-24px))] w-[min(480px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-4 shadow-lg outline-none">
          <Dialog.Title className="text-lg font-semibold text-zinc-900">Одиниці виміру</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-zinc-600">
            Додавайте типові одиниці для рядків таблиці. Видалення прибирає варіант зі списку (не з уже збережених документів).
          </Dialog.Description>

          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

          <ul className="mt-4 max-h-60 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2">
            {list.length === 0 ? (
              <li className="px-2 py-3 text-sm text-zinc-500">Поки немає збережених одиниць.</li>
            ) : (
              list.map((u) => (
                <li key={u} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
                  <span className="min-w-0 text-sm text-zinc-900">{u}</span>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex shrink-0 items-center justify-center rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Видалити зі списку"
                    aria-label={`Видалити ${u}`}
                    onClick={() => removeUnit(u)}
                  >
                    <FiTrash2 className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <span className="text-zinc-700">Нова одиниця</span>
              <input
                className="h-10 w-full rounded-md border bg-white px-3"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addUnit();
                  }
                }}
                placeholder="м², послуга, год. …"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={busy || !newValue.trim()}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33] disabled:opacity-50"
              onClick={() => void addUnit()}
            >
              Додати
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button type="button" className="h-10 rounded-md border px-4 text-sm hover:bg-zinc-50">
                Закрити
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
