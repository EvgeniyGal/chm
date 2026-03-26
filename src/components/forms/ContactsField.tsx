"use client";

import { useMemo, useState } from "react";

type ContactType = "tel" | "email";

type ContactItem = {
  type: ContactType;
  value: string;
};

const defaultRow: ContactItem = { type: "tel", value: "" };

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("380")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+38${digits}`;
  }
  if (digits.length === 9) {
    return `+380${digits}`;
  }
  return input.trim();
}

function isValidUAPhone(value: string) {
  return /^\+380\d{9}$/.test(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactsField({ defaultValue = "[]" }: { defaultValue?: string }) {
  const initialRows = useMemo(() => {
    try {
      const parsed = JSON.parse(defaultValue) as Array<{ type?: string; value?: string }>;
      const rows = (Array.isArray(parsed) ? parsed : [])
        .map((c) => {
          const type: ContactType = c.type === "email" ? "email" : "tel";
          return { type, value: String(c.value ?? "") };
        })
        .filter((c) => c.value.trim().length > 0);
      return rows.length > 0 ? rows : [defaultRow];
    } catch {
      return [defaultRow];
    }
  }, [defaultValue]);

  const [rows, setRows] = useState<ContactItem[]>(initialRows);

  const errors = rows.map((row) => {
    const raw = row.value.trim();
    if (!raw) return "";
    if (row.type === "email") return isValidEmail(raw) ? "" : "Введіть коректний email";
    const normalized = normalizePhone(raw);
    return isValidUAPhone(normalized) ? "" : "Номер у форматі +380XXXXXXXXX";
  });

  const jsonValue = JSON.stringify(
    rows
      .map((row) => {
        const trimmed = row.value.trim();
        const value = row.type === "tel" ? normalizePhone(trimmed) : trimmed.toLowerCase();
        return { type: row.type, value };
      })
      .filter((row) => row.value.length > 0),
  );

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-zinc-700">Контакти</span>
        <button
          type="button"
          className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50"
          onClick={() => setRows((prev) => [...prev, defaultRow])}
        >
          Додати контакт
        </button>
      </div>

      <input type="hidden" name="contactsJson" value={jsonValue} />

      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={index} className="rounded-md border p-2">
            <div className="grid grid-cols-[140px_1fr_auto] gap-2">
              <select
                className="h-10 rounded-md border px-2"
                value={row.type}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], type: e.target.value as ContactType };
                    return copy;
                  })
                }
              >
                <option value="tel">Телефон</option>
                <option value="email">Email</option>
              </select>
              <input
                className="h-10 rounded-md border px-3"
                placeholder={row.type === "email" ? "name@company.ua" : "+380XXXXXXXXX"}
                value={row.value}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], value: e.target.value };
                    return copy;
                  })
                }
                onBlur={() => {
                  if (row.type !== "tel") return;
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], value: normalizePhone(copy[index].value) };
                    return copy;
                  });
                }}
              />
              <button
                type="button"
                className="h-10 rounded-md border px-3 text-xs hover:bg-zinc-50 disabled:opacity-50"
                disabled={rows.length === 1}
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              >
                Видалити
              </button>
            </div>
            {errors[index] ? <p className="mt-1 text-xs text-red-700">{errors[index]}</p> : null}
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        Для телефону використовуйте український формат <code>+380XXXXXXXXX</code>.
      </p>
    </div>
  );
}
