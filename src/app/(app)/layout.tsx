import { redirect } from "next/navigation";
import Image from "next/image";

import { auth } from "@/auth";
import { AppSidebarNav, ProfileSidebarLink } from "@/components/app-sidebar-nav";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { LogoutButton } from "@/components/logout-button";
import { AppScrollViewport } from "@/components/ui/AppScrollViewport";

function SidebarContent({ name, email, role }: { name?: string | null; email?: string | null; role?: string }) {
  return (
    <>
      <div className="mb-4">
        <div className="mb-1">
          <Image src="/favicon.svg" alt="Логотип компанії" width={54} height={54} className="rounded-sm" />
        </div>
        <div className="text-sm font-medium text-foreground">{name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{email}</div>
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
    <div className="flex min-h-full flex-1 bg-background">
      <MobileSidebar name={session.user.name} email={session.user.email} role={role} />
      <aside className="hidden w-52 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:block">
        <SidebarContent name={session.user.name} email={session.user.email} role={role} />
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        <AppScrollViewport contentClassName="p-4 pt-16 md:p-6 md:pt-6">
          <div className="md:hidden">
            <div className="mb-2 text-xs text-muted-foreground">{session.user.email}</div>
          </div>
          {children}
        </AppScrollViewport>
      </main>
    </div>
  );
}

