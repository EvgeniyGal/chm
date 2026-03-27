"use client";

import { toast } from "sonner";

import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";

export function FormWithToastAction({
  action,
  id,
  className,
  children,
  successMessage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  className?: string;
  children: React.ReactNode;
  /** Shown after a successful save. Also shown when the server action ends with `redirect()`. */
  successMessage?: string;
}) {
  return (
    <form
      id={id}
      action={async (formData) => {
        try {
          await action(formData);
          if (successMessage) toast.success(successMessage);
        } catch (e) {
          if (isNextNavigationError(e)) {
            if (successMessage) toast.success(successMessage);
            throw e;
          }
          toast.error(getServerActionErrorMessage(e));
        }
      }}
      className={className}
    >
      {children}
    </form>
  );
}
