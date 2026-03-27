"use client";

import { toast } from "sonner";

import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";

export function FormWithToastAction({
  action,
  id,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      id={id}
      action={async (formData) => {
        try {
          await action(formData);
        } catch (e) {
          if (isNextNavigationError(e)) throw e;
          toast.error(getServerActionErrorMessage(e));
        }
      }}
      className={className}
    >
      {children}
    </form>
  );
}
