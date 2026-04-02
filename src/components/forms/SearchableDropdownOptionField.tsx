"use client";

import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SEARCHABLE_DROPDOWN_PORTAL_DATA_ATTR } from "@/lib/searchable-dropdown-portal";
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
  | "CONTRACT_DURATION"
  | "LINE_ITEM_UNIT";

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
  hideLabel = false,
  showManageButtons = true,
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
  /** Use in table cells: keep label for screen readers only. */
  hideLabel?: boolean;
  /** When false, hides add-to-list and delete-from-list controls (e.g. line items: manage units elsewhere). */
  showManageButtons?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = value.trim();

  const [panelStyle, setPanelStyle] = useState<{
    position: "fixed" | "absolute";
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

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

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      setPortalContainer(null);
      return;
    }

    const anchorForMount = anchorRef.current;
    setPortalContainer(
      anchorForMount?.closest<HTMLElement>("[role=\"dialog\"]") ?? (typeof document !== "undefined" ? document.body : null),
    );

    function updatePanelPosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const ar = anchor.getBoundingClientRect();
      const gap = 4;
      const preferredMax = 240;
      const dialog = anchor.closest<HTMLElement>("[role=\"dialog\"]");

      if (dialog) {
        const dr = dialog.getBoundingClientRect();
        const spaceBelow = dr.bottom - ar.bottom - gap;
        const spaceAbove = ar.top - dr.top - gap;
        const preferBelow = spaceBelow >= 100 || spaceBelow >= spaceAbove;

        let top: number;
        let maxHeight: number;

        if (preferBelow) {
          top = ar.bottom - dr.top + gap;
          maxHeight = Math.min(preferredMax, Math.max(80, spaceBelow - 8));
        } else {
          maxHeight = Math.min(preferredMax, Math.max(80, spaceAbove - 8));
          top = ar.top - dr.top - gap - maxHeight;
        }

        let left = ar.left - dr.left;
        const width = Math.max(ar.width, 160);
        const innerW = dr.width;
        if (left + width > innerW - 8) left = Math.max(8, innerW - width - 8);
        if (left < 8) left = 8;

        setPanelStyle({ position: "absolute", top, left, width, maxHeight });
        return;
      }

      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;
      const spaceBelow = viewportH - ar.bottom - gap;
      const spaceAbove = ar.top - gap;
      const preferBelow = spaceBelow >= 100 || spaceBelow >= spaceAbove;

      let top: number;
      let maxHeight: number;

      if (preferBelow) {
        top = ar.bottom + gap;
        maxHeight = Math.min(preferredMax, Math.max(80, spaceBelow - 8));
      } else {
        maxHeight = Math.min(preferredMax, Math.max(80, spaceAbove - 8));
        top = ar.top - gap - maxHeight;
      }

      let left = ar.left;
      const width = Math.max(ar.width, 160);
      if (left + width > viewportW - 8) left = Math.max(8, viewportW - width - 8);
      if (left < 8) left = 8;

      setPanelStyle({ position: "fixed", top, left, width, maxHeight });
    }

    updatePanelPosition();
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);
    return () => {
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (wrapperRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q) || opt === query.trim());
  }, [options, query]);

  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className={hideLabel ? "sr-only" : "text-zinc-700"}>{label}</span>

      <div ref={wrapperRef} className="flex w-full flex-nowrap items-center gap-2 min-w-0">
        <div ref={anchorRef} className="relative min-w-0 flex-1">
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

          {open && panelStyle && portalContainer && typeof document !== "undefined"
            ? createPortal(
                <DismissableLayerBranch
                  ref={portalRef}
                  {...{ [SEARCHABLE_DROPDOWN_PORTAL_DATA_ATTR]: true }}
                  className="pointer-events-auto overflow-hidden rounded-md border bg-white shadow-lg"
                  style={{
                    position: panelStyle.position,
                    top: panelStyle.top,
                    left: panelStyle.left,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                    zIndex: 9999,
                  }}
                >
                  <div className="min-h-0 overflow-y-auto overscroll-contain" style={{ maxHeight: panelStyle.maxHeight }}>
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
                            onMouseDown={(e) => e.preventDefault()}
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
                </DismissableLayerBranch>,
                portalContainer,
              )
            : null}
        </div>

        {showManageButtons ? (
          <>
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
                })
                  .then((res) => {
                    if (!res.ok) {
                      toast.error("Не вдалося зберегти варіант.");
                      return;
                    }
                    toast.success("Варіант додано.");
                    window.dispatchEvent(
                      new CustomEvent("dropdown-options:changed", {
                        detail: { scope, action: "add", value: next },
                      }),
                    );
                    setOpen(false);
                  })
                  .catch(() => {
                    toast.error("Помилка мережі. Спробуйте ще раз.");
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
                })
                  .then((res) => {
                    if (!res.ok) {
                      toast.error("Не вдалося видалити варіант.");
                      return;
                    }
                    toast.success("Варіант видалено зі списку.");
                    setOptions((prev) => prev.filter((v) => v !== selected));
                    onChange("");
                    setQuery("");
                    setOpen(false);
                    window.dispatchEvent(
                      new CustomEvent("dropdown-options:changed", {
                        detail: { scope, action: "delete", value: selected },
                      }),
                    );
                  })
                  .catch(() => {
                    toast.error("Помилка мережі. Спробуйте ще раз.");
                  });
              }}
            />
          </>
        ) : null}
      </div>
    </label>
  );
}

