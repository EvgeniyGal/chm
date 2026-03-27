"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { DeleteOptionButton } from "./DeleteOptionButton";

function sortUa(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk"));
}

type Scope =
  | "TAX_STATUS"
  | "SIGNER_POSITION_NOM"
  | "SIGNER_POSITION_GEN"
  | "ACTING_UNDER"
  | "SIGNING_LOCATION"
  | "PROJECT_TIMELINE"
  | "CONTRACT_DURATION";

export function SearchableDropdownOptionField({
  label,
  scope,
  value,
  onChange,
  optionsFromBackend = [],
  placeholder,
  required = true,
  inputClassName,
  multiline = false,
  rows = 3,
  listFirstLineOnly = false,
}: {
  label: string;
  scope: Scope;
  value: string;
  onChange: (next: string) => void;
  optionsFromBackend?: string[];
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
  multiline?: boolean;
  rows?: number;
  listFirstLineOnly?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = value.trim();

  const initialOptions = useMemo(() => {
    const seeded = normalizedValue ? [...optionsFromBackend, normalizedValue] : [...optionsFromBackend];
    return sortUa([...new Set(seeded.map((v) => v.trim()).filter(Boolean))]);
  }, [normalizedValue, optionsFromBackend]);

  const [options, setOptions] = useState<string[]>(initialOptions);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(normalizedValue);

  useEffect(() => {
    if (!open) setQuery(normalizedValue);
  }, [normalizedValue, open]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: string; action: "add" | "delete"; value: string }>).detail;
      if (!detail || detail.scope !== scope) return;
      if (detail.action === "add") {
        setOptions((prev) => sortUa([...new Set([...prev, detail.value])]));
      } else {
        setOptions((prev) => prev.filter((v) => v !== detail.value));
      }
    };
    window.addEventListener("dropdown-options:changed", onChanged);
    return () => window.removeEventListener("dropdown-options:changed", onChanged);
  }, [scope]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q) || opt === query.trim());
  }, [options, query]);

  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>

      <div ref={wrapperRef} className="flex w-full flex-nowrap items-center gap-2 min-w-0">
        <div className="relative min-w-0 flex-1">
          {multiline ? (
            <textarea
              required={required}
              value={query}
              rows={rows}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                onChange(next);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                const container = wrapperRef.current;
                if (next && container?.contains(next)) return;
                setTimeout(() => setOpen(false), 100);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              className={`w-full min-w-0 rounded-md border bg-white px-3 py-2 resize-y ${inputClassName ?? ""}`}
              autoComplete="off"
              placeholder={placeholder ?? "Оберіть або введіть значення"}
            />
          ) : (
            <input
              required={required}
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                onChange(next);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                const container = wrapperRef.current;
                if (next && container?.contains(next)) return;
                setTimeout(() => setOpen(false), 100);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              className={`h-10 w-full min-w-0 rounded-md border bg-white px-3 ${inputClassName ?? ""}`}
              autoComplete="off"
              placeholder={placeholder ?? "Оберіть або введіть значення"}
            />
          )}

          {open ? (
            <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-md border bg-white shadow-sm">
              <div className="max-h-60 overflow-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-500">Немає варіантів</div>
                ) : (
                  filtered.map((opt) => {
                    const preview = listFirstLineOnly ? opt.split(/\r?\n/)[0] : opt;
                    return (
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
                      <span className={listFirstLineOnly ? "truncate" : ""} title={opt}>
                        {preview}
                      </span>
                    </button>
                    );
                  })
                )}
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

