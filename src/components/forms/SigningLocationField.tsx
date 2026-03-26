"use client";

import { useEffect, useMemo, useState } from "react";

import { DROPDOWN_SCOPE } from "@/lib/dropdown-scopes";

import { DeleteOptionButton } from "./DeleteOptionButton";
import { Plus } from "lucide-react";

function sortUa(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk"));
}

export function SigningLocationField({
  label,
  value,
  onChange,
  optionsFromBackend = [],
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  optionsFromBackend?: string[];
}) {
  const scope = DROPDOWN_SCOPE.SIGNING_LOCATION;
  const normalizedValue = value.trim();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(normalizedValue);

  const initialOptions = useMemo(() => {
    const seeded = normalizedValue ? [...optionsFromBackend, normalizedValue] : [...optionsFromBackend];
    return sortUa([...new Set(seeded.map((v) => v.trim()).filter(Boolean))]);
  }, [normalizedValue, optionsFromBackend]);

  const [options, setOptions] = useState<string[]>(initialOptions);

  useEffect(() => {
    // Keep the search text synced with the committed value when dropdown is closed.
    if (!open) setQuery(normalizedValue);
  }, [normalizedValue, open]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: string; action: "add" | "delete"; value: string }>).detail;
      if (!detail || detail.scope !== scope) return;
      if (detail.action === "add") {
        setOptions((prev) => sortUa([...new Set([...prev, detail.value])])); // keep it stable + unique
      } else {
        setOptions((prev) => prev.filter((v) => v !== detail.value));
      }
    };

    window.addEventListener("dropdown-options:changed", onChanged);
    return () => window.removeEventListener("dropdown-options:changed", onChanged);
  }, [scope]);

  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>

      <div className="flex w-full flex-nowrap items-center gap-2 min-w-0">
        <div className="relative min-w-0 flex-1">
          <input
            required
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              onChange(next);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="h-10 w-full min-w-0 rounded-md border px-3"
            autoComplete="off"
            placeholder="Оберіть або введіть місце складання"
          />

          {open ? (
            <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-md border bg-white shadow-sm">
              <div className="max-h-60 overflow-auto">
                {(() => {
                  const q = query.trim().toLowerCase();
                  const filtered =
                    !q
                      ? options
                      : options.filter((opt) => opt.toLowerCase().includes(q) || opt === query.trim());
                  if (filtered.length === 0) {
                    return <div className="px-3 py-2 text-sm text-zinc-500">Немає варіантів</div>;
                  }
                  return filtered.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                      onClick={() => {
                        setQuery(opt);
                        onChange(opt);
                        setOpen(false);
                      }}
                    >
                      <span>{opt}</span>
                    </button>
                  ));
                })()}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50"
          aria-label="Додати варіант"
          title="Додати варіант"
          onClick={() => {
            const next = query.trim();
            if (!next) return;
            fetch("/api/dropdown-options", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ scope, value: next }),
            }).then((res) => {
              if (!res.ok) return;
              window.dispatchEvent(
                new CustomEvent("dropdown-options:changed", {
                  detail: { scope, action: "add", value: next },
                }),
              );
              setOpen(false);
            });
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>

        <DeleteOptionButton
          disabled={!normalizedValue || !options.includes(normalizedValue)}
          optionLabel={normalizedValue}
          onConfirm={() => {
            const selected = normalizedValue;
            if (!selected || !options.includes(selected)) return;
            fetch("/api/dropdown-options", {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ scope, value: selected }),
            }).then((res) => {
              if (!res.ok) return;
              setOptions((prev) => prev.filter((v) => v !== selected));
              onChange("");
              setQuery("");
              setOpen(false);
              window.dispatchEvent(
                new CustomEvent("dropdown-options:changed", {
                  detail: { scope, action: "delete", value: selected },
                }),
              );
            });
          }}
        />
      </div>
    </label>
  );
}

