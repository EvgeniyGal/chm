import { auth } from "@/auth";
import { requireRole } from "@/lib/authz";

export default async function ProfilePage() {
  await requireRole("MANAGER");
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900">Профіль</h1>
      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Email</div>
          <div className="col-span-2">{session?.user?.email ?? "—"}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="text-zinc-500">Роль</div>
          <div className="col-span-2">{user?.role ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="font-semibold text-zinc-900">Зміна email</div>
        <form
          className="mt-3 flex flex-col gap-3"
          action={async (formData) => {
            "use server";
            await requireRole("MANAGER");
            const newEmail = String(formData.get("newEmail") ?? "");
            await fetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/request-email-change`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ newEmail }),
              cache: "no-store",
            });
          }}
        >
          <input name="newEmail" type="email" required className="h-10 rounded-md border px-3" placeholder="new@email.com" />
          <button className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-zinc-50" type="submit">
            Запросити підтвердження
          </button>
          <p className="text-xs text-zinc-500">Підтвердження поки що повертається API як `confirmUrl`.</p>
        </form>
      </div>
    </div>
  );
}

