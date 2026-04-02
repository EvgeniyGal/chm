"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const TYPES = [
  { value: "protocol", label: "Протокол засідання" },
  { value: "certificate", label: "Посвідчення зварника" },
  { value: "report_protocol", label: "Протокол звітний" },
] as const;

export function TemplateUploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

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
      <label className="flex flex-col gap-1">
        <span>Файл .docx</span>
        <input name="file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
      </label>
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
