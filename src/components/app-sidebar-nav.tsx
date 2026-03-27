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
      ? "bg-[#FFAA00] font-medium text-[#241800]"
      : "text-zinc-800 hover:bg-[#FFEECC]",
  ].join(" ");
}

export function AppSidebarNav({ role }: { role?: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-col gap-1 text-sm" aria-label="Головна навігація">
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
      <Link
        className={navLinkClass(pathname, "/audit")}
        href="/audit"
        aria-current={routeActive(pathname, "/audit") ? "page" : undefined}
      >
        Історія змін
      </Link>
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
        on ? "border-[#FFAA00] bg-[#FFAA00] text-[#241800]" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
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
