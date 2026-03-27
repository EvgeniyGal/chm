"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getServerActionErrorMessage } from "@/lib/server-action-error-message";

export function SignedUpload({
  entityType,
  entityId,
}: {
  entityType: "CONTRACT" | "INVOICE" | "ACCEPTANCE_ACT";
  entityId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold text-foreground">Підписаний документ (скан)</div>
      <p className="mt-1 text-xs text-zinc-500">Тільки JPG. Файл буде конвертовано у WebP.</p>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          const form = e.currentTarget;
          const input = form.elements.namedItem("file") as HTMLInputElement | null;
          const file = input?.files?.[0];
          if (!file) {
            const m = "Оберіть файл.";
            setMsg(m);
            toast.error(m);
            return;
          }
          setBusy(true);
          try {
            const fd = new FormData();
            fd.set("file", file);
            const res = await fetch(`/api/uploads/signed?entityType=${entityType}&entityId=${entityId}`, {
              method: "POST",
              body: fd,
            });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok) throw new Error(data?.error ?? "UPLOAD_FAILED");
            setMsg("Завантажено.");
            toast.success("Файл завантажено.");
          } catch (err: any) {
            const m = err?.message ?? "Помилка завантаження.";
            setMsg(m);
            toast.error(getServerActionErrorMessage(err instanceof Error ? err : new Error(m)));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input name="file" type="file" accept="image/jpeg" className="text-sm" />
        <button
          type="submit"
          disabled={busy}
          className="crm-btn-primary disabled:opacity-50"
        >
          {busy ? "Завантаження…" : "Завантажити"}
        </button>
        {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
      </form>
    </div>
  );
}

