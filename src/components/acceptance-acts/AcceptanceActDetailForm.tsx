"use client";

import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { FiArrowRight, FiFileText, FiList } from "react-icons/fi";
import { toast } from "sonner";

import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";
import { UnsavedChangesNavigationDialog } from "@/components/forms/UnsavedChangesNavigationDialog";
import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { SignedUpload } from "@/components/uploads/SignedUpload";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";
import { formatMoney } from "@/lib/totals";
import type { SignedScanListItem } from "@/lib/signed-scans";
import { cn } from "@/lib/utils";

const READONLY_CELL =
  "box-border whitespace-normal py-2 align-middle overflow-hidden px-3 text-sm";

type LineRow = {
  id: string;
  title: string;
  unit: string;
  quantity: string;
  price: string;
};

type ActEditValues = {
  signingLocation: string;
  completionDate: string;
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
  isSigned: boolean;
  isArchived: boolean;
};

export function AcceptanceActDetailForm({
  actId,
  actNumber,
  actDateIso,
  signingLocation,
  signingLocationOptions,
  completionDateIso,
  customerCompanyId,
  contractorCompanyId,
  companies,
  signerFullNameNom,
  signerFullNameGen,
  signerPositionNom,
  signerPositionGen,
  isSigned,
  isArchived,
  signerPositionNomOptions,
  signerPositionGenOptions,
  totalWithoutVat,
  vat20,
  totalWithVat,
  workType,
  lineItems,
  invoice,
  contract,
  signedScansInitial,
  canEdit,
  onSave,
}: {
  actId: string;
  actNumber: string;
  actDateIso: string;
  signingLocation: string;
  signingLocationOptions: string[];
  completionDateIso: string;
  customerCompanyId: string;
  contractorCompanyId: string;
  companies: Array<{
    id: string;
    label: string;
    actSignerFullNameNom: string;
    actSignerFullNameGen: string;
    actSignerPositionNom: string;
    actSignerPositionGen: string;
  }>;
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
  isSigned: boolean;
  isArchived: boolean;
  signerPositionNomOptions: string[];
  signerPositionGenOptions: string[];
  totalWithoutVat: string;
  vat20: string;
  totalWithVat: string;
  workType: "WORKS" | "SERVICES";
  lineItems: LineRow[];
  invoice: { id: string; number: string };
  contract: { id: string; number: string } | null;
  signedScansInitial: SignedScanListItem[];
  canEdit: boolean;
  onSave: (values: ActEditValues) => Promise<void>;
}) {
  const router = useRouter();
  const lineHeading = workType === "SERVICES" ? "Перелік послуг" : "Перелік робіт";
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const customerSigner = companiesById.get(customerCompanyId);

  const form = useForm<ActEditValues>({
    defaultValues: {
      signingLocation,
      completionDate: completionDateIso.slice(0, 10),
      signerFullNameNom,
      signerFullNameGen,
      signerPositionNom,
      signerPositionGen,
      isSigned,
      isArchived,
    },
    mode: "onBlur",
  });

  const { register } = form;
  const suppressBeforeUnloadOnce = useUnsavedChangesGuard(canEdit && form.formState.isDirty);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-4"
        onSubmit={
          canEdit
            ? form.handleSubmit(async (values) => {
                try {
                  await onSave(values);
                  toast.success("Акт збережено.");
                  router.refresh();
                  form.reset(values);
                } catch (e) {
                  if (isNextNavigationError(e)) throw e;
                  toast.error(getServerActionErrorMessage(e));
                }
              })
            : (e) => e.preventDefault()
        }
      >
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Акт приймання-передачі створено на основі рахунку; позиції та суми відповідають рахунку на момент створення акту.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReadOnlyField label="Номер акту" value={actNumber} />
          <Field
            label="Дата завершення робіт (послуг)"
            type="date"
            disabled={!canEdit}
            {...register("completionDate", { required: true })}
          />
          {canEdit ? (
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
          ) : (
            <ReadOnlyField label="Місце складання" value={signingLocation} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CompanySearchSelect
            label="Замовник"
            companies={companies}
            value={customerCompanyId}
            onChange={() => {}}
            disabled
          />
          <CompanySearchSelect
            label="Виконавець"
            companies={companies}
            value={contractorCompanyId}
            onChange={() => {}}
            disabled
          />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Джерело:</span>
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href={`/invoices/${invoice.id}/edit`}
          >
            Рахунок №{invoice.number}
          </a>
          {contract ? (
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href={`/contracts/${contract.id}/edit`}
            >
              Договір №{contract.number}
            </a>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted/40 p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-foreground">Підписант</div>

          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Замовник</div>
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="ПІБ (називний)" value={customerSigner?.actSignerFullNameNom ?? ""} />
              <ReadOnlyField label="ПІБ (родовий)" value={customerSigner?.actSignerFullNameGen ?? ""} />
              <ReadOnlyField label="Посада (називний)" value={customerSigner?.actSignerPositionNom ?? ""} />
              <ReadOnlyField label="Посада (родовий)" value={customerSigner?.actSignerPositionGen ?? ""} />
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-900">Виконавець</div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="ПІБ (називний)" disabled={!canEdit} {...register("signerFullNameNom", { required: true })} />
              <Field label="ПІБ (родовий)" disabled={!canEdit} {...register("signerFullNameGen", { required: true })} />
              {canEdit ? (
                <>
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
                </>
              ) : (
                <>
                  <Field label="Посада (називний)" disabled {...register("signerPositionNom", { required: true })} />
                  <Field label="Посада (родовий)" disabled {...register("signerPositionGen", { required: true })} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Оригінал і архів</div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEdit}
                className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
                {...register("isSigned")}
              />
              <span className="text-foreground/90">Підписаний</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canEdit}
                className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
                {...register("isArchived")}
              />
              <span className="text-foreground/90">В архіві</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">Документ</div>
          <SignedUpload entityType="ACCEPTANCE_ACT" entityId={actId} initialScans={signedScansInitial} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-foreground">{lineHeading}</div>
          <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[40px]" />
                <col />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead className="bg-crm-table-header text-left text-sm font-semibold text-foreground/90">
                <tr>
                  <th className={cn(READONLY_CELL, "w-[40px] max-w-[40px] px-2 text-center")}>#</th>
                  <th className={cn(READONLY_CELL, "min-w-0 px-3")}>Назва</th>
                  <th className={cn(READONLY_CELL, "w-[100px] max-w-[100px]")}>Од. вим.</th>
                  <th className={cn(READONLY_CELL, "w-[80px] max-w-[80px]")}>К-сть</th>
                  <th className={cn(READONLY_CELL, "w-[120px] max-w-[120px]")}>Ціна без ПДВ</th>
                  <th className={cn(READONLY_CELL, "w-[120px] max-w-[120px] text-center")}>Сума без ПДВ</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, idx) => {
                  const q = Number(it.quantity);
                  const p = Number(it.price);
                  const row = Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
                  return (
                    <tr key={it.id} className="border-t align-middle">
                      <td className={cn(READONLY_CELL, "text-center text-muted-foreground")}>{idx + 1}</td>
                      <td className={cn(READONLY_CELL, "min-w-0")}>
                        <div className="whitespace-pre-wrap break-words">{it.title}</div>
                      </td>
                      <td className={READONLY_CELL}>{it.unit}</td>
                      <td className={cn(READONLY_CELL, "tabular-nums")}>{formatMoney(q)}</td>
                      <td className={cn(READONLY_CELL, "tabular-nums")}>{formatMoney(p)}</td>
                      <td className={cn(READONLY_CELL, "text-center tabular-nums")}>{formatMoney(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1 border-t pt-3 text-sm tabular-nums text-zinc-700">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>Разом (без ПДВ):</span>
            <span>{formatMoney(Number(totalWithoutVat))}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>ПДВ 20%:</span>
            <span>{formatMoney(Number(vat20))}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 font-semibold text-foreground">
            <span>Разом з ПДВ:</span>
            <span>{formatMoney(Number(totalWithVat))}</span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {canEdit ? (
            <button type="submit" className="crm-btn-primary">
              Зберегти
            </button>
          ) : null}
          <a
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm"
            href="/acceptance-acts"
          >
            <FiList className="size-4 shrink-0" aria-hidden />
            До списку актів
          </a>
          <a
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted"
            href={`/invoices/${invoice.id}/edit`}
            aria-label={`Перейти до рахунку №${invoice.number}`}
            title={`Рахунок №${invoice.number}`}
          >
            <FiArrowRight className="size-4 shrink-0" aria-hidden />
            До рахунку
          </a>
          <a
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-muted"
            href={`/api/documents/acceptance-act/${actId}`}
            aria-label="Завантажити акт"
            title="Завантажити акт"
          >
            <FiFileText className="size-4 shrink-0" aria-hidden />
            Акт
          </a>
        </div>
      </form>
      <UnsavedChangesNavigationDialog
        isDirty={canEdit && form.formState.isDirty}
        suppressBeforeUnloadOnce={suppressBeforeUnloadOnce}
        onSaveAndProceed={
          canEdit
            ? async () => {
                const ok = await form.trigger();
                if (!ok) {
                  toast.error("Заповніть обов’язкові поля перед збереженням.");
                  throw new Error("VALIDATION_ERROR");
                }
                await form.handleSubmit(async (values) => {
                  try {
                    await onSave(values);
                    toast.success("Акт збережено.");
                    router.refresh();
                    form.reset(values);
                  } catch (e) {
                    if (isNextNavigationError(e)) throw e;
                    toast.error(getServerActionErrorMessage(e));
                    throw e;
                  }
                })();
              }
            : undefined
        }
      />
    </FormProvider>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
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
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm min-w-0">
      <span className="text-zinc-700">{label}</span>
      <input
        {...props}
        className="h-10 w-full min-w-0 rounded-md border bg-zinc-50 px-3 disabled:cursor-default disabled:bg-muted"
      />
    </label>
  );
}
