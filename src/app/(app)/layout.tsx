import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebarNav, ProfileSidebarLink } from "@/components/app-sidebar-nav";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { LogoutButton } from "@/components/logout-button";
import { AppScrollViewport } from "@/components/ui/AppScrollViewport";

function SidebarContent({ email, role }: { email?: string | null; role?: string }) {
  return (
    <>
        <div className="mb-4">
        <div className="text-sm font-semibold text-foreground">CRM</div>
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
      <MobileSidebar email={session.user.email} role={role} />
      <aside className="hidden w-52 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:block">
        <SidebarContent email={session.user.email} role={role} />
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

