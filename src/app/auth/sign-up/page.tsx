import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  async function action(formData: FormData) {
    "use server";
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      throw new Error(data?.error ?? "SIGNUP_FAILED");
    }

    return data?.confirmUrl ? { confirmUrl: data.confirmUrl as string } : { confirmUrl: "" };
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Реєстрація</h1>
        <p className="text-sm text-zinc-600">Створіть акаунт (потрібне підтвердження email).</p>
      </div>

      <form
        action={async (fd) => {
          "use server";
          const { confirmUrl } = await action(fd);
          // Basic UX: show confirmation link as a redirect to JSON endpoint.
          // In production this would be emailed.
          if (confirmUrl) {
            return;
          }
        }}
        className="flex flex-col gap-3"
      >
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
          <input name="email" type="email" required className="h-10 rounded-md border px-3" autoComplete="email" />
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
        Після реєстрації API повертає `confirmUrl` (поки що без відправки email).
      </p>
    </div>
  );
}

