"use client";

import { useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { LineItemsTable } from "@/components/line-items/LineItemsTable";
import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { SigningLocationField } from "@/components/forms/SigningLocationField";
import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";

type CompanyOpt = {
  id: string;
  label: string;
  contractSignerFullNameNom: string;
  contractSignerFullNameGen: string;
  contractSignerPositionNom: string;
  contractSignerPositionGen: string;
  contractSignerActingUnder: string;
};

type ContractFormValues = {
  date: string;
  signingLocation: string;
  workType: "WORKS" | "SERVICES";
  customerCompanyId: string;
  contractorCompanyId: string;
  projectTimeline: string;
  contractDuration: string;
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
  signerActingUnder: string;
  items: Array<{ title: string; unit: string; quantity: number; price: number }>;
};

export function ContractForm({
  companies,
  signingLocationOptions,
  onSubmit,
}: {
  companies: CompanyOpt[];
  signingLocationOptions: string[];
  onSubmit: (payload: ContractFormValues) => Promise<void>;
}) {
  const form = useForm<ContractFormValues>({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      signingLocation: "",
      workType: "SERVICES",
      customerCompanyId: "",
      contractorCompanyId: "",
      projectTimeline: "",
      contractDuration: "",
      signerFullNameNom: "",
      signerFullNameGen: "",
      signerPositionNom: "",
      signerPositionGen: "",
      signerActingUnder: "",
      items: [{ title: "", unit: "", quantity: 0, price: 0 }],
    },
    mode: "onBlur",
  });

  useUnsavedChangesGuard(form.formState.isDirty);
  const workType = form.watch("workType");
  const customerCompanyId = form.watch("customerCompanyId");
  const contractorCompanyId = form.watch("contractorCompanyId");

  const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const selectedCustomerCompany = customerCompanyId ? companiesById.get(customerCompanyId) : null;
  const selectedContractorCompany = contractorCompanyId ? companiesById.get(contractorCompanyId) : null;
  const companyOptions = useMemo(() => companies.map((c) => ({ id: c.id, label: c.label })), [companies]);

  useEffect(() => {
    if (!selectedContractorCompany) {
      // If contractor is cleared, don't leave stale signer values behind.
      if (!contractorCompanyId) {
        form.setValue("signerFullNameNom", "", { shouldDirty: true });
        form.setValue("signerFullNameGen", "", { shouldDirty: true });
        form.setValue("signerPositionNom", "", { shouldDirty: true });
        form.setValue("signerPositionGen", "", { shouldDirty: true });
        form.setValue("signerActingUnder", "", { shouldDirty: true });
      }
      return;
    }

    const setIfDifferent = (key: keyof ContractFormValues, nextValue: string) => {
      const currentValue = form.getValues(key as any) as unknown as string;
      if (currentValue === nextValue) return;
      form.setValue(key as any, nextValue, { shouldDirty: true });
    };

    setIfDifferent("signerFullNameNom", selectedContractorCompany.contractSignerFullNameNom);
    setIfDifferent("signerFullNameGen", selectedContractorCompany.contractSignerFullNameGen);
    setIfDifferent("signerPositionNom", selectedContractorCompany.contractSignerPositionNom);
    setIfDifferent("signerPositionGen", selectedContractorCompany.contractSignerPositionGen);
    setIfDifferent("signerActingUnder", selectedContractorCompany.contractSignerActingUnder);
  }, [contractorCompanyId, selectedContractorCompany, form]);

  useEffect(() => {
    if (!customerCompanyId || !contractorCompanyId) return;
    if (customerCompanyId !== contractorCompanyId) return;

    // Prevent selecting the same company for both parties.
    form.setValue("contractorCompanyId", "", { shouldDirty: true });
    form.setValue("signerFullNameNom", "", { shouldDirty: true });
    form.setValue("signerFullNameGen", "", { shouldDirty: true });
    form.setValue("signerPositionNom", "", { shouldDirty: true });
    form.setValue("signerPositionGen", "", { shouldDirty: true });
    form.setValue("signerActingUnder", "", { shouldDirty: true });
  }, [customerCompanyId, contractorCompanyId, form]);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
        })}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Дата" type="date" {...form.register("date", { required: true })} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Тип</span>
            <select className="h-10 rounded-md border px-3" {...form.register("workType", { required: true })}>
              <option value="WORKS">Роботи</option>
              <option value="SERVICES">Послуги</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Controller
            name="signingLocation"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <SigningLocationField
                label="Місце складання"
                value={field.value ?? ""}
                onChange={(next) => field.onChange(next)}
                optionsFromBackend={signingLocationOptions}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            name="customerCompanyId"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <CompanySearchSelect
                label="Замовник"
                placeholder="Оберіть компанію…"
                companies={companyOptions}
                value={field.value}
                onChange={(nextId) => field.onChange(nextId)}
                disabledCompanyId={contractorCompanyId}
              />
            )}
          />

          <Controller
            name="contractorCompanyId"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <CompanySearchSelect
                label="Виконавець"
                placeholder="Оберіть компанію…"
                companies={companyOptions}
                value={field.value}
                onChange={(nextId) => field.onChange(nextId)}
                disabledCompanyId={customerCompanyId}
              />
            )}
          />
        </div>

        {customerCompanyId && contractorCompanyId && customerCompanyId === contractorCompanyId ? (
          <p className="text-sm text-red-600">Замовник і Виконавець не можуть бути однією компанією.</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          <Field label="Терміни виконання робіт" {...form.register("projectTimeline", { required: true })} />
          <Field label="Термін дії договору" {...form.register("contractDuration", { required: true })} />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#FFF7E5] p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-zinc-900">Підписант</div>

          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Замовник</div>
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="ПІБ (називний)" value={selectedCustomerCompany?.contractSignerFullNameNom ?? ""} />
              <ReadOnlyField label="ПІБ (родовий)" value={selectedCustomerCompany?.contractSignerFullNameGen ?? ""} />
              <ReadOnlyField label="Посада (називний)" value={selectedCustomerCompany?.contractSignerPositionNom ?? ""} />
              <ReadOnlyField label="Посада (родовий)" value={selectedCustomerCompany?.contractSignerPositionGen ?? ""} />
              <ReadOnlyField label="Діє на підставі" value={selectedCustomerCompany?.contractSignerActingUnder ?? ""} />
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-900">Виконавець</div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="ПІБ (називний)" {...form.register("signerFullNameNom", { required: true })} />
              <Field label="ПІБ (родовий)" {...form.register("signerFullNameGen", { required: true })} />
              <Field label="Посада (називний)" {...form.register("signerPositionNom", { required: true })} />
              <Field label="Посада (родовий)" {...form.register("signerPositionGen", { required: true })} />
              <Field label="Діє на підставі" {...form.register("signerActingUnder", { required: true })} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-900">{workType === "WORKS" ? "Перелік робіт" : "Перелік послуг"}</div>
          <LineItemsTable />
        </div>

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          >
            Зберегти
          </button>
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href="/contracts">
            Скасувати
          </a>
        </div>
      </form>
    </FormProvider>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <input {...props} className="h-10 rounded-md border px-3" />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <input value={value} readOnly className="h-10 rounded-md border px-3 bg-zinc-50" />
    </label>
  );
}

