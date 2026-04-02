"use client";

import { useState } from "react";
import { toast } from "sonner";

const TYPES = [
  { value: "protocol", label: "Протокол засідання" },
  { value: "certificate", label: "Посвідчення зварника" },
  { value: "report_protocol", label: "Протокол звітний" },
] as const;

export function TemplateUploadForm() {
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        try {
          const res = await fetch("/api/attestation/templates", {
            method: "POST",
            body: fd,
          });
          const json = (await res.json()) as { error?: string; data?: { id: string } };
          if (!res.ok) {
            toast.error(json.error ?? "Помилка завантаження");
            return;
          }
          toast.success("Шаблон завантажено (неактивний). Оберіть «Активувати» у списку.");
          e.currentTarget.reset();
          window.location.reload();
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
      <label className="flex flex-col gap-1">
        <span>Файл .docx</span>
        <input name="file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
      </label>
      <button type="submit" disabled={pending} className="crm-btn-primary w-fit">
        {pending ? "Завантаження…" : "Завантажити"}
      </button>
    </form>
  );
}

export function TemplateActivateButton({ templateId }: { templateId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-primary underline"
      onClick={async () => {
        setPending(true);
        try {
          const res = await fetch(`/api/attestation/templates/${templateId}/activate`, { method: "POST" });
          if (!res.ok) {
            toast.error("Не вдалося активувати");
            return;
          }
          toast.success("Активний шаблон оновлено");
          window.location.reload();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "…" : "Активувати"}
    </button>
  );
}
