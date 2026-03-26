import { redirect } from "next/navigation";
import { FiUser } from "react-icons/fi";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");
  const role = (session.user as { role?: string }).role;

  return (
    <div className="flex min-h-full flex-1 bg-[#FFF7E5]">
      <aside className="w-64 border-r bg-white p-4">
        <div className="mb-4">
          <div className="text-sm font-semibold text-zinc-900">CRM</div>
          <div className="text-xs text-zinc-500">{session.user.email}</div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/contracts">
            Договори
          </a>
          <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/invoices">
            Рахунки
          </a>
          <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/acceptance-acts">
            Акти
          </a>
          <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/companies">
            Компанії
          </a>
          {role === "OWNER" ? (
            <>
              <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/users">
                Користувачі
              </a>
            </>
          ) : null}
          <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/audit">
            Історія змін
          </a>
        </nav>
        <div className="mt-6 flex gap-2">
          <a
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50"
            href="/profile"
            title="Профіль"
            aria-label="Профіль"
          >
            <FiUser aria-hidden="true" className="size-4" />
          </a>
          <div className="flex-1">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

