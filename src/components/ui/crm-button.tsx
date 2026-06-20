"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useNavigationPendingOptional } from "@/components/navigation/navigation-pending";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const crmButtonVariants = {
  primary: "crm-btn-primary",
  outline: "crm-btn-outline",
  neutral: "crm-btn-neutral",
  blue: "crm-btn-blue",
  violet: "crm-btn-violet",
  amber: "crm-btn-amber",
  sky: "crm-btn-sky",
  teal: "crm-btn-teal",
} as const;

export type CrmButtonVariant = keyof typeof crmButtonVariants;

export type CrmButtonProps = {
  variant?: CrmButtonVariant;
  loading?: boolean;
  loadingText?: ReactNode;
  className?: string;
  children?: ReactNode;
  href?: string;
} & Omit<React.ComponentProps<"button">, "children">;

function CrmButtonContent({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText?: ReactNode;
  children?: ReactNode;
}) {
  if (!loading) {
    return <span className="inline-flex items-center justify-center gap-2">{children}</span>;
  }

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Spinner />
      {loadingText ?? children}
    </span>
  );
}

export function CrmButton({
  variant = "primary",
  loading: loadingProp,
  loadingText,
  className,
  children,
  disabled,
  onClick,
  href,
  type = "button",
  ...props
}: CrmButtonProps) {
  const navigation = useNavigationPendingOptional();
  const [internalLoading, setInternalLoading] = useState(false);
  const navPending = Boolean(href && navigation?.pendingHref === href);
  const loading = Boolean(loadingProp) || internalLoading || navPending;
  const isDisabled = Boolean(disabled || loading);
  const variantClass = crmButtonVariants[variant];

  if (href) {
    const { onClick: linkOnClick, ...linkProps } = props as Omit<
      React.ComponentProps<typeof Link>,
      "href" | "children"
    >;

    return (
      <Link
        href={href}
        className={cn(variantClass, className, loading ? "pointer-events-none opacity-80" : "")}
        aria-busy={loading || undefined}
        onClick={(event) => {
          navigation?.startNavigation(href);
          linkOnClick?.(event);
        }}
        {...linkProps}
      >
        <CrmButtonContent loading={loading} loadingText={loadingText}>
          {children}
        </CrmButtonContent>
      </Link>
    );
  }

  async function handleClick(
    event: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    if (isDisabled) return;
    const result = onClick?.(event);
    if (result != null && typeof (result as Promise<unknown>).then === "function") {
      setInternalLoading(true);
      try {
        await result;
      } finally {
        setInternalLoading(false);
      }
    }
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(variantClass, className)}
      onClick={onClick ? handleClick : undefined}
      {...props}
    >
      <CrmButtonContent loading={loading} loadingText={loadingText}>
        {children}
      </CrmButtonContent>
    </button>
  );
}
