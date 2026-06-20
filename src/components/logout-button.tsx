"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      loading={loading}
      loadingText="Вихід…"
      onClick={async () => {
        setLoading(true);
        try {
          toast.success("Ви вийшли з системи.");
          await signOut({ callbackUrl: "/auth/sign-in" });
        } finally {
          setLoading(false);
        }
      }}
    >
      <FiLogOut aria-hidden="true" className="size-4" />
      Вийти
    </Button>
  );
}
