import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { FormWithToastAction } from "@/components/forms/FormWithToastAction";
import { db } from "@/db";
import { emailChangeTokens, users } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { appBaseUrl, sendAuthEmail } from "@/lib/email";

const nameSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
});

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("MANAGER");
  const sp = await searchParams;
  const emailChangeStatus = String(sp.emailChange ?? "");
  const session = await auth();
  const user = session?.user as any;
  const userRow = await db.query.users.findFirst({ where: eq(users.id, userId) });

  async function updateName(formData: FormData) {
    "use server";
    const { userId } = await requireRole("MANAGER");
    const parsed = nameSchema.parse({
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
    });
    await db
      .update(users)
      .set({ firstName: parsed.firstName, lastName: parsed.lastName, updatedAt: new Date() })
      .where(eq(users.id, userId));
    redirect("/profile");
  }

  async function changePassword(formData: FormData) {
    "use server";
    const { userId } = await requireRole("MANAGER");
    const parsed = passwordSchema.safeParse({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
    if (!parsed.success) {
      throw new Error("VALIDATION_ERROR");
    }
    const { currentPassword, newPassword, confirmPassword } = parsed.data;
    if (newPassword !== confirmPassword) {
      throw new Error("Нові паролі не збігаються.");
    }

    const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!row?.passwordHash) {
      throw new Error("Для цього акаунта не встановлено пароль.");
    }
    const currentOk = await compare(currentPassword, row.passwordHash);
    if (!currentOk) {
      throw new Error("Поточний пароль невірний.");
    }

    const nextHash = await hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: nextHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    redirect("/profile");
  }

  async function requestEmailChange(formData: FormData) {
    "use server";
    const { userId } = await requireRole("MANAGER");
    const newEmailRaw = String(formData.get("newEmail") ?? "");
    const parsedEmail = z.string().email().safeParse(newEmailRaw);
    if (!parsedEmail.success) {
      redirect("/profile?emailChange=invalid");
    }
    const newEmail = parsedEmail.data.toLowerCase().trim();

    const existing = await db.query.users.findFirst({ where: eq(users.email, newEmail) });
    if (existing && existing.id !== userId && !existing.isDeleted) {
      redirect("/profile?emailChange=inuse");
    }

    await db.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2);
    await db.insert(emailChangeTokens).values({ userId, newEmail, token, expiresAt });

    const confirmUrl = `${appBaseUrl()}/auth/confirm-email-change?token=${encodeURIComponent(token)}`;
    try {
      await sendAuthEmail({
        to: newEmail,
        subject: "Підтвердження зміни email у CRM",
        text: `Підтвердіть новий email, перейшовши за посиланням: ${confirmUrl}`,
        html: `<p>Підтвердіть зміну email у CRM:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
      });
      redirect("/profile?emailChange=sent");
    } catch {
      redirect("/profile?emailChange=send-failed");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="page-title">Профіль</h1>

      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="font-semibold text-foreground">Редагувати ім'я</div>
        <FormWithToastAction
          action={updateName}
          successMessage="Ім'я збережено."
          className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="flex flex-col gap-1">
            <span className="text-zinc-700">Ім'я</span>
            <input
              name="firstName"
              required
              defaultValue={userRow?.firstName ?? ""}
              className="h-10 rounded-md border px-3"
              autoComplete="given-name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-700">Прізвище</span>
            <input
              name="lastName"
              required
              defaultValue={userRow?.lastName ?? ""}
              className="h-10 rounded-md border px-3"
              autoComplete="family-name"
            />
          </label>
          <div className="md:col-span-2">
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-zinc-50"
              type="submit"
            >
              Зберегти ім'я
            </button>
          </div>
        </FormWithToastAction>
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="font-semibold text-foreground">Зміна пароля</div>
        {userRow?.passwordHash ? (
          <FormWithToastAction
            action={changePassword}
            successMessage="Пароль оновлено."
            className="mt-3 flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-zinc-700">Поточний пароль</span>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-700">Новий пароль</span>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-700">Підтвердження нового пароля</span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="h-10 rounded-md border px-3"
              />
            </label>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-zinc-50"
              type="submit"
            >
              Змінити пароль
            </button>
          </FormWithToastAction>
        ) : (
          <p className="mt-2 text-xs text-zinc-600">Для цього акаунта не встановлено пароль (лише зовнішній вхід).</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Ім'я</div>
          <div className="col-span-2">{userRow?.firstName ?? "—"}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Прізвище</div>
          <div className="col-span-2">{userRow?.lastName ?? "—"}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Email</div>
          <div className="col-span-2">{session?.user?.email ?? "—"}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Роль</div>
          <div className="col-span-2">{user?.role ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="font-semibold text-foreground">Зміна email</div>
        <FormWithToastAction className="mt-3 flex flex-col gap-3" action={requestEmailChange}>
          <input name="newEmail" type="email" required className="h-10 rounded-md border px-3" placeholder="new@email.com" />
          <button className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-zinc-50" type="submit">
            Запросити підтвердження
          </button>
          {emailChangeStatus === "sent" ? (
            <p className="text-xs text-emerald-700">Лист підтвердження надіслано на новий email.</p>
          ) : null}
          {emailChangeStatus === "inuse" ? (
            <p className="text-xs text-red-700">Цей email уже використовується іншим акаунтом.</p>
          ) : null}
          {emailChangeStatus === "invalid" ? (
            <p className="text-xs text-red-700">Некоректний формат email.</p>
          ) : null}
          {emailChangeStatus === "send-failed" ? (
            <p className="text-xs text-red-700">Не вдалося надіслати лист. Перевірте налаштування пошти.</p>
          ) : null}
        </FormWithToastAction>
      </div>
    </div>
  );
}

