"use client";

import "overlayscrollbars/styles/overlayscrollbars.css";

import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { cn } from "@/lib/utils";

export function AppScrollViewport({
  className,
  contentClassName,
  children,
}: {
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <OverlayScrollbarsComponent
      defer
      options={{
        overflow: { x: "scroll", y: "scroll" },
        scrollbars: {
          theme: "os-theme-crm",
          autoHide: "leave",
          autoHideDelay: 500,
          dragScroll: true,
          clickScroll: true,
        },
      }}
      className={cn("h-full w-full", className)}
    >
      <div className={cn("min-h-full", contentClassName)}>{children}</div>
    </OverlayScrollbarsComponent>
  );
}

