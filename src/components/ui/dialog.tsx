"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/40", className)} {...props} />;
});

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(function DialogContent({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
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
