"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { FiUser } from "react-icons/fi";

import { useNavigationPending } from "@/components/navigation/navigation-pending";
import { Spinner } from "@/components/ui/spinner";

function routeActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function navLinkClass(pathname: string, href: string, pending = false) {
  const on = routeActive(pathname, href);
  return [
    "block rounded-md px-3 py-2 transition-colors",
    on
      ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent",
    pending ? "pointer-events-none opacity-80" : "",
  ].join(" ");
}

function SidebarNavLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: ReactNode;
}) {
  const { pendingHref, startNavigation } = useNavigationPending();
  const pending = pendingHref === href;
  const active = routeActive(pathname, href);

  return (
    <Link
      className={navLinkClass(pathname, href, pending)}
      href={href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      aria-busy={pending || undefined}
      onClick={() => startNavigation(href)}
    >
      <span className="inline-flex items-center gap-2">
        {pending ? <Spinner className="size-3.5" /> : null}
        {children}
      </span>
    </Link>
  );
}

export function AppSidebarNav({ role }: { role?: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-col gap-3 text-sm" aria-label="Головна навігація">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Фінанси</div>
        <div className="flex flex-col gap-1">
          <SidebarNavLink href="/contracts" pathname={pathname}>
            Договори
          </SidebarNavLink>
          <SidebarNavLink href="/invoices" pathname={pathname}>
            Рахунки
          </SidebarNavLink>
          <SidebarNavLink href="/acceptance-acts" pathname={pathname}>
            Акти
          </SidebarNavLink>
          {role !== "MANAGER" ? (
            <SidebarNavLink href="/reports" pathname={pathname}>
              Звіти
            </SidebarNavLink>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Атестація</div>
        <div className="flex flex-col gap-1">
          <SidebarNavLink href="/attestation/groups" pathname={pathname}>
            Групи
          </SidebarNavLink>
          <SidebarNavLink href="/attestation/welders" pathname={pathname}>
            Зварники
          </SidebarNavLink>
          <SidebarNavLink href="/attestation/settings" pathname={pathname}>
            Налаштування
          </SidebarNavLink>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-sidebar-border pt-2">
        <SidebarNavLink href="/companies" pathname={pathname}>
          Компанії
        </SidebarNavLink>
        {role === "OWNER" ? (
          <SidebarNavLink href="/users" pathname={pathname}>
            Користувачі
          </SidebarNavLink>
        ) : null}
      </div>
    </nav>
  );
}

export function ProfileSidebarLink() {
  const pathname = usePathname() ?? "";
  const href = "/profile";
  const { pendingHref, startNavigation } = useNavigationPending();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const pending = pendingHref === href;

  return (
    <Link
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
        active
          ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground"
          : "border-border text-muted-foreground hover:bg-sidebar-accent",
        pending ? "pointer-events-none opacity-80" : "",
      ].join(" ")}
      href={href}
      title="Профіль"
      aria-label="Профіль"
      aria-current={active ? "page" : undefined}
      aria-busy={pending || undefined}
      onClick={() => startNavigation(href)}
    >
      {pending ? <Spinner className="size-3.5" /> : <FiUser aria-hidden="true" className="size-4" />}
    </Link>
  );
}
