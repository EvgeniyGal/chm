"use client";

import { FormProvider, useForm } from "react-hook-form";

import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";
import { LineItemsTable } from "@/components/line-items/LineItemsTable";

type CompanyOpt = { id: string; label: string };
type ContractSeed = {
  id: string;
  customerCompanyId: string;
  contractorCompanyId: string;
  items: Array<{ id: string; title: string; unit: string; quantity: number; price: number }>;
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
  onSubmit,
}: {
  companies: CompanyOpt[];
  contract: ContractSeed | null;
  onSubmit: (payload: InvoiceFormValues) => Promise<void>;
}) {
  const form = useForm<InvoiceFormValues>({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      customerCompanyId: contract?.customerCompanyId ?? "",
      contractorCompanyId: contract?.contractorCompanyId ?? "",
      contractId: contract?.id ?? null,
      isExternalContract: false,
      externalContractNumber: null,
      externalContractDate: null,
      signerFullNameNom: "",
      signerPositionNom: "",
      items:
        contract?.items?.length
          ? contract.items.map((it) => ({
              title: it.title,
              unit: it.unit,
              quantity: it.quantity,
              price: it.price,
              sourceContractLineItemId: it.id,
            }))
          : [{ title: "", unit: "", quantity: 0, price: 0, sourceContractLineItemId: null }],
    },
    mode: "onBlur",
  });

  useUnsavedChangesGuard(form.formState.isDirty);

  const isFromContract = Boolean(contract?.id);

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

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#FFF7E5] p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-zinc-900">Підписант</div>
          <Field label="ПІБ (називний)" {...form.register("signerFullNameNom", { required: true })} />
          <Field label="Посада (називний)" {...form.register("signerPositionNom", { required: true })} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-900">Перелік робіт / послуг</div>
          <LineItemsTable />
          {isFromContract ? (
            <p className="text-xs text-zinc-500">
              Рахунок створено з договору: кількості будуть перевірені сервером (залишок по договору).
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          >
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

