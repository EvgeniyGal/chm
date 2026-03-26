"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteOptionButton } from "@/components/forms/DeleteOptionButton";

function sortUa(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk"));
}

const SCOPE = "TAX_STATUS";

export function TaxStatusField({
  defaultValue = "",
  optionsFromBackend = [],
}: {
  defaultValue?: string;
  optionsFromBackend?: string[];
}) {
  const initialValue = defaultValue.trim();
  const initialOptions = useMemo(() => {
    const merged = [...optionsFromBackend];
    if (initialValue) merged.push(initialValue);
    return sortUa([...new Set(merged.map((v) => v.trim()).filter(Boolean))]);
  }, [initialValue, optionsFromBackend]);

  const [options, setOptions] = useState<string[]>(initialOptions);
  const [value, setValue] = useState(initialValue || initialOptions[0] || "");
  const [removed, setRemoved] = useState<string[]>([]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: string; action: "add" | "delete"; value: string }>).detail;
      if (!detail || detail.scope !== SCOPE) return;
      if (detail.action === "add") {
        setOptions((prev) => sortUa([...new Set([...prev, detail.value])]));
        setRemoved((prev) => prev.filter((v) => v !== detail.value));
      } else {
        setOptions((prev) => prev.filter((v) => v !== detail.value));
      }
    };
    window.addEventListener("dropdown-options:changed", onChanged);
    return () => window.removeEventListener("dropdown-options:changed", onChanged);
  }, []);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-zinc-700">Статус платника податку</span>
      <div className="grid grid-cols-[220px_1fr_auto_auto] gap-2">
        <select
          className="h-10 rounded-md border px-2"
          value={options.includes(value) ? value : ""}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="" disabled>
            Оберіть шаблон
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 rounded-md border px-3"
          placeholder="Виберіть або введіть власний статус"
          autoComplete="off"
        />

        <button
          type="button"
          className="h-10 rounded-md border px-3 text-xs hover:bg-zinc-50"
          onClick={() => {
            const next = value.trim();
            if (!next) return;
            fetch("/api/dropdown-options", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ scope: SCOPE, value: next }),
            }).then((res) => {
              if (!res.ok) return;
              window.dispatchEvent(
                new CustomEvent("dropdown-options:changed", {
                  detail: { scope: SCOPE, action: "add", value: next },
                }),
              );
            });
          }}
        >
          Додати
        </button>
        <DeleteOptionButton
          disabled={!options.includes(value)}
          optionLabel={value}
          onConfirm={() => {
            const selected = value.trim();
            if (!selected || !options.includes(selected)) return;
            fetch("/api/dropdown-options", {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ scope: SCOPE, value: selected }),
            }).then((res) => {
              if (!res.ok) return;
              setRemoved((prev) => [...new Set([...prev, selected])]);
              setValue("");
              window.dispatchEvent(
                new CustomEvent("dropdown-options:changed", {
                  detail: { scope: SCOPE, action: "delete", value: selected },
                }),
              );
            });
          }}
        />
      </div>
      <input type="hidden" name="taxStatus" value={value} />
      <input type="hidden" name="taxStatusDeletedJson" value={JSON.stringify(removed)} />
      <p className="text-xs text-zinc-500">Можна обрати шаблон, відредагувати текст або додати свій варіант.</p>
    </div>
  );
}
