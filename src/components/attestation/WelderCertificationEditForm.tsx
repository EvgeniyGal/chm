"use client";

import { List } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useRef } from "react";

import { GuardedForm, type GuardedFormHandle } from "@/components/forms/GuardedForm";

import { WelderAttestationDocumentButtons } from "./WelderAttestationDocumentButtons";

export function WelderCertificationEditForm({
  welderId,
  saveWelder,
  children,
  successMessage,
}: {
  welderId: string;
  saveWelder: (fd: FormData) => Promise<void | { welderId: string }>;
  children: ReactNode;
  successMessage?: string;
}) {
  const formRef = useRef<GuardedFormHandle>(null);

  return (
    <GuardedForm
      ref={formRef}
      action={saveWelder}
      className="flex min-w-0 flex-col gap-4 rounded-xl border bg-white p-4"
      enableSaveAndProceed
      successMessage={successMessage}
      formProps={{ id: "welder-attestation-edit-form" }}
    >
      {children}
      <p className="text-xs text-muted-foreground">
        Перед генерацією файлів зміни у формі зберігаються на сервері.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="submit" className="crm-btn-primary w-full sm:w-auto">
          Зберегти
        </button>
        <Link className="crm-btn-neutral w-full sm:w-auto" href="/attestation/welders">
          <List className="size-4 shrink-0" aria-hidden />
          До списку зварників
        </Link>
        <WelderAttestationDocumentButtons
          formId="welder-attestation-edit-form"
          fixedWelderId={welderId}
          saveWelder={saveWelder}
          onSaved={() => formRef.current?.markClean()}
        />
      </div>
    </GuardedForm>
  );
}
