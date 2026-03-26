import { redirect } from "next/navigation";
import { FiMenu, FiUser } from "react-icons/fi";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";

function SidebarContent({ email, role }: { email?: string | null; role?: string }) {
  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-semibold text-zinc-900">CRM</div>
        <div className="text-xs text-zinc-500">{email}</div>
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
          <a className="rounded-md px-3 py-2 hover:bg-[#FFEECC]" href="/users">
            Користувачі
          </a>
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
    </>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");
  const role = (session.user as { role?: string }).role;

  return (
    <div className="flex min-h-full flex-1 bg-[#FFF7E5]">
      <details className="group md:hidden">
        <summary className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border bg-white text-zinc-700 shadow-sm">
          <FiMenu aria-hidden="true" className="size-5" />
          <span className="sr-only">Відкрити меню</span>
        </summary>
        <div className="fixed inset-0 z-30 bg-black/40 group-open:block" />
        <aside className="fixed left-0 top-0 z-40 h-full w-64 border-r bg-white p-4 shadow-xl">
          <SidebarContent email={session.user.email} role={role} />
        </aside>
      </details>
      <aside className="hidden w-64 border-r bg-white p-4 md:block">
        <SidebarContent email={session.user.email} role={role} />
      </aside>
      <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6">
        <div className="md:hidden">
          <div className="mb-2 text-xs text-zinc-500">{session.user.email}</div>
        </div>
        {children}
      </main>
    </div>
  );
}

