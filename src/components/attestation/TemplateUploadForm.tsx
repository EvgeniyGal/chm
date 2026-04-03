"use client";

import { CheckCircle2, FileUp, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const TYPES = [
  { value: "protocol", label: "Протокол засідання" },
  { value: "certificate", label: "Посвідчення зварника" },
  { value: "report_protocol", label: "Протокол звітний" },
] as const;

const ACCEPT =
  ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;

function isDocxFile(file: File): boolean {
  if (!/\.docx$/i.test(file.name)) return false;
  const t = file.type;
  if (!t) return true;
  return (
    t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    t === "application/octet-stream"
  );
}

function assignInputFile(input: HTMLInputElement, file: File | null) {
  if (!file) {
    input.value = "";
    return;
  }
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
}

export function TemplateUploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const clearFile = useCallback(() => {
    const input = fileInputRef.current;
    if (input) assignInputFile(input, null);
    setSelectedLabel(null);
  }, []);

  const pickFile = useCallback((file: File) => {
    if (!isDocxFile(file)) {
      toast.error("Потрібен файл Microsoft Word (.docx)");
      return;
    }
    const input = fileInputRef.current;
    if (!input) return;
    assignInputFile(input, file);
    setSelectedLabel(file.name);
  }, []);

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setPending(true);
        try {
          const res = await fetch("/api/attestation/templates", {
            method: "POST",
            body: fd,
          });
          const text = await res.text();
          let json: { error?: string; data?: { id: string } } = {};
          if (text) {
            try {
              json = JSON.parse(text) as typeof json;
            } catch {
              toast.error("Некоректна відповідь сервера");
              return;
            }
          }
          if (!res.ok) {
            toast.error(json.error ?? "Помилка завантаження");
            return;
          }
          toast.success("Шаблон завантажено (неактивний). Оберіть «Активувати» у списку.");
          form.reset();
          clearFile();
          router.refresh();
        } catch {
          toast.error("Мережева помилка");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="font-medium">Завантажити новий .docx</div>
      <label className="flex flex-col gap-1">
        <span>Тип</span>
        <select name="templateType" required className="h-10 rounded-md border border-border px-3">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span>Назва</span>
        <input name="name" required className="h-10 rounded-md border border-border px-3" placeholder="напр. Посвідчення 2026" />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-foreground" id="template-docx-label">
          Файл шаблону
        </span>
        <input
          ref={fileInputRef}
          id="template-docx-file"
          name="file"
          type="file"
          accept={ACCEPT}
          required
          className="sr-only"
          aria-labelledby="template-docx-label"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            else setSelectedLabel(null);
          }}
        />
        <div className="relative">
          <label
            htmlFor="template-docx-file"
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
              const f = e.dataTransfer.files?.[0];
              if (f) pickFile(f);
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
            {selectedLabel ? (
              <span className="max-w-full break-all text-sm font-medium text-foreground">{selectedLabel}</span>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">
                  {dragOver ? "Відпустіть файл тут" : "Перетягніть .docx сюди або натисніть, щоб обрати"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">Лише формат Word (.docx)</span>
              </>
            )}
          </label>
          {selectedLabel ? (
            <button
              type="button"
              className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              title="Прибрати файл"
              aria-label="Прибрати файл"
              onClick={(e) => {
                e.preventDefault();
                clearFile();
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Перетягніть файл у рамку або натисніть на неї — відкриється вибір файлу.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="crm-btn-primary inline-flex h-10 w-fit items-center justify-center gap-2"
      >
        {pending ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : <Upload className="size-4 shrink-0" aria-hidden />}
        {pending ? "Завантаження…" : "Завантажити"}
      </button>
    </form>
  );
}

const activateIconBtn =
  "inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-primary/35 bg-primary/5 text-primary hover:bg-primary/10 dark:border-primary/45 dark:hover:bg-primary/15";

export function TemplateActivateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={activateIconBtn}
      title="Активувати"
      aria-label="Активувати"
      onClick={async () => {
        setPending(true);
        try {
          const res = await fetch(`/api/attestation/templates/${templateId}/activate`, { method: "POST" });
          if (!res.ok) {
            toast.error("Не вдалося активувати");
            return;
          }
          toast.success("Активний шаблон оновлено");
          router.refresh();
        } catch {
          toast.error("Мережева помилка");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
    </button>
  );
}
