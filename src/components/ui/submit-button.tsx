"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  children,
  loadingText,
  loading: loadingProp,
  ...props
}: ButtonProps & {
  loadingText?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const loading = loadingProp ?? pending;

  return (
    <Button type="submit" loading={loading} loadingText={loadingText} {...props}>
      {children}
    </Button>
  );
}
