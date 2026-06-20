"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { ListPageSkeleton } from "@/components/loading/page-skeletons";

type NavigationPendingContextValue = {
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const NavigationPendingContext = createContext<NavigationPendingContextValue | null>(null);

function routeMatches(pathname: string, href: string) {
  const path = href.split("?")[0] || href;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (routeMatches(pathname, pendingHref)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const startNavigation = (href: string) => {
    if (routeMatches(pathname, href)) return;
    setPendingHref(href);
  };

  return (
    <NavigationPendingContext.Provider value={{ pendingHref, startNavigation }}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error("useNavigationPending must be used within NavigationPendingProvider");
  }
  return ctx;
}

export function useNavigationPendingOptional() {
  return useContext(NavigationPendingContext);
}

export function NavigationPageContent({ children }: { children: ReactNode }) {
  const { pendingHref } = useNavigationPending();

  if (pendingHref) {
    return <ListPageSkeleton />;
  }

  return children;
}
