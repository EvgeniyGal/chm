"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";

import { LineItemsTable } from "@/components/line-items/LineItemsTable";
import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { SigningLocationField } from "@/components/forms/SigningLocationField";
import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import { UnsavedChangesNavigationDialog } from "@/components/forms/UnsavedChangesNavigationDialog";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";
import { QuickCreateCompanyModal } from "@/components/forms/QuickCreateCompanyModal";

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
  items: Array<{ title: string; unit: string; quantity: number | string; price: number | string }>;
};

function toDecimal(value: number | string): number {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : 0;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function downloadTreatyDocx(
  variant: "full" | "short",
  values: ContractFormValues,
  contractNumberPreview: string,
) {
  const items = values.items.map((item) => ({
    title: item.title,
    unit: item.unit,
    quantity: toDecimal(item.quantity),
    price: toDecimal(item.price),
  }));
  const res = await fetch("/api/contracts/generate-treaty", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      variant,
      contractNumber: contractNumberPreview.trim() || undefined,
      date: values.date,
      signingLocation: values.signingLocation,
      workType: values.workType,
      customerCompanyId: values.customerCompanyId,
      contractorCompanyId: values.contractorCompanyId,
      projectTimeline: values.projectTimeline,
      contractDuration: values.contractDuration,
      signerFullNameNom: values.signerFullNameNom,
      signerFullNameGen: values.signerFullNameGen,
      signerPositionNom: values.signerPositionNom,
      signerPositionGen: values.signerPositionGen,
      signerActingUnder: values.signerActingUnder,
      items,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? "GENERATE_FAILED");
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition");
  const fn = cd?.match(/filename="([^"]+)"/)?.[1] ?? `treaty-${variant}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fn;
  a.click();
  URL.revokeObjectURL(url);
}

