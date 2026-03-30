"use client";

import { useRef } from "react";
import { FiMenu } from "react-icons/fi";

import { AppSidebarNav, ProfileSidebarLink } from "@/components/app-sidebar-nav";
import { LogoutButton } from "@/components/logout-button";

export function MobileSidebar({ email, role }: { email?: string | null; role?: string }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const closeMenu = () => {
    detailsRef.current?.removeAttribute("open");
  };

  return (
    <details ref={detailsRef} className="group md:hidden">
      <summary className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm">
        <FiMenu aria-hidden="true" className="size-5" />
        <span className="sr-only">Відкрити меню</span>
      </summary>

      <button
        type="button"
        className="fixed inset-0 z-30 hidden bg-black/40 group-open:block"
        aria-label="Закрити меню"
        onClick={closeMenu}
      />

      <aside
        className="fixed left-0 top-0 z-40 h-full w-52 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground shadow-xl"
        onClickCapture={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.closest("a")) closeMenu();
        }}
      >
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
      </aside>
    </details>
  );
}

