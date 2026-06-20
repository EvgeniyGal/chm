"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { tableActionIconClassName } from "@/components/data-table/list-styles";
import { useNavigationPendingOptional } from "@/components/navigation/navigation-pending";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function isApiHref(href: string) {
  return href.startsWith("/api/");
}

function filenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export type TableActionButtonProps = {
  href?: string;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<React.ComponentProps<"button">, "children">;

export function TableActionButton({
  href,
  loading: loadingProp,
  className,
  children,
  disabled,
  onClick,
  ...props
}: TableActionButtonProps) {
  const navigation = useNavigationPendingOptional();
  const [internalLoading, setInternalLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const navPending = Boolean(href && !isApiHref(href) && navigation?.pendingHref === href);
  const loading = loadingProp ?? internalLoading ?? downloadLoading ?? navPending;
  const isDisabled = Boolean(disabled || loading);

  const classes = cn(
    tableActionIconClassName,
    className,
    loading && "pointer-events-none cursor-wait opacity-60",
  );

  const content = loading ? <Spinner className="size-4" /> : children;

  async function handleDownload(url: string) {
    setDownloadLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        toast.error("Не вдалося завантажити файл");
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filenameFromContentDisposition(
        res.headers.get("content-disposition"),
        "document",
      );
      anchor.rel = "noopener";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Не вдалося завантажити файл");
    } finally {
      setDownloadLoading(false);
    }
  }

  if (href && isApiHref(href)) {
    return (
      <button
        type="button"
        className={classes}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        onClick={() => void handleDownload(href)}
        {...props}
      >
        {content}
      </button>
    );
  }

  if (href) {
    const { onClick: linkOnClick, ...linkProps } = props as Omit<
      React.ComponentProps<typeof Link>,
      "href" | "children"
    >;

    return (
      <Link
        href={href}
        className={classes}
        aria-busy={loading || undefined}
        onClick={(event) => {
          navigation?.startNavigation(href);
          linkOnClick?.(event);
        }}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    const result = onClick?.(event);
    if (result != null && typeof (result as Promise<unknown>).then === "function") {
      setInternalLoading(true);
      void (async () => {
        try {
          await result;
        } finally {
          setInternalLoading(false);
        }
      })();
    }
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={onClick ? handleClick : undefined}
      {...props}
    >
      {content}
    </button>
  );
}
