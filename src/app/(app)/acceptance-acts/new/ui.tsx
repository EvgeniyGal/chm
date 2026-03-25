"use client";

import { FormProvider, useForm } from "react-hook-form";

import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";

type InvoiceOpt = { id: string; label: string };

type AcceptanceActValues = {
  invoiceId: string;
  date: string;
  signingLocation: string;
  completionDate: string;
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
};

export function AcceptanceActForm({
  invoices,
  initialInvoiceId,
  onSubmit,
}: {
  invoices: InvoiceOpt[];
  initialInvoiceId: string;
  onSubmit: (payload: AcceptanceActValues) => Promise<void>;
}) {
  const form = useForm<AcceptanceActValues>({
    defaultValues: {
      invoiceId: initialInvoiceId,
      date: new Date().toISOString().slice(0, 10),
      signingLocation: "",
      completionDate: new Date().toISOString().slice(0, 10),
      signerFullNameNom: "",
      signerFullNameGen: "",
      signerPositionNom: "",
      signerPositionGen: "",
    },
    mode: "onBlur",
  });

  useUnsavedChangesGuard(form.formState.isDirty);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
        })}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Рахунок (джерело)</span>
          <select className="h-10 rounded-md border px-3" {...form.register("invoiceId", { required: true })}>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Дата" type="date" {...form.register("date", { required: true })} />
          <Field label="Місце складання" {...form.register("signingLocation", { required: true })} />
          <Field label="Дата завершення" type="date" {...form.register("completionDate", { required: true })} />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#FFF7E5] p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-zinc-900">Підписант</div>
          <Field label="ПІБ (називний)" {...form.register("signerFullNameNom", { required: true })} />
          <Field label="ПІБ (родовий)" {...form.register("signerFullNameGen", { required: true })} />
          <Field label="Посада (називний)" {...form.register("signerPositionNom", { required: true })} />
          <Field label="Посада (родовий)" {...form.register("signerPositionGen", { required: true })} />
        </div>

        <p className="text-xs text-zinc-500">
          Пункти акту (перелік робіт/послуг та суми) копіюються з рахунку і не редагуються в цій формі.
        </p>

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-[#FFAA00] px-4 text-sm font-medium text-[#241800] hover:bg-[#FFBB33]"
          >
            Зберегти
          </button>
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href="/acceptance-acts">
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

