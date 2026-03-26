"use client";

import { useEffect, useRef } from "react";

export function useUnsavedChangesGuard(isDirty: boolean, message = "Є незбережені зміни. Вийти без збереження?") {
  const suppressNextUnloadRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (suppressNextUnloadRef.current) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty, message]);

  return () => {
    suppressNextUnloadRef.current = true;
    setTimeout(() => {
      suppressNextUnloadRef.current = false;
    }, 0);
  };
}

