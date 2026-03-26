"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  EMAIL_IN_USE: "Цей email уже зареєстрований. Увійдіть або використайте інший email.",
  VALIDATION_ERROR: "Перевірте правильність заповнення полів.",
  EMAIL_SEND_FAILED: "Не вдалося надіслати лист підтвердження. Перевірте налаштування Mailgun.",
  SIGNUP_FAILED: "Не вдалося зареєструватися. Спробуйте ще раз.",
};

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessEmail(null);
    const form = e.currentTarget;
    const payload = {
      firstName: String(new FormData(form).get("firstName") ?? ""),
      lastName: String(new FormData(form).get("lastName") ?? ""),
      email: String(new FormData(form).get("email") ?? ""),
      password: String(new FormData(form).get("password") ?? ""),
    };

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as { error?: string; confirmUrl?: string } | null;
    if (!res.ok) {
      const code = data?.error ?? "SIGNUP_FAILED";
      setError(errorMessages[code] ?? errorMessages.SIGNUP_FAILED);
      return;
    }

    setSuccessEmail(payload.email);
    form.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Реєстрація</h1>
        <p className="text-sm text-zinc-600">Створіть акаунт (потрібне підтвердження email).</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {successEmail ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            Лист для підтвердження надіслано на {successEmail}. Перейдіть за посиланням у листі, щоб активувати акаунт.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>Імʼя</span>
          <input name="firstName" required className="h-10 rounded-md border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Прізвище</span>
          <input name="lastName" required className="h-10 rounded-md border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            className="h-10 rounded-md border px-3"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Пароль (мін. 8 символів)</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="h-10 rounded-md border px-3"
            autoComplete="new-password"
          />
        </label>
        <Button type="submit" className="mt-2">
          Зареєструватися
        </Button>
      </form>

      <div className="text-sm text-zinc-600">
        Вже є акаунт?{" "}
        <a className="underline" href="/auth/sign-in">
          Увійти
        </a>
      </div>
      <p className="text-xs text-zinc-500">
        Після реєстрації відкрийте лист і підтвердіть email.
      </p>
    </div>
  );
}
