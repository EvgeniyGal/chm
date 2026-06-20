"use client";

import { List } from "lucide-react";
import { type ReactNode, useRef } from "react";

import { GuardedForm, type GuardedFormHandle } from "@/components/forms/GuardedForm";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmSubmitButton } from "@/components/ui/crm-submit-button";

import { WelderAttestationDocumentButtons } from "./WelderAttestationDocumentButtons";

export function WelderCertificationNewForm({
  createWelder,
  children,
  successMessage,
}: {
  createWelder: (fd: FormData) => Promise<void | { welderId: string }>;
  children: ReactNode;
  successMessage?: string;
}) {
  const formRef = useRef<GuardedFormHandle>(null);

  return (
    <GuardedForm
      ref={formRef}
      action={createWelder}
      className="flex min-w-0 flex-col gap-4 rounded-xl border bg-white p-4"
      enableSaveAndProceed
      successMessage={successMessage}
      formProps={{ id: "welder-attestation-new-form" }}
    >
      {children}
      <p className="text-xs text-muted-foreground">
        Перед генерацією файлів зміни у формі зберігаються на сервері.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <CrmSubmitButton className="w-full sm:w-auto" loadingText="Збереження…">
          Зберегти
        </CrmSubmitButton>
        <CrmButton variant="neutral" href="/attestation/welders" className="w-full sm:w-auto">
          <List className="size-4 shrink-0" aria-hidden />
          До списку зварників
        </CrmButton>
        <WelderAttestationDocumentButtons
          formId="welder-attestation-new-form"
          saveWelder={createWelder}
          onSaved={() => formRef.current?.markClean()}
          navigateToEditAfterCreate
        />
      </div>
    </GuardedForm>
  );
}
