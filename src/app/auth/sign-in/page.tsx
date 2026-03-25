"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    const password = String(new FormData(form).get("password") ?? "");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Невірний email або пароль");
      return;
    }

    router.push("/companies");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Вхід</h1>
        <p className="text-sm text-zinc-600">Увійдіть у CRM.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
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
          <span>Пароль</span>
          <input
            name="password"
            type="password"
            required
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
