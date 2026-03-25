"use client";

import { useState } from "react";

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
      <div className="text-sm font-semibold text-zinc-900">Підписаний документ (скан)</div>
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
            setMsg("Оберіть файл.");
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
          } catch (err: any) {
            setMsg(err?.message ?? "Помилка завантаження.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input name="file" type="file" accept="image/jpeg" className="text-sm" />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33] disabled:opacity-50"
        >
          {busy ? "Завантаження…" : "Завантажити"}
        </button>
        {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
      </form>
    </div>
  );
}

