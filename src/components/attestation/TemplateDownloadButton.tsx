"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const btnClass =
  "inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-zinc-700 transition-[color,box-shadow,background-color] hover:bg-zinc-50 disabled:opacity-40 dark:text-foreground dark:hover:bg-muted/60";

export function TemplateDownloadButton({
  templateId,
  fileLabel,
}: {
  templateId: string;
  fileLabel: string;
}) {
  async function onDownload() {
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
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={btnClass}
      onClick={onDownload}
      title="Завантажити .docx"
      aria-label="Завантажити шаблон"
    >
      <Download className="size-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">Завантажити</span>
    </Button>
  );
}
