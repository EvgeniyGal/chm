"use client";

import { useEffect } from "react";

export function useUnsavedChangesGuard(isDirty: boolean, message = "Є незбережені зміни. Вийти без збереження?") {
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!isDirty) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (!confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClickCapture, true);
    };
  }, [isDirty, message]);
}

