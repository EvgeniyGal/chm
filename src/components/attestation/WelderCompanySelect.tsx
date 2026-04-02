"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import { QuickCreateCompanyModal } from "@/components/forms/QuickCreateCompanyModal";

type CompanyOpt = { id: string; label: string };

type QuickCreateDropdowns = {
  taxStatusOptions: string[];
  signerPositionNomOptions: string[];
  signerPositionGenOptions: string[];
  actingUnderOptions: string[];
};

export function WelderCompanySelect({
  initialCompanies,
  defaultCompanyId,
  quickCreateDropdowns,
}: {
  initialCompanies: CompanyOpt[];
  defaultCompanyId: string;
  quickCreateDropdowns: QuickCreateDropdowns;
}) {
  const { taxStatusOptions, signerPositionNomOptions, signerPositionGenOptions, actingUnderOptions } =
    quickCreateDropdowns;

  const [companiesState, setCompaniesState] = useState(initialCompanies);
  const [value, setValue] = useState(defaultCompanyId);
  const [modalOpen, setModalOpen] = useState(false);

  const companyOptions = useMemo(() => companiesState.map((c) => ({ id: c.id, label: c.label })), [companiesState]);

  return (
    <>
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <CompanySearchSelect
            label=""
            placeholder="Оберіть компанію…"
            companies={companyOptions}
            value={value}
            onChange={(nextId) => setValue(nextId)}
          />
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 dark:text-foreground dark:hover:bg-muted"
          aria-label="Додати компанію"
          title="Додати компанію"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <input type="hidden" name="companyId" value={value} required />

      <QuickCreateCompanyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        taxStatusOptions={taxStatusOptions}
        signerPositionNomOptions={signerPositionNomOptions}
        signerPositionGenOptions={signerPositionGenOptions}
        actingUnderOptions={actingUnderOptions}
        onCreated={(company) => {
          setCompaniesState((prev) => [{ id: company.id, label: company.label }, ...prev.filter((c) => c.id !== company.id)]);
          setValue(company.id);
        }}
      />
    </>
  );
}
