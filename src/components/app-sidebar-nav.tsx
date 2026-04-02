"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiUser } from "react-icons/fi";

function routeActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function navLinkClass(pathname: string, href: string) {
  const on = routeActive(pathname, href);
  return [
    "block rounded-md px-3 py-2 transition-colors",
    on
      ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent",
  ].join(" ");
}

export function AppSidebarNav({ role }: { role?: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-col gap-3 text-sm" aria-label="Головна навігація">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Фінанси</div>
        <div className="flex flex-col gap-1">
          <Link
            className={navLinkClass(pathname, "/contracts")}
            href="/contracts"
            aria-current={routeActive(pathname, "/contracts") ? "page" : undefined}
          >
            Договори
          </Link>
          <Link
            className={navLinkClass(pathname, "/invoices")}
            href="/invoices"
            aria-current={routeActive(pathname, "/invoices") ? "page" : undefined}
          >
            Рахунки
          </Link>
          <Link
            className={navLinkClass(pathname, "/acceptance-acts")}
            href="/acceptance-acts"
            aria-current={routeActive(pathname, "/acceptance-acts") ? "page" : undefined}
          >
            Акти
          </Link>
          {role !== "MANAGER" ? (
            <Link
              className={navLinkClass(pathname, "/reports")}
              href="/reports"
              aria-current={routeActive(pathname, "/reports") ? "page" : undefined}
            >
              Звіти
            </Link>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Атестація</div>
        <div className="flex flex-col gap-1">
          <Link
            className={navLinkClass(pathname, "/attestation/groups")}
            href="/attestation/groups"
            aria-current={routeActive(pathname, "/attestation/groups") ? "page" : undefined}
          >
            Групи
          </Link>
          <Link
            className={navLinkClass(pathname, "/attestation/welders")}
            href="/attestation/welders"
            aria-current={routeActive(pathname, "/attestation/welders") ? "page" : undefined}
          >
            Зварники
          </Link>
          <Link
            className={navLinkClass(pathname, "/attestation/settings")}
            href="/attestation/settings"
            aria-current={routeActive(pathname, "/attestation/settings") ? "page" : undefined}
          >
            Налаштування
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-sidebar-border pt-2">
        <Link
          className={navLinkClass(pathname, "/companies")}
          href="/companies"
          aria-current={routeActive(pathname, "/companies") ? "page" : undefined}
        >
          Компанії
        </Link>
        {role === "OWNER" ? (
          <Link
            className={navLinkClass(pathname, "/users")}
            href="/users"
            aria-current={routeActive(pathname, "/users") ? "page" : undefined}
          >
            Користувачі
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function ProfileSidebarLink() {
  const pathname = usePathname() ?? "";
  const on = pathname === "/profile" || pathname.startsWith("/profile/");
  return (
    <Link
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
        on
          ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground"
          : "border-border text-muted-foreground hover:bg-sidebar-accent",
      ].join(" ")}
      href="/profile"
      title="Профіль"
      aria-label="Профіль"
      aria-current={on ? "page" : undefined}
    >
      <FiUser aria-hidden="true" className="size-4" />
    </Link>
  );
}
