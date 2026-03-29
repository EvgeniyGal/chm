"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CompanyOpt = { id: string; label: string };

export function CompanySearchSelect({
  label,
  placeholder = "Оберіть компанію…",
  companies,
  value,
  onChange,
  disabledCompanyId,
  disabled = false,
}: {
  label?: string;
  placeholder?: string;
  companies: CompanyOpt[];
  value: string;
  onChange: (nextId: string) => void;
  disabledCompanyId?: string;
  /** Read-only: показує вибрану назву без відкриття списку (наприклад, фіксовані сторони за договором). */
  disabled?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => companies.find((c) => c.id === value) ?? null, [companies, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [companies, query]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  if (disabled) {
    return (
      <div className="flex flex-col gap-1 text-sm min-w-0">
        {label ? <span className="text-muted-foreground">{label}</span> : null}
        <input
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          className="h-10 w-full min-w-0 cursor-default rounded-md border border-border bg-muted px-3 text-foreground"
          value={selected?.label ?? ""}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-1 text-sm min-w-0">
      {label ? <span className="text-zinc-700">{label}</span> : null}

      <div className="relative min-w-0">
        <input
          className="h-10 w-full min-w-0 rounded-md border px-3"
          placeholder={placeholder}
          value={open ? query : selected?.label ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (!query && selected?.label) setQuery(selected.label);
          }}
        />

        {open ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-sm">
            <div className="max-h-60 overflow-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-500">Немає варіантів</div>
              ) : (
                filtered.map((c) => {
                  const disabled = disabledCompanyId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={disabled}
                      onClick={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                    >
                      <span>{c.label}</span>
                      {disabled ? <span className="text-xs text-red-600">недоступно</span> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {/* Hidden value carrier if consumer needs it */}
        <input type="hidden" value={value} />
      </div>
    </div>
  );
}

