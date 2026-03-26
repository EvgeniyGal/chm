"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Підтверджуємо зміну email...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setState("error");
        setMessage("Відсутній токен підтвердження.");
        return;
      }

      const res = await fetch(`/api/auth/confirm-email-change?token=${encodeURIComponent(token)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (cancelled) return;

      if (res.ok) {
        setState("ok");
        setMessage("Email успішно змінено. Увійдіть повторно, щоб оновити сесію.");
        return;
      }

      if (data?.error === "INVALID_OR_EXPIRED_TOKEN") {
        setState("error");
        setMessage("Посилання недійсне або прострочене.");
        return;
      }
      if (data?.error === "EMAIL_IN_USE") {
        setState("error");
        setMessage("Цей email уже використовується іншим акаунтом.");
        return;
      }

      setState("error");
      setMessage("Не вдалося підтвердити зміну email.");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Підтвердження email</h1>
        <p className="text-sm text-zinc-600">{message}</p>
      </div>
      {state === "loading" ? (
        <p className="text-sm text-zinc-600">Завантаження...</p>
      ) : (
        <a className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-zinc-50" href="/auth/sign-in">
          Перейти до входу
        </a>
      )}
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-600">Завантаження...</div>}>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}
