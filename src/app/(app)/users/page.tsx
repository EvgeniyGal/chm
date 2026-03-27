import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/db/schema";
import { FormWithToastAction } from "@/components/forms/FormWithToastAction";
import { requireRole } from "@/lib/authz";

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MANAGER"]),
  approved: z.union([z.literal("on"), z.literal("off"), z.literal(""), z.null()]).optional(),
});

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

    // Prevent accidental self-lockout by owner.
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Користувачі</h1>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-crm-table-header text-left text-sm font-semibold text-foreground/90">
            <tr>
              <th className="px-4 py-3">First Name</th>
              <th className="px-4 py-3">Last Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isSelfOwner = u.id === currentUserId && u.role === "OWNER";
              return (
                <tr key={u.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <input
                      form={`u-${u.id}`}
                      name="firstName"
                      defaultValue={u.firstName}
                      className="h-9 w-full rounded-md border px-2"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      form={`u-${u.id}`}
                      name="lastName"
                      defaultValue={u.lastName}
                      className="h-9 w-full rounded-md border px-2"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      form={`u-${u.id}`}
                      name="email"
                      type="email"
                      defaultValue={u.email}
                      className="h-9 w-full rounded-md border px-2"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      form={`u-${u.id}`}
                      name="role"
                      defaultValue={u.role}
                      className="h-9 rounded-md border px-2"
                      disabled={isSelfOwner}
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      form={`u-${u.id}`}
                      type="checkbox"
                      name="approved"
                      defaultChecked={Boolean(u.approvedAt) || u.role === "OWNER"}
                      disabled={u.role === "OWNER"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <FormWithToastAction
                      id={`u-${u.id}`}
                      action={updateUser}
                      successMessage="Користувача оновлено."
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-zinc-50"
                      >
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
    </div>
  );
}

