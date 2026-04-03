"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const btnClass =
  "inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-zinc-700 transition-[color,box-shadow,background-color] hover:bg-zinc-50 disabled:opacity-40 dark:text-foreground dark:hover:bg-muted/60";

export function TemplateDownloadButton({
  templateId,
  fileLabel,
}: {
  templateId: string;
  fileLabel: string;
}) {
  const [pending, setPending] = useState(false);

  async function onDownload() {
    setPending(true);
    try {
      const res = await fetch(`/api/attestation/templates/${templateId}`);
      if (!res.ok) {
        toast.error(res.status === 404 ? "Шаблон не знайдено" : "Не вдалося завантажити файл");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileLabel.trim().replace(/\.docx$/i, "") || "template";
      a.download = `${base}.docx`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Не вдалося завантажити файл");
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className={btnClass} disabled={pending} onClick={onDownload} title="Завантажити .docx" aria-label="Завантажити шаблон">
      {pending ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : <Download className="size-4 shrink-0" aria-hidden />}
      <span className="whitespace-nowrap">Завантажити</span>
    </button>
  );
}
