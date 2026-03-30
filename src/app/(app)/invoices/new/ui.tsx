"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { FiClipboard, FiFileText, FiList, FiSave } from "react-icons/fi";
import { toast } from "sonner";

import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import { QuickCreateCompanyModal } from "@/components/forms/QuickCreateCompanyModal";
import { UnsavedChangesNavigationDialog } from "@/components/forms/UnsavedChangesNavigationDialog";
import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";
import { invoicePartialSelectionStorageKey } from "@/lib/invoice-from-contract-session";
import { LineItemsTable } from "@/components/line-items/LineItemsTable";
import { SignedUpload } from "@/components/uploads/SignedUpload";
import type { SignedScanListItem } from "@/lib/signed-scans";

type InvoiceCompanyRow = {
  id: string;
  label: string;
  invoiceSignerFullNameNom: string;
  invoiceSignerPositionNom: string;
};

type ContractSeedItem = {
  id: string;
  title: string;
  unit: string;
  /** Default quantity for the invoice row (= remaining on the contract line). */
  quantity: number;
  price: number;
  remaining: number;
};

type ContractSeed = {
  id: string;
  /** Номер договору в базі. */
  number: string;
  /** Дата договору (YYYY-MM-DD). */
  contractDateIso: string;
  workType: "WORKS" | "SERVICES";
  customerCompanyId: string;
  contractorCompanyId: string;
  items: ContractSeedItem[];
};

function formatContractDateUk(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("uk-UA");
}

export type InvoiceFormValues = {
  date: string;
  workType: "WORKS" | "SERVICES";
  customerCompanyId: string;
  contractorCompanyId: string;
  contractId?: string | null;
  isExternalContract: boolean;
  externalContractNumber?: string | null;
  externalContractDate?: string | null;
  signerFullNameNom: string;
  signerPositionNom: string;
  items: Array<{ title: string; unit: string; quantity: number; price: number; sourceContractLineItemId?: string | null }>;
};