export function ContractForm({
  companies,
  signingLocationOptions,
  taxStatusOptions,
  signerPositionNomOptions,
  signerPositionGenOptions,
  actingUnderOptions,
  projectTimelineOptions,
  contractDurationOptions,
  lineItemUnitOptions,
  initialContractNumber,
  onSubmit,
}: {
  companies: CompanyOpt[];
  signingLocationOptions: string[];
  taxStatusOptions: string[];
  signerPositionNomOptions: string[];
  signerPositionGenOptions: string[];
  actingUnderOptions: string[];
  projectTimelineOptions: string[];
  contractDurationOptions: string[];
  lineItemUnitOptions: string[];
  initialContractNumber: string;
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

  const suppressBeforeUnloadOnce = useUnsavedChangesGuard(form.formState.isDirty);
  const workType = form.watch("workType");
  const customerCompanyId = form.watch("customerCompanyId");
  const contractorCompanyId = form.watch("contractorCompanyId");

  const [companiesState, setCompaniesState] = useState(companies);
  const [companyModalFor, setCompanyModalFor] = useState<"customer" | "contractor" | null>(null);
  const companiesById = useMemo(() => new Map(companiesState.map((c) => [c.id, c])), [companiesState]);
  const selectedCustomerCompany = customerCompanyId ? companiesById.get(customerCompanyId) : null;
  const selectedContractorCompany = contractorCompanyId ? companiesById.get(contractorCompanyId) : null;
  const companyOptions = useMemo(() => companiesState.map((c) => ({ id: c.id, label: c.label })), [companiesState]);
  const [customerSignerPositionNom, setCustomerSignerPositionNom] = useState("");
  const [customerSignerPositionGen, setCustomerSignerPositionGen] = useState("");
  const [customerSignerActingUnder, setCustomerSignerActingUnder] = useState("");
  const [treatyLoading, setTreatyLoading] = useState<null | "full" | "short">(null);
  const [treatyError, setTreatyError] = useState<string | null>(null);
  const [previewContractNumber, setPreviewContractNumber] = useState(initialContractNumber);

  const contractDate = form.watch("date");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/contracts/preview-number?date=${encodeURIComponent(contractDate)}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data?: { number: string } };
        if (!cancelled && json.data?.number) {
          setPreviewContractNumber(json.data.number);
        }
      } catch {
        /* ignore preview failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractDate]);

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

  useEffect(() => {
    if (!selectedCustomerCompany) {
      setCustomerSignerPositionNom("");
      setCustomerSignerPositionGen("");
      setCustomerSignerActingUnder("");
      return;
    }
    setCustomerSignerPositionNom(selectedCustomerCompany.contractSignerPositionNom ?? "");
    setCustomerSignerPositionGen(selectedCustomerCompany.contractSignerPositionGen ?? "");
    setCustomerSignerActingUnder(selectedCustomerCompany.contractSignerActingUnder ?? "");
  }, [selectedCustomerCompany]);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit({
              ...values,
              items: values.items.map((item) => ({
                ...item,
                quantity: toDecimal(item.quantity),
                price: toDecimal(item.price),
              })),
            });
          } catch (e) {
            if (isNextNavigationError(e)) {
              toast.success("Договір створено.");
              throw e;
            }
            toast.error(getServerActionErrorMessage(e));
          }
        })}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <ReadOnlyField
            label="Номер договору"
            hint="Присвоюється автоматично при збереженні (залежить від дати)."
            value={previewContractNumber}
          />
          <Field label="Дата" type="date" {...form.register("date", { required: true })} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Тип</span>
            <select className="h-10 rounded-md border px-3" {...form.register("workType", { required: true })}>
              <option value="WORKS">Роботи</option>
              <option value="SERVICES">Послуги</option>
            </select>
          </label>
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
              <div className="flex flex-col gap-1 text-sm min-w-0">
                <span className="text-zinc-700">Замовник</span>
                <div className="flex w-full flex-nowrap items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <CompanySearchSelect
                      label=""
                      placeholder="Оберіть компанію…"
                      companies={companyOptions}
                      value={field.value}
                      onChange={(nextId) => field.onChange(nextId)}
                      disabledCompanyId={contractorCompanyId}
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50"
                    aria-label="Додати компанію для Замовника"
                    title="Додати компанію"
                    onClick={() => setCompanyModalFor("customer")}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          />

          <Controller
            name="contractorCompanyId"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <div className="flex flex-col gap-1 text-sm min-w-0">
                <span className="text-zinc-700">Виконавець</span>
                <div className="flex w-full flex-nowrap items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <CompanySearchSelect
                      label=""
                      placeholder="Оберіть компанію…"
                      companies={companyOptions}
                      value={field.value}
                      onChange={(nextId) => field.onChange(nextId)}
                      disabledCompanyId={customerCompanyId}
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50"
                    aria-label="Додати компанію для Виконавця"
                    title="Додати компанію"
                    onClick={() => setCompanyModalFor("contractor")}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          />
        </div>

        {customerCompanyId && contractorCompanyId && customerCompanyId === contractorCompanyId ? (
          <p className="text-sm text-red-600">Замовник і Виконавець не можуть бути однією компанією.</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            name="projectTimeline"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <SearchableDropdownOptionField
                label="Терміни виконання робіт"
                scope="PROJECT_TIMELINE"
                value={field.value ?? ""}
                onChange={(next) => field.onChange(next)}
                optionsFromBackend={projectTimelineOptions}
                placeholder="Оберіть або введіть терміни"
                inputClassName="bg-zinc-50"
                multiline
                rows={3}
                listFirstLineOnly
              />
            )}
          />
          <Controller
            name="contractDuration"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <SearchableDropdownOptionField
                label="Термін дії договору"
                scope="CONTRACT_DURATION"
                value={field.value ?? ""}
                onChange={(next) => field.onChange(next)}
                optionsFromBackend={contractDurationOptions}
                placeholder="Оберіть або введіть термін"
                inputClassName="bg-zinc-50"
                multiline
                rows={3}
                listFirstLineOnly
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-foreground">Підписант</div>

          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Замовник</div>
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="ПІБ (називний)" value={selectedCustomerCompany?.contractSignerFullNameNom ?? ""} />
              <ReadOnlyField label="ПІБ (родовий)" value={selectedCustomerCompany?.contractSignerFullNameGen ?? ""} />
              <SearchableDropdownOptionField
                label="Посада (називний)"
                scope="SIGNER_POSITION_NOM"
                value={customerSignerPositionNom}
                onChange={setCustomerSignerPositionNom}
                optionsFromBackend={signerPositionNomOptions}
                placeholder="Оберіть або введіть посаду"
                required={false}
                inputClassName="bg-zinc-50"
              />
              <SearchableDropdownOptionField
                label="Посада (родовий)"
                scope="SIGNER_POSITION_GEN"
                value={customerSignerPositionGen}
                onChange={setCustomerSignerPositionGen}
                optionsFromBackend={signerPositionGenOptions}
                placeholder="Оберіть або введіть посаду"
                required={false}
                inputClassName="bg-zinc-50"
              />
              <SearchableDropdownOptionField
                label="Діє на підставі"
                scope="ACTING_UNDER"
                value={customerSignerActingUnder}
                onChange={setCustomerSignerActingUnder}
                optionsFromBackend={actingUnderOptions}
                placeholder="Оберіть або введіть підставу"
                required={false}
                inputClassName="bg-zinc-50"
              />
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-900">Виконавець</div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="ПІБ (називний)" inputClassName="bg-zinc-50" {...form.register("signerFullNameNom", { required: true })} />
              <Field label="ПІБ (родовий)" inputClassName="bg-zinc-50" {...form.register("signerFullNameGen", { required: true })} />
              <Controller
                name="signerPositionNom"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <SearchableDropdownOptionField
                    label="Посада (називний)"
                    scope="SIGNER_POSITION_NOM"
                    value={field.value ?? ""}
                    onChange={(next) => field.onChange(next)}
                    optionsFromBackend={signerPositionNomOptions}
                    placeholder="Оберіть або введіть посаду"
                    inputClassName="bg-zinc-50"
                  />
                )}
              />
              <Controller
                name="signerPositionGen"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <SearchableDropdownOptionField
                    label="Посада (родовий)"
                    scope="SIGNER_POSITION_GEN"
                    value={field.value ?? ""}
                    onChange={(next) => field.onChange(next)}
                    optionsFromBackend={signerPositionGenOptions}
                    placeholder="Оберіть або введіть посаду"
                    inputClassName="bg-zinc-50"
                  />
                )}
              />
              <Controller
                name="signerActingUnder"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <SearchableDropdownOptionField
                    label="Діє на підставі"
                    scope="ACTING_UNDER"
                    value={field.value ?? ""}
                    onChange={(next) => field.onChange(next)}
                    optionsFromBackend={actingUnderOptions}
                    placeholder="Оберіть або введіть підставу"
                    inputClassName="bg-zinc-50"
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-foreground">{workType === "WORKS" ? "Перелік робіт" : "Перелік послуг"}</div>
          <LineItemsTable unitOptionsFromBackend={lineItemUnitOptions} />
        </div>

        {treatyError ? (
          <p className="text-sm text-red-600" role="alert">
            {treatyError}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="crm-btn-primary"
          >
            Зберегти
          </button>
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href="/contracts">
            Скасувати
          </a>
          <button
            type="button"
            disabled={!!treatyLoading}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
            onClick={async () => {
              setTreatyError(null);
              const ok = await form.trigger();
              if (!ok) {
                const msg = "Заповніть усі обов’язкові поля перед формуванням договору.";
                setTreatyError(msg);
                toast.error(msg);
                return;
              }
              setTreatyLoading("full");
              try {
                const v = form.getValues();
                await downloadTreatyDocx(
                  "full",
                  {
                    ...v,
                    items: v.items.map((item) => ({
                      ...item,
                      quantity: toDecimal(item.quantity),
                      price: toDecimal(item.price),
                    })),
                  },
                  previewContractNumber,
                );
                toast.success("Документ завантажено.");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Не вдалося сформувати файл.";
                setTreatyError(msg);
                toast.error(msg);
              } finally {
                setTreatyLoading(null);
              }
            }}
          >
            {treatyLoading === "full" ? "…" : "Повний договір"}
          </button>
          <button
            type="button"
            disabled={!!treatyLoading}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
            onClick={async () => {
              setTreatyError(null);
              const ok = await form.trigger();
              if (!ok) {
                const msg = "Заповніть усі обов’язкові поля перед формуванням договору.";
                setTreatyError(msg);
                toast.error(msg);
                return;
              }
              setTreatyLoading("short");
              try {
                const v = form.getValues();
                await downloadTreatyDocx(
                  "short",
                  {
                    ...v,
                    items: v.items.map((item) => ({
                      ...item,
                      quantity: toDecimal(item.quantity),
                      price: toDecimal(item.price),
                    })),
                  },
                  previewContractNumber,
                );
                toast.success("Документ завантажено.");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Не вдалося сформувати файл.";
                setTreatyError(msg);
                toast.error(msg);
              } finally {
                setTreatyLoading(null);
              }
            }}
          >
            {treatyLoading === "short" ? "…" : "Скорочений договір"}
          </button>
        </div>
      </form>
      <UnsavedChangesNavigationDialog
        isDirty={form.formState.isDirty}
        suppressBeforeUnloadOnce={suppressBeforeUnloadOnce}
      />
      <QuickCreateCompanyModal
        open={companyModalFor !== null}
        onOpenChange={(next) => {
          if (!next) setCompanyModalFor(null);
        }}
        taxStatusOptions={taxStatusOptions}
        signerPositionNomOptions={signerPositionNomOptions}
        signerPositionGenOptions={signerPositionGenOptions}
        actingUnderOptions={actingUnderOptions}
        onCreated={(company) => {
          setCompaniesState((prev) => [company, ...prev.filter((c) => c.id !== company.id)]);
          if (companyModalFor === "customer") {
            form.setValue("customerCompanyId", company.id, { shouldDirty: true });
          } else if (companyModalFor === "contractor") {
            form.setValue("contractorCompanyId", company.id, { shouldDirty: true });
          }
          setCompanyModalFor(null);
        }}
      />
    </FormProvider>
  );
}

function Field({
  label,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  inputClassName?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>
      <input {...props} className={`h-10 w-full min-w-0 rounded-md border px-3 ${inputClassName ?? ""}`} />
    </label>
  );
}

function ReadOnlyField({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={value}
        readOnly
        tabIndex={-1}
        aria-readonly="true"
        className="h-10 w-full min-w-0 cursor-default rounded-md border border-border bg-muted px-3 text-foreground"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}


