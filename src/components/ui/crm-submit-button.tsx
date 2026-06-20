"use client";

import { useFormStatus } from "react-dom";

import { CrmButton, type CrmButtonProps } from "@/components/ui/crm-button";

export function CrmSubmitButton({
  children,
  loadingText,
  loading: loadingProp,
  ...props
}: Omit<CrmButtonProps, "href" | "onClick" | "type"> & {
  loadingText?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const loading = Boolean(loadingProp) || pending;

  return (
    <CrmButton type="submit" loading={loading} loadingText={loadingText} {...props}>
      {children}
    </CrmButton>
  );
}
