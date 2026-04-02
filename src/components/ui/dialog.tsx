"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { isSearchableDropdownPortalTarget } from "@/lib/searchable-dropdown-portal";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 bg-black/40", className ?? "z-50")}
      {...props}
    />
  );
});

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** e.g. nested confirm dialogs: `z-[190]` so overlay sits above another dialog */
    overlayClassName?: string;
    /**
     * `center` — default, vertically centered. `viewport` — pinned with top/bottom insets so height
     * stays within the window (use with flex + scroll inside for tall content).
     */
    contentPosition?: "center" | "viewport";
  }
>(function DialogContent({
  className,
  children,
  onInteractOutside,
  onFocusOutside,
  overlayClassName,
  contentPosition = "center",
  ...props
}, ref) {
  const positionClass =
    contentPosition === "viewport"
      ? // No `overflow-hidden` here: tailwind-merge keeps both `overflow-hidden` and `overflow-y-auto` from
        // consumers, and whichever rule wins in CSS can block inner scrolling entirely.
        "top-4 bottom-4 max-h-[calc(100dvh-2rem)] min-h-0 -translate-x-1/2 translate-y-0"
      : "top-1/2 -translate-x-1/2 -translate-y-1/2";

  return (
    <DialogPortal>
      <DialogOverlay className={cn("z-50", overlayClassName)} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 z-50 w-[min(640px,calc(100vw-24px))] rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg outline-none",
          positionClass,
          className,
        )}
        {...props}
        onInteractOutside={(event) => {
          if (isSearchableDropdownPortalTarget(event.target)) {
            event.preventDefault();
          }
          onInteractOutside?.(event);
        }}
        onFocusOutside={(event) => {
          if (isSearchableDropdownPortalTarget(event.target)) {
            event.preventDefault();
          }
          onFocusOutside?.(event);
        }}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
});

export { Dialog, DialogPortal, DialogTrigger, DialogClose, DialogContent, DialogOverlay, DialogTitle };
