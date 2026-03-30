"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { FiArrowRight, FiFileText, FiList, FiSave } from "react-icons/fi";
import { toast } from "sonner";

import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";
import { AcceptanceActReadonlyLineItems } from "@/components/acceptance-acts/AcceptanceActReadonlyLineItems";
import { UnsavedChangesNavigationDialog } from "@/components/forms/UnsavedChangesNavigationDialog";
import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";
import { formatMoney } from "@/lib/totals";

type InvoiceLine = {
  id: string;
  title: string;
  unit: string;
  quantity: string;
  price: string;
};

type InvoiceOpt = {
  id: string;
  label: string;
  number: string;
  workType: "WORKS" | "SERVICES";
  customerCompanyId: string;
  contractorCompanyId: string;
  lineItems: InvoiceLine[];
};

type CompanyOpt = {
  id: string;
  label: string;
  actSignerFullNameNom: string;
  actSignerFullNameGen: string;
  actSignerPositionNom: string;
  actSignerPositionGen: string;
};

type AcceptanceActValues = {
  invoiceId: string;
  date: string;
  signingLocation: string;
  completionDate: string;
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
  isSigned: boolean;
  isArchived: boolean;
};

type InvoiceSigner = {
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
};

export function AcceptanceActForm({
  invoices,
  companies,
  initialInvoiceId,
  defaultSigningLocation = "",
  onSubmit,
  onSubmitAndDownloadActDocx,
  signerPositionNomOptions,
  signerPositionGenOptions,
  signingLocationOptions,
  invoiceSignerById,
}: {
  invoices: InvoiceOpt[];
  companies: CompanyOpt[];
  initialInvoiceId: string;
  defaultSigningLocation?: string;
  onSubmit: (payload: AcceptanceActValues) => Promise<void>;
  onSubmitAndDownloadActDocx?: (payload: AcceptanceActValues) => Promise<void>;
  signerPositionNomOptions: string[];
  signerPositionGenOptions: string[];
  signingLocationOptions: string[];
  invoiceSignerById: Record<string, InvoiceSigner>;
}) {
  const initialSigner = invoiceSignerById[initialInvoiceId] ?? null;

  const form = useForm<AcceptanceActValues>({
    defaultValues: {
      invoiceId: initialInvoiceId,
      date: new Date().toISOString().slice(0, 10),
      signingLocation: defaultSigningLocation,
      completionDate: new Date().toISOString().slice(0, 10),
      signerFullNameNom: initialSigner?.signerFullNameNom ?? "",
      signerFullNameGen: initialSigner?.signerFullNameGen ?? "",
      signerPositionNom: initialSigner?.signerPositionNom ?? "",
      signerPositionGen: initialSigner?.signerPositionGen ?? "",
      isSigned: false,
      isArchived: false,
    },
    mode: "onBlur",
  });

  const watchedInvoiceId = form.watch("invoiceId");
  const hasPreparedDraftFromInvoice = Boolean(watchedInvoiceId);
  const shouldWarnOnLeave = form.formState.isDirty || hasPreparedDraftFromInvoice;
  const suppressBeforeUnloadOnce = useUnsavedChangesGuard(shouldWarnOnLeave);
  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.id === watchedInvoiceId) ?? null,
    [invoices, watchedInvoiceId],
  );

  const companyOptions = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.label })),
    [companies],
  );
  const companiesById = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies],
  );

  const customerCompany = selectedInvoice
    ? companiesById.get(selectedInvoice.customerCompanyId)
    : null;
  const contractorCompany = selectedInvoice
    ? companiesById.get(selectedInvoice.contractorCompanyId)
    : null;

  useEffect(() => {
    const nextSigner = watchedInvoiceId ? invoiceSignerById[watchedInvoiceId] : undefined;
    if (!nextSigner) return;
    form.setValue("signerFullNameNom", nextSigner.signerFullNameNom);
    form.setValue("signerFullNameGen", nextSigner.signerFullNameGen);
    form.setValue("signerPositionNom", nextSigner.signerPositionNom);
    form.setValue("signerPositionGen", nextSigner.signerPositionGen);
  }, [watchedInvoiceId, invoiceSignerById, form]);

  const lineHeading =
    selectedInvoice?.workType === "SERVICES" ? "Перелік послуг" : "Перелік робіт";

  const totals = useMemo(() => {
    const items = selectedInvoice?.lineItems ?? [];
    let totalWithoutVat = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const p = Number(it.price);
      if (Number.isFinite(q) && Number.isFinite(p)) totalWithoutVat += q * p;
    }
    const vat20 = totalWithoutVat * 0.2;
    const totalWithVat = totalWithoutVat + vat20;
    return { totalWithoutVat, vat20, totalWithVat };
  }, [selectedInvoice]);
  const [docLoading, setDocLoading] = useState(false);

  async function submitAct(values: AcceptanceActValues, options?: { allowRedirect?: boolean }) {
    const allowRedirect = options?.allowRedirect ?? true;
    try {
      await onSubmit(values);
    } catch (e) {
      if (isNextNavigationError(e)) {
        toast.success("Акт створено.");
        if (allowRedirect) throw e;
        return;
      }
      toast.error(getServerActionErrorMessage(e));
      throw e;
    }
  }

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => submitAct(values))}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm min-w-0">
            <span className="text-zinc-700">Рахунок (джерело)</span>
            <select className="h-10 rounded-md border px-3 bg-zinc-50" {...form.register("invoiceId", { required: true })}>
              <option value="" disabled>
                Оберіть рахунок…
              </option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <Field label="Дата завершення робіт (послуг)" type="date" {...form.register("completionDate", { required: true })} />
          <Controller
            name="signingLocation"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <SearchableDropdownOptionField
                label="Місце складання"
                scope="SIGNING_LOCATION"
                value={field.value ?? ""}
                onChange={(next) => field.onChange(next)}
                optionsFromBackend={signingLocationOptions}
                placeholder="Оберіть або введіть місце складання"
                inputClassName="bg-zinc-50"
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CompanySearchSelect
            label="Замовник"
            companies={companyOptions}
            value={selectedInvoice?.customerCompanyId ?? ""}
            onChange={() => {}}
            disabled
          />
          <CompanySearchSelect
            label="Виконавець"
            companies={companyOptions}
            value={selectedInvoice?.contractorCompanyId ?? ""}
            onChange={() => {}}
            disabled
          />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-foreground">Підписант</div>

          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Замовник</div>
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="ПІБ (називний)" value={customerCompany?.actSignerFullNameNom ?? ""} />
              <ReadOnlyField label="ПІБ (родовий)" value={customerCompany?.actSignerFullNameGen ?? ""} />
              <ReadOnlyField label="Посада (називний)" value={customerCompany?.actSignerPositionNom ?? ""} />
              <ReadOnlyField label="Посада (родовий)" value={customerCompany?.actSignerPositionGen ?? ""} />
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-900">Виконавець</div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="ПІБ (називний)" {...form.register("signerFullNameNom", { required: true })} />
              <Field label="ПІБ (родовий)" {...form.register("signerFullNameGen", { required: true })} />
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
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Оригінал і архів</div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-zinc-300" {...form.register("isSigned")} />
              <span className="text-foreground/90">Підписаний</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-zinc-300" {...form.register("isArchived")} />
              <span className="text-foreground/90">В архіві</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-foreground">{lineHeading}</div>
          <AcceptanceActReadonlyLineItems items={selectedInvoice?.lineItems ?? []} />
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1 border-t pt-3 text-sm tabular-nums text-zinc-700">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>Разом (без ПДВ):</span>
            <span>{formatMoney(totals.totalWithoutVat)}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>ПДВ 20%:</span>
            <span>{formatMoney(totals.vat20)}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 font-semibold text-foreground">
            <span>Разом з ПДВ:</span>
            <span>{formatMoney(totals.totalWithVat)}</span>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <button
            type="submit"
            className="crm-btn-primary inline-flex h-10 w-full items-center justify-center gap-2 md:w-auto"
          >
            <FiSave className="size-4 shrink-0" aria-hidden />
            Зберегти
          </button>
          <a
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm md:w-auto"
            href="/acceptance-acts"
          >
            <FiList className="size-4 shrink-0" aria-hidden />
            До списку актів
          </a>
          {selectedInvoice ? (
            <a
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted md:w-auto"
              href={`/invoices/${selectedInvoice.id}/edit`}
              aria-label={`Перейти до рахунку №${selectedInvoice.number}`}
              title={`Рахунок №${selectedInvoice.number}`}
            >
              <FiArrowRight className="size-4 shrink-0" aria-hidden />
              До рахунку
            </a>
          ) : null}
          {onSubmitAndDownloadActDocx ? (
            <button
              type="button"
              disabled={docLoading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted disabled:opacity-60 md:w-auto"
              onClick={() => {
                setDocLoading(true);
                void form
                  .handleSubmit(async (values) => {
                    try {
                      await onSubmitAndDownloadActDocx(values);
                    } catch (e) {
                      if (!isNextNavigationError(e)) toast.error(getServerActionErrorMessage(e));
                      throw e;
                    }
                  })()
                  .finally(() => setDocLoading(false));
              }}
              title="Зберегти акт і завантажити DOCX"
            >
              <FiFileText className="size-4 shrink-0" aria-hidden />
              Акт
            </button>
          ) : null}
        </div>
      </form>
      <UnsavedChangesNavigationDialog
        isDirty={shouldWarnOnLeave}
        suppressBeforeUnloadOnce={suppressBeforeUnloadOnce}
        onSaveAndProceed={async () => {
          const ok = await form.trigger();
          if (!ok) {
            toast.error("Заповніть обов’язкові поля перед збереженням.");
            throw new Error("VALIDATION_ERROR");
          }
          await form.handleSubmit(async (values) => submitAct(values, { allowRedirect: false }))();
        }}
      />
    </FormProvider>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>
      <input {...props} className="h-10 w-full min-w-0 rounded-md border bg-zinc-50 px-3" />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>
      <input value={value} readOnly className="h-10 w-full min-w-0 rounded-md border bg-zinc-50 px-3" />
    </label>
  );
}

