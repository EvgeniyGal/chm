import { redirect } from "next/navigation";
import { FiMenu } from "react-icons/fi";

import { auth } from "@/auth";
import { AppSidebarNav, ProfileSidebarLink } from "@/components/app-sidebar-nav";
import { LogoutButton } from "@/components/logout-button";

function SidebarContent({ email, role }: { email?: string | null; role?: string }) {
  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-semibold text-zinc-900">CRM</div>
        <div className="text-xs text-zinc-500">{email}</div>
      </div>
      <AppSidebarNav role={role} />
      <div className="mt-6 flex gap-2">
        <ProfileSidebarLink />
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
        <aside className="fixed left-0 top-0 z-40 h-full w-52 border-r bg-white p-3 shadow-xl">
          <SidebarContent email={session.user.email} role={role} />
        </aside>
      </details>
      <aside className="hidden w-52 border-r bg-white p-3 md:block">
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

