import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { FormWithToastAction } from "@/components/forms/FormWithToastAction";
import { listTableHeaderClass } from "@/components/data-table/list-styles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/db/schema";
import { requireRole } from "@/lib/authz";

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MANAGER"]),
  approved: z.union([z.literal("on"), z.literal("off"), z.literal(""), z.null()]).optional(),
});

function roleLabel(role: UserRole): string {
  if (role === "OWNER") return "Власник";
  if (role === "ADMIN") return "Адміністратор";
  return "Менеджер";
}

export default async function UsersPage() {
  const { userId: currentUserId } = await requireRole("OWNER");
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));

  async function updateUser(formData: FormData) {
    "use server";
    const { userId: actorId } = await requireRole("OWNER");
    const parsed = updateUserSchema.parse({
      userId: String(formData.get("userId") ?? ""),
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      role: String(formData.get("role") ?? "") as UserRole,
      approved: (formData.get("approved") as string | null) ?? null,
    });

    const target = await db.query.users.findFirst({ where: eq(users.id, parsed.userId) });
    if (!target) redirect("/users");

    if (parsed.userId === actorId && parsed.role !== "OWNER") {
      throw new Error("CANNOT_DEMOTE_SELF_OWNER");
    }

    await db
      .update(users)
      .set({
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        role: parsed.role,
        approvedAt: parsed.approved === "on" || parsed.role === "OWNER" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsed.userId));

    redirect("/users");
  }

  const inputClassName = "bg-zinc-50";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Користувачі</h1>

      <Card className="overflow-hidden p-0">
        <div className="hidden min-w-0 md:block">
          <table className="w-full text-sm">
            <thead className={listTableHeaderClass}>
              <tr>
                <th className="px-3 py-3 text-left">Ім’я</th>
                <th className="px-3 py-3 text-left">Прізвище</th>
                <th className="px-3 py-3 text-left">Email</th>
                <th className="px-3 py-3 text-left">Роль</th>
                <th className="px-3 py-3 text-left">Затверджено</th>
                <th className="px-3 py-3 text-center">Дії</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const isSelfOwner = u.id === currentUserId && u.role === "OWNER";
                return (
                  <tr key={u.id} className="border-t align-top">
                    <td className="px-3 py-3">
                      <Input
                        form={`u-${u.id}`}
                        name="firstName"
                        defaultValue={u.firstName}
                        className={inputClassName}
                        required
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        form={`u-${u.id}`}
                        name="lastName"
                        defaultValue={u.lastName}
                        className={inputClassName}
                        required
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        form={`u-${u.id}`}
                        name="email"
                        type="email"
                        defaultValue={u.email}
                        className={inputClassName}
                        required
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NativeSelect
                        form={`u-${u.id}`}
                        name="role"
                        defaultValue={u.role}
                        className="h-10 w-full min-w-[10rem] bg-zinc-50"
                        disabled={isSelfOwner}
                      >
                        <option value="OWNER">{roleLabel("OWNER")}</option>
                        <option value="ADMIN">{roleLabel("ADMIN")}</option>
                        <option value="MANAGER">{roleLabel("MANAGER")}</option>
                      </NativeSelect>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        form={`u-${u.id}`}
                        type="checkbox"
                        name="approved"
                        className="size-4 rounded border-input"
                        defaultChecked={Boolean(u.approvedAt) || u.role === "OWNER"}
                        disabled={u.role === "OWNER"}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <FormWithToastAction
                        id={`u-${u.id}`}
                        action={updateUser}
                        successMessage="Користувача оновлено."
                        className="flex items-center justify-center"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" className="crm-btn-primary inline-flex h-10 items-center px-4 text-sm">
                          Зберегти
                        </button>
                      </FormWithToastAction>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {rows.map((u) => {
            const isSelfOwner = u.id === currentUserId && u.role === "OWNER";
            return (
              <div key={u.id} className="rounded-lg border bg-card p-3 shadow-sm">
                <FormWithToastAction
                  id={`u-${u.id}-m`}
                  action={updateUser}
                  successMessage="Користувача оновлено."
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Ім’я</Label>
                    <Input name="firstName" defaultValue={u.firstName} className={inputClassName} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Прізвище</Label>
                    <Input name="lastName" defaultValue={u.lastName} className={inputClassName} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Email</Label>
                    <Input name="email" type="email" defaultValue={u.email} className={inputClassName} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-muted-foreground">Роль</Label>
                    <NativeSelect
                      name="role"
                      defaultValue={u.role}
                      className="h-10 w-full bg-zinc-50"
                      disabled={isSelfOwner}
                    >
                      <option value="OWNER">{roleLabel("OWNER")}</option>
                      <option value="ADMIN">{roleLabel("ADMIN")}</option>
                      <option value="MANAGER">{roleLabel("MANAGER")}</option>
                    </NativeSelect>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="approved"
                      className="size-4 rounded border-input"
                      defaultChecked={Boolean(u.approvedAt) || u.role === "OWNER"}
                      disabled={u.role === "OWNER"}
                    />
                    <span className="text-foreground/90">Затверджено</span>
                  </label>
                  <button type="submit" className="crm-btn-primary inline-flex h-10 w-full items-center justify-center px-4 text-sm">
                    Зберегти
                  </button>
                </FormWithToastAction>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
