"use client";

import { FileUp, X } from "lucide-react";
import { useState, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/utils";

export type FileDropZoneProps = {
  inputId: string;
  labelId: string;
  /** Visible label above the drop zone */
  label: string;
  accept: string;
  /** For use inside `<form>` + `FormData` */
  name?: string;
  multiple?: boolean;
  required?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Main line when empty */
  emptyTitle: string;
  emptySubtitle?: string;
  footerHint: string;
  /** Title while dragging over (empty state) */
  dragActiveTitle?: string;
  /** When files are selected — file name(s) or summary */
  selectedContent: ReactNode | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Clear control (top-right) when `selectedContent` is set */
  onClear?: () => void;
};

/**
 * Accessible file picker: visually hidden input + dashed drop zone (same pattern as attestation template upload).
 */
export function FileDropZone({
  inputId,
  labelId,
  label,
  accept,
  name,
  multiple = false,
  required = false,
  inputRef,
  emptyTitle,
  emptySubtitle,
  footerHint,
  dragActiveTitle = "Відпустіть файл тут",
  selectedContent,
  onInputChange,
  onClear,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  function applyDroppedFiles(dropped: File[]) {
    if (dropped.length === 0) return;
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    if (multiple) {
      const existing = Array.from(input.files ?? []);
      for (const f of [...existing, ...dropped]) {
        dt.items.add(f);
      }
    } else {
      dt.items.add(dropped[0]!);
    }
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground" id={labelId}>
        {label}
      </span>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        className="sr-only"
        aria-labelledby={labelId}
        onChange={onInputChange}
      />
      <div className="relative">
        <label
          htmlFor={inputId}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            applyDroppedFiles(files);
          }}
          className={cn(
            "group flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-[border-color,background-color,box-shadow]",
            dragOver
              ? "border-primary bg-primary/10 ring-2 ring-primary/25 dark:bg-primary/15"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 dark:hover:bg-muted/40",
          )}
        >
          <span
            className={cn(
              "mb-2 flex size-12 items-center justify-center rounded-full transition-colors",
              dragOver
                ? "bg-primary/15 text-primary"
                : "bg-background text-muted-foreground shadow-sm ring-1 ring-border group-hover:text-primary",
            )}
          >
            <FileUp className="size-6" aria-hidden />
          </span>
          {selectedContent ? (
            <div className="max-w-full px-1">{selectedContent}</div>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">
                {dragOver ? dragActiveTitle : emptyTitle}
              </span>
              {emptySubtitle ? <span className="mt-1 text-xs text-muted-foreground">{emptySubtitle}</span> : null}
            </>
          )}
        </label>
        {selectedContent && onClear ? (
          <button
            type="button"
            className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            title="Прибрати файл(и)"
            aria-label="Прибрати файл(и)"
            onClick={(e) => {
              e.preventDefault();
              onClear();
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{footerHint}</p>
    </div>
  );
}
