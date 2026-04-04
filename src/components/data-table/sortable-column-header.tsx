"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Column, Row } from "@tanstack/react-table";

/** `localeCompare` по `uk` для колонок таблиць налаштувань. */
export function sortRowsLocaleUk<TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string) {
  const a = String(rowA.getValue(columnId) ?? "");
  const b = String(rowB.getValue(columnId) ?? "");
  return a.localeCompare(b, "uk");
}

export function SortableHeader<TData>({
  column,
  children,
}: {
  column: Column<TData, unknown>;
  children: ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded-sm text-left font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={column.getToggleSortingHandler()}
    >
      <span className="min-w-0">{children}</span>
      {sorted === "desc" ? (
        <ArrowDown className="size-4 shrink-0 opacity-70" aria-hidden />
      ) : sorted === "asc" ? (
        <ArrowUp className="size-4 shrink-0 opacity-70" aria-hidden />
      ) : (
        <ArrowUpDown className="size-4 shrink-0 opacity-35" aria-hidden />
      )}
    </button>
  );
}
