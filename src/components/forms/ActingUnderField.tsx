"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteOptionButton } from "@/components/forms/DeleteOptionButton";

function sortUa(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk"));
}

const SCOPE = "ACTING_UNDER";

export function ActingUnderField({
  defaultValue = "",
  optionsFromBackend = [],
}: {
  defaultValue?: string;
  optionsFromBackend?: string[];
}) {
  const initial = defaultValue.trim();
  const initialOptions = useMemo(() => {
    const seeded = initial ? [...optionsFromBackend, initial] : [...optionsFromBackend];
    return sortUa([...new Set(seeded)]);
  }, [initial, optionsFromBackend]);

  const [options, setOptions] = useState<string[]>(initialOptions);
  const [value, setValue] = useState(initial || "");
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
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">Підписант договору діє на підставі</span>
      <div className="grid grid-cols-[220px_1fr_auto_auto] gap-2">
        <select
          className="h-10 rounded-md border px-2"
          value={options.includes(value) ? value : ""}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">Оберіть шаблон</option>
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
          autoComplete="off"
          placeholder="Оберіть або введіть підставу"
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
      <input type="hidden" name="contractSignerActingUnder" value={value} />
      <input type="hidden" name="actingUnderDeletedJson" value={JSON.stringify(removed)} />
    </div>
  );
}
