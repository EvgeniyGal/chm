"use client";

import { useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";
import { invoicePartialSelectionStorageKey } from "@/lib/invoice-from-contract-session";
import { LineItemsTable } from "@/components/line-items/LineItemsTable";

type CompanyOpt = { id: string; label: string };

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
  customerCompanyId: string;
  contractorCompanyId: string;
  items: ContractSeedItem[];
};

type InvoiceFormValues = {
  date: string;
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
  companies,
  contract,
  defaultInvoiceSigner = { signerFullNameNom: "", signerPositionNom: "" },
  lineItemUnitOptions,
  partialSelection = false,
  onSubmit,
}: {
  companies: CompanyOpt[];
  contract: ContractSeed | null;
  defaultInvoiceSigner?: { signerFullNameNom: string; signerPositionNom: string };
  lineItemUnitOptions: string[];
  partialSelection?: boolean;
  onSubmit: (payload: InvoiceFormValues) => Promise<void>;
}) {
  const defaultValues = useMemo((): InvoiceFormValues => {
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
  }, [contract, partialSelection, defaultInvoiceSigner]);

  const form = useForm<InvoiceFormValues>({
    defaultValues,
    mode: "onBlur",
  });

  const partialHydratedRef = useRef(false);

  useEffect(() => {
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
  }, [contract, partialSelection, form]);

  useUnsavedChangesGuard(form.formState.isDirty);

  const isFromContract = Boolean(contract?.id);

  const remainingBySourceId = useMemo(
    () => new Map(contract?.items.map((it) => [it.id, it.remaining]) ?? []),
    [contract?.items],
  );

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          if (contract?.id) {
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
                return;
              }
              if (sumQty > max + 1e-9) {
                toast.error(`Сума кількостей по одній позиції договору перевищує залишок (макс. ${max}).`);
                return;
              }
            }
          }

          try {
            await onSubmit(values);
          } catch (e) {
            if (isNextNavigationError(e)) {
              toast.success("Рахунок створено.");
              throw e;
            }
            toast.error(getServerActionErrorMessage(e));
          }
        })}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Дата" type="date" {...form.register("date", { required: true })} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Замовник</span>
            <select
              className="h-10 rounded-md border px-3 disabled:bg-zinc-50"
              disabled={isFromContract}
              {...form.register("customerCompanyId", { required: true })}
            >
              <option value="" disabled>
                Оберіть компанію…
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Виконавець</span>
            <select
              className="h-10 rounded-md border px-3 disabled:bg-zinc-50"
              disabled={isFromContract}
              {...form.register("contractorCompanyId", { required: true })}
            >
              <option value="" disabled>
                Оберіть компанію…
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("isExternalContract")} />
            <span>Зовнішній договір</span>
          </label>
        </div>

        {form.watch("isExternalContract") ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Номер договору (зовнішній)" {...form.register("externalContractNumber", { required: true })} />
            <Field label="Дата договору (зовнішній)" type="date" {...form.register("externalContractDate", { required: true })} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-foreground">Підписант</div>
          <Field label="ПІБ (називний)" {...form.register("signerFullNameNom", { required: true })} />
          <Field label="Посада (називний)" {...form.register("signerPositionNom", { required: true })} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-foreground">Перелік робіт / послуг</div>
          <LineItemsTable unitOptionsFromBackend={lineItemUnitOptions} />
          {isFromContract ? (
            <p className="text-xs text-zinc-500">
              Рахунок на основі договору: кількість по кожній прив’язаній позиції не може перевищити залишок (уже з урахуванням
              попередніх рахунків).
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex gap-3">
          <button type="submit" className="crm-btn-primary">
            Зберегти
          </button>
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href="/invoices">
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
