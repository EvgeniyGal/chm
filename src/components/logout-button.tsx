"use client";

import { signOut } from "next-auth/react";
import { FiLogOut } from "react-icons/fi";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
    >
      <FiLogOut aria-hidden="true" className="size-4" />
      Вийти
    </Button>
  );
}
