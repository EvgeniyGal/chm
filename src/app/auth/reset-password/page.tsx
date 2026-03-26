"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const hasToken = token.length > 0;

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onRequestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error === "EMAIL_SEND_FAILED" ? "Не вдалося надіслати лист. Перевірте налаштування пошти." : "Помилка запиту.");
        return;
      }
      setSuccess("Якщо акаунт існує, лист для скидання паролю вже надіслано.");
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error === "INVALID_OR_EXPIRED_TOKEN" ? "Посилання недійсне або прострочене." : "Не вдалося змінити пароль.");
        return;
      }
      setSuccess("Пароль оновлено. Тепер можна увійти з новим паролем.");
      setNewPassword("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Скидання паролю</h1>
        <p className="text-sm text-zinc-600">
          {hasToken ? "Встановіть новий пароль для акаунта." : "Введіть email і ми надішлемо посилання для скидання."}
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {success}
        </p>
      ) : null}

      {hasToken ? (
        <form onSubmit={onResetPassword} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Новий пароль (мін. 8 символів)</span>
            <input
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              className="h-10 rounded-md border px-3"
              autoComplete="new-password"
            />
          </label>
          <Button type="submit" className="mt-2" disabled={isLoading}>
            {isLoading ? "Збереження..." : "Оновити пароль"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onRequestReset} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className="h-10 rounded-md border px-3"
              autoComplete="email"
            />
          </label>
          <Button type="submit" className="mt-2" disabled={isLoading}>
            {isLoading ? "Надсилання..." : "Надіслати посилання"}
          </Button>
        </form>
      )}

      <div className="text-sm text-zinc-600">
        Повернутися до{" "}
        <a className="underline" href="/auth/sign-in">
          входу
        </a>
        .
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-600">Завантаження…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
