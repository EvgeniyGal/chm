"use client";

import { useState } from "react";
import { toast } from "sonner";

export function TemplateRowActions({
  templateId,
  initialName,
  isActive,
}: {
  templateId: string;
  initialName: string;
  isActive: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 max-w-[180px] rounded border border-border px-2 text-sm"
        aria-label="Назва шаблону"
      />
      <button
        type="button"
        disabled={pending || name.trim() === "" || name.trim() === initialName}
        className="text-sm text-primary underline disabled:opacity-40"
        onClick={async () => {
          setPending(true);
          try {
            const res = await fetch(`/api/attestation/templates/${templateId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim() }),
            });
            if (!res.ok) {
              toast.error("Не вдалося перейменувати");
              return;
            }
            toast.success("Назву оновлено");
            window.location.reload();
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "…" : "Зберегти назву"}
      </button>
      {!isActive ? (
        <button
          type="button"
          disabled={pending}
          className="text-sm text-destructive underline disabled:opacity-40"
          onClick={async () => {
            if (!confirm("Видалити шаблон зі сховища?")) return;
            setPending(true);
            try {
              const res = await fetch(`/api/attestation/templates/${templateId}`, { method: "DELETE" });
              const j = (await res.json().catch(() => ({}))) as { error?: string };
              if (!res.ok) {
                toast.error(
                  j.error === "CANNOT_DELETE_ACTIVE_TEMPLATE" ? "Не можна видалити активний шаблон" : "Помилка видалення",
                );
                return;
              }
              toast.success("Видалено");
              window.location.reload();
            } finally {
              setPending(false);
            }
          }}
        >
          Видалити
        </button>
      ) : null}
    </div>
  );
}