export function InvoiceForm({
  mode = "create",
  companies,
  contract,
  defaultInvoiceSigner = { signerFullNameNom: "", signerPositionNom: "" },
  lineItemUnitOptions,
  partialSelection = false,
  quickCreateDropdowns,
  editInitialValues,
  invoiceId,
  signedScansInitial,
  cancelHref = "/invoices",
  readonlyInvoiceNumber,
  previewInvoiceNumberInitial,
  existingAcceptanceActId,
  onSubmit,
  onSubmitAndCreateAcceptanceAct,
  onSubmitAndDownloadInvoiceDocx,
}: {
  mode?: "create" | "edit";
  companies: InvoiceCompanyRow[];
  contract: ContractSeed | null;
  defaultInvoiceSigner?: { signerFullNameNom: string; signerPositionNom: string };
  lineItemUnitOptions: string[];
  partialSelection?: boolean;
  quickCreateDropdowns: {
    taxStatusOptions: string[];
    signerPositionNomOptions: string[];
    signerPositionGenOptions: string[];
    actingUnderOptions: string[];
  };
  /** Full form snapshot when `mode === "edit"`. */
  editInitialValues?: InvoiceFormValues;
  invoiceId?: string;
  signedScansInitial?: SignedScanListItem[];
  cancelHref?: string;
  /** Існуючий номер у режимі редагування (лише читання). */
  readonlyInvoiceNumber?: string;
  /** Попередній перегляд номера для нового рахунку (залежить від дати в формі). */
  previewInvoiceNumberInitial?: string;
  /** Якщо для рахунку вже є акт — показуємо посилання на нього замість «Сформувати акт». */
  existingAcceptanceActId?: string | null;
  onSubmit: (payload: InvoiceFormValues) => Promise<void>;
  onSubmitAndCreateAcceptanceAct?: (payload: InvoiceFormValues) => Promise<void>;
  onSubmitAndDownloadInvoiceDocx?: (payload: InvoiceFormValues) => Promise<void>;
}) {
  const defaultValues = useMemo((): InvoiceFormValues => {
    if (mode === "edit" && editInitialValues) {
      return editInitialValues;
    }

    const itemsFromContract =
      contract?.items?.length && !(contract.id && partialSelection)
        ? contract.items.map((it) => ({
            title: it.title,
            unit: it.unit,
            quantity: it.remaining,
            price: it.price,
            sourceContractLineItemId: it.id,
          }))
        : null;

    return {
      date: new Date().toISOString().slice(0, 10),
      workType: contract?.id ? contract.workType : "WORKS",
      customerCompanyId: contract?.customerCompanyId ?? "",
      contractorCompanyId: contract?.contractorCompanyId ?? "",
      contractId: contract?.id ?? null,
      isExternalContract: false,
      externalContractNumber: null,
      externalContractDate: null,
      signerFullNameNom: contract?.id ? defaultInvoiceSigner.signerFullNameNom : "",
      signerPositionNom: contract?.id ? defaultInvoiceSigner.signerPositionNom : "",
      items: itemsFromContract?.length
        ? itemsFromContract
        : [{ title: "", unit: "", quantity: 0, price: 0, sourceContractLineItemId: null }],
    };
  }, [mode, editInitialValues, contract, partialSelection, defaultInvoiceSigner]);

  const form = useForm<InvoiceFormValues>({
    defaultValues,
    mode: "onBlur",
  });
  const router = useRouter();

  const formDate = form.watch("date");
  const [invoicePreviewNumber, setInvoicePreviewNumber] = useState(
    () => previewInvoiceNumberInitial ?? "—",
  );

  const [actLoading, setActLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    if (readonlyInvoiceNumber) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/invoices/preview-number?date=${encodeURIComponent(formDate)}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data?: { number: string } };
        if (json.data?.number && !cancelled) setInvoicePreviewNumber(json.data.number);
      } catch {
        /* ignore preview failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formDate, readonlyInvoiceNumber]);

  const [companiesState, setCompaniesState] = useState(companies);
  const [companyModalFor, setCompanyModalFor] = useState<"customer" | "contractor" | null>(null);

  useEffect(() => {
    setCompaniesState(companies);
  }, [companies]);

  const partialHydratedRef = useRef(false);

  useEffect(() => {
    if (mode === "edit") return;
    if (!contract?.id || !partialSelection || partialHydratedRef.current) return;
    const requestKey = invoicePartialSelectionStorageKey(contract.id);
    const raw = sessionStorage.getItem(requestKey);
    if (!raw) return;

    partialHydratedRef.current = true;
    sessionStorage.removeItem(requestKey);

    let parsed: { lines?: Array<{ sourceContractLineItemId: string; quantity: number }> };
    try {
      parsed = JSON.parse(raw) as { lines?: Array<{ sourceContractLineItemId: string; quantity: number }> };
    } catch {
      toast.error("Некоректні дані вибору позицій.");
      partialHydratedRef.current = false;
      return;
    }

    const byId = new Map(contract.items.map((it) => [it.id, it]));
    const built: InvoiceFormValues["items"] = [];
    for (const line of parsed.lines ?? []) {
      const src = byId.get(line.sourceContractLineItemId);
      if (!src || src.remaining <= 0) continue;
      const qty = Math.min(Math.max(0, Number(line.quantity) || 0), src.remaining);
      if (qty <= 0) continue;
      built.push({
        title: src.title,
        unit: src.unit,
        quantity: qty,
        price: src.price,
        sourceContractLineItemId: src.id,
      });
    }

    if (built.length === 0) {
      toast.error("Жодна з обраних позицій не має доступного залишку.");
      partialHydratedRef.current = false;
      return;
    }

    form.reset({
      ...form.getValues(),
      items: built,
    });
  }, [mode, contract, partialSelection, form]);

  const isFromContract = Boolean(contract?.id);
  const hasPreparedDraftFromContract = mode === "create" && isFromContract;
  const shouldWarnOnLeave = form.formState.isDirty || hasPreparedDraftFromContract;
  const suppressBeforeUnloadOnce = useUnsavedChangesGuard(shouldWarnOnLeave);
  const customerCompanyId = form.watch("customerCompanyId");
  const contractorCompanyId = form.watch("contractorCompanyId");

  const companiesById = useMemo(() => new Map(companiesState.map((c) => [c.id, c])), [companiesState]);
  const selectedContractorCompany = contractorCompanyId ? companiesById.get(contractorCompanyId) : null;
  const companyOptions = useMemo(() => companiesState.map((c) => ({ id: c.id, label: c.label })), [companiesState]);

  useEffect(() => {
    if (isFromContract) return;

    if (!selectedContractorCompany) {
      if (!contractorCompanyId) {
        form.setValue("signerFullNameNom", "", { shouldDirty: true });
        form.setValue("signerPositionNom", "", { shouldDirty: true });
      }
      return;
    }

    const setIfDifferent = (key: "signerFullNameNom" | "signerPositionNom", nextValue: string) => {
      const currentValue = form.getValues(key);
      if (currentValue === nextValue) return;
      form.setValue(key, nextValue, { shouldDirty: true });
    };

    setIfDifferent("signerFullNameNom", selectedContractorCompany.invoiceSignerFullNameNom);
    setIfDifferent("signerPositionNom", selectedContractorCompany.invoiceSignerPositionNom);
  }, [contractorCompanyId, selectedContractorCompany, form, isFromContract]);

  useEffect(() => {
    if (isFromContract) return;
    if (!customerCompanyId || !contractorCompanyId) return;
    if (customerCompanyId !== contractorCompanyId) return;

    form.setValue("contractorCompanyId", "", { shouldDirty: true });
    form.setValue("signerFullNameNom", "", { shouldDirty: true });
    form.setValue("signerPositionNom", "", { shouldDirty: true });
  }, [customerCompanyId, contractorCompanyId, form, isFromContract]);

  const remainingBySourceId = useMemo(
    () => new Map(contract?.items.map((it) => [it.id, it.remaining]) ?? []),
    [contract?.items],
  );

  const contractLineCatalog = useMemo(
    () =>
      (contract?.items ?? []).map((it) => ({
        id: it.id,
        title: it.title,
        unit: it.unit,
        price: it.price,
        remaining: it.remaining,
      })),
    [contract?.items],
  );

  const lineItemsHeading = isFromContract
    ? contract?.workType === "SERVICES"
      ? "Перелік послуг"
      : "Перелік робіт"
    : form.watch("workType") === "SERVICES"
      ? "Перелік послуг"
      : "Перелік робіт";

  async function submitInvoice(values: InvoiceFormValues, options?: { allowRedirect?: boolean }) {
    const allowRedirect = options?.allowRedirect ?? true;
    if (!isFromContract && values.customerCompanyId === values.contractorCompanyId) {
      toast.error("Замовник і виконавець не можуть бути однією компанією.");
      throw new Error("VALIDATION_ERROR");
    }

    if (contract?.id) {
      for (const row of values.items) {
        if (!row.sourceContractLineItemId) {
          toast.error("Кожна позиція має бути прив’язана до рядка договору.");
          throw new Error("VALIDATION_ERROR");
        }
      }
      const qtyBySource = new Map<string, number>();
      for (const row of values.items) {
        if (!row.sourceContractLineItemId) continue;
        const id = row.sourceContractLineItemId;
        qtyBySource.set(id, (qtyBySource.get(id) ?? 0) + row.quantity);
      }
      for (const [sourceId, sumQty] of qtyBySource) {
        const max = remainingBySourceId.get(sourceId);
        if (max === undefined) {
          toast.error("У рахунку є позиція з прив’язкою до договору, якої немає в поточних залишках.");
          throw new Error("VALIDATION_ERROR");
        }
        if (sumQty > max + 1e-9) {
          toast.error(`Сума кількостей по одній позиції договору перевищує залишок (макс. ${max}).`);
          throw new Error("VALIDATION_ERROR");
        }
      }
    }

    try {
      await onSubmit(values);
      if (mode === "edit") {
        toast.success("Рахунок збережено.");
        router.refresh();
        form.reset(values);
      }
    } catch (e) {
      if (isNextNavigationError(e)) {
        toast.success("Рахунок створено.");
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
        onSubmit={form.handleSubmit(async (values) => submitInvoice(values))}
      >
        {mode === "create" ? (
          !isFromContract ? (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Окремий рахунок без договору або відповідно до зовнішнього договору.
            </p>
          ) : (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Рахунок на основі договору: сторони та тип фіксовані договором; кількість по прив’язаних позиціях не більше
              залишку.
            </p>
          )
        ) : isFromContract && contract ? (
          <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Рахунок до існуючого в базі договору №{contract.number} від{" "}
            {formatContractDateUk(contract.contractDateIso)}.
          </p>
        ) : (
          <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Окремий рахунок: доступні всі поля та позиції.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReadOnlyField
            label="Номер рахунку"
            hint={
              readonlyInvoiceNumber
                ? undefined
                : "Присвоюється автоматично при збереженні (залежить від дати)."
            }
            value={readonlyInvoiceNumber ?? invoicePreviewNumber}
          />
          <Field label="Дата" type="date" {...form.register("date", { required: true })} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Тип</span>
            <select
              className="h-10 rounded-md border px-3 disabled:bg-zinc-50"
              disabled={isFromContract}
              {...form.register("workType", { required: true })}
            >
              <option value="WORKS">Роботи</option>
              <option value="SERVICES">Послуги</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {isFromContract ? (
            <>
              <Controller
                name="customerCompanyId"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CompanySearchSelect
                    label="Замовник"
                    companies={companyOptions}
                    value={field.value}
                    onChange={field.onChange}
                    disabled
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
                    companies={companyOptions}
                    value={field.value}
                    onChange={field.onChange}
                    disabled
                  />
                )}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              disabled={isFromContract}
              {...form.register("isExternalContract")}
            />
            <span>Зовнішній договір</span>
          </label>
        </div>

        {form.watch("isExternalContract") ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Номер договору (зовнішній)"
              disabled={isFromContract}
              {...form.register("externalContractNumber", { required: true })}
            />
            <Field
              label="Дата договору (зовнішній)"
              type="date"
              disabled={isFromContract}
              {...form.register("externalContractDate", { required: true })}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-foreground">Підписант (виконавець)</div>
          <Field
            label="ПІБ (називний)"
            disabled={isFromContract}
            {...form.register("signerFullNameNom", { required: true })}
          />
          {isFromContract ? (
            <Field
              label="Посада (називний)"
              disabled={isFromContract}
              {...form.register("signerPositionNom", { required: true })}
            />
          ) : (
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
                  optionsFromBackend={quickCreateDropdowns.signerPositionNomOptions}
                  placeholder="Оберіть або введіть посаду"
                  inputClassName="bg-zinc-50"
                />
              )}
            />
          )}
        </div>

        {mode === "edit" && invoiceId ? (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">Документ</div>
            <SignedUpload entityType="INVOICE" entityId={invoiceId} initialScans={signedScansInitial} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-foreground">{lineItemsHeading}</div>
          <LineItemsTable
            unitOptionsFromBackend={lineItemUnitOptions}
            contractInvoiceMode={isFromContract}
            contractLineCatalog={contractLineCatalog}
          />
          {isFromContract ? (
            <p className="text-xs text-zinc-500">
              Кількість по кожній прив’язаній позиції не може перевищити залишок (уже з урахуванням попередніх рахунків).
            </p>
          ) : null}
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
            href={cancelHref}
          >
            <FiList className="size-4 shrink-0" aria-hidden />
            До списку рахунків
          </a>
          {mode === "create" && onSubmitAndDownloadInvoiceDocx ? (
            <button
              type="button"
              disabled={docLoading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted disabled:opacity-60 md:w-auto"
              onClick={() => {
                setDocLoading(true);
                void form
                  .handleSubmit(async (values) => {
                    try {
                      await onSubmitAndDownloadInvoiceDocx(values);
                    } catch (e) {
                      if (!isNextNavigationError(e)) toast.error(getServerActionErrorMessage(e));
                      throw e;
                    }
                  })()
                  .finally(() => setDocLoading(false));
              }}
              title="Зберегти рахунок і сформувати DOCX"
            >
              <FiFileText className="size-4 shrink-0" aria-hidden />
              Рахунок
            </button>
          ) : null}
          {mode === "create" && onSubmitAndCreateAcceptanceAct ? (
            <button
              type="button"
              disabled={actLoading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted disabled:opacity-60 md:w-auto"
              onClick={() => {
                setActLoading(true);
                void form
                  .handleSubmit(async (values) => {
                    try {
                      await onSubmitAndCreateAcceptanceAct(values);
                    } catch (e) {
                      if (!isNextNavigationError(e)) toast.error(getServerActionErrorMessage(e));
                      throw e;
                    }
                  })()
                  .finally(() => setActLoading(false));
              }}
              title="Зберегти рахунок і перейти до створення акта"
            >
              <FiClipboard className="size-4 shrink-0" aria-hidden />
              Сформувати акт
            </button>
          ) : null}
          {mode === "edit" && invoiceId ? (
            <>
              <a
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted md:w-auto"
                href={`/api/documents/invoice/${invoiceId}`}
                aria-label="Завантажити рахунок (DOCX)"
                title="Завантажити DOCX"
              >
                <FiFileText className="size-4 shrink-0" aria-hidden />
                Рахунок
              </a>
              {existingAcceptanceActId ? (
                <a
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted md:w-auto"
                  href={`/acceptance-acts/${existingAcceptanceActId}`}
                  title="Для цього рахунку вже створено акт приймання-передачі"
                >
                  <FiClipboard className="size-4 shrink-0" aria-hidden />
                  Відкрити акт
                </a>
              ) : (
                <a
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted md:w-auto"
                  href={`/acceptance-acts/new?invoiceId=${invoiceId}`}
                  title="Створити акт приймання-передачі на основі цього рахунку (позиції копіюються з рахунку)"
                >
                  <FiClipboard className="size-4 shrink-0" aria-hidden />
                  Сформувати акт
                </a>
              )}
            </>
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
          await form.handleSubmit(async (values) => submitInvoice(values, { allowRedirect: false }))();
        }}
      />
      <QuickCreateCompanyModal
        open={companyModalFor !== null}
        onOpenChange={(next) => {
          if (!next) setCompanyModalFor(null);
        }}
        taxStatusOptions={quickCreateDropdowns.taxStatusOptions}
        signerPositionNomOptions={quickCreateDropdowns.signerPositionNomOptions}
        signerPositionGenOptions={quickCreateDropdowns.signerPositionGenOptions}
        actingUnderOptions={quickCreateDropdowns.actingUnderOptions}
        onCreated={(company) => {
          const row: InvoiceCompanyRow = {
            id: company.id,
            label: company.label,
            invoiceSignerFullNameNom: company.invoiceSignerFullNameNom,
            invoiceSignerPositionNom: company.invoiceSignerPositionNom,
          };
          setCompaniesState((prev) => [row, ...prev.filter((c) => c.id !== row.id)]);
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

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>
      <input
        {...props}
        className="h-10 w-full min-w-0 rounded-md border bg-zinc-50 px-3 disabled:bg-zinc-50"
      />
    </label>
  );
}
