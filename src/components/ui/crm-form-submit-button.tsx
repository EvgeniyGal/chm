"use client";

import { useFormContext } from "react-hook-form";

import { CrmButton, type CrmButtonProps } from "@/components/ui/crm-button";

export function CrmFormSubmitButton({
  loadingText = "Збереження…",
  loading: loadingProp,
  ...props
}: Omit<CrmButtonProps, "type" | "href" | "onClick"> & {
  loadingText?: React.ReactNode;
}) {
  const {
    formState: { isSubmitting },
  } = useFormContext();
  const loading = Boolean(loadingProp) || isSubmitting;

  return (
    <CrmButton type="submit" loading={loading} loadingText={loadingText} {...props} />
  );
}
