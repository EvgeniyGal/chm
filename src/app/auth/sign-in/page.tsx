"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailConfirmed = searchParams.get("emailConfirmed") === "1";

  useEffect(() => {
    const hasSensitiveQuery = searchParams.has("email") || searchParams.has("password");
    if (!hasSensitiveQuery) return;
    const safe = new URLSearchParams();
    if (searchParams.get("emailConfirmed") === "1") {
      safe.set("emailConfirmed", "1");
    }
    const qs = safe.toString();
    router.replace(qs ? `/auth/sign-in?${qs}` : "/auth/sign-in");
  }, [searchParams, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      const msg =
        res.error === "EMAIL_NOT_VERIFIED"
          ? "Спочатку підтвердіть email за посиланням після реєстрації (перевірте пошту або відкрийте посилання з екрану реєстрації)."
          : res.error === "USER_NOT_APPROVED"
            ? "Ваш акаунт ще не схвалено власником CRM."
            : "Невірний email або пароль";
      setError(msg);
      toast.error(msg);
      return;
    }

    toast.success("Ви увійшли в систему.");
    router.push("/companies");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Вхід</h1>
        <p className="text-sm text-zinc-600">Увійдіть у CRM.</p>
      </div>
      {emailConfirmed ? (
        <p
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          Email підтверджено. Тепер можете увійти.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
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
        <label className="flex flex-col gap-1 text-sm">
          <span>Пароль</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            className="h-10 rounded-md border px-3"
            autoComplete="current-password"
          />
        </label>
        <Button type="submit" className="mt-2">
          Увійти
        </Button>
      </form>

      <div className="text-sm text-zinc-600">
        Немає акаунта?{" "}
        <a className="underline" href="/auth/sign-up">
          Реєстрація
        </a>
      </div>
      <div className="text-sm text-zinc-600">
        Забули пароль?{" "}
        <a className="underline" href="/auth/reset-password">
          Скинути пароль
        </a>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-600">Завантаження…</div>}>
      <SignInForm />
    </Suspense>
  );
}
