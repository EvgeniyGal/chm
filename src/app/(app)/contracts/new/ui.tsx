"use client";

import { FormProvider, useForm } from "react-hook-form";

import { LineItemsTable } from "@/components/line-items/LineItemsTable";
import { useUnsavedChangesGuard } from "@/components/forms/useUnsavedChangesGuard";

type CompanyOpt = { id: string; label: string };

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
  onSubmit,
}: {
  companies: CompanyOpt[];
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
          <Field label="Місце складання" {...form.register("signingLocation", { required: true })} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Тип</span>
            <select className="h-10 rounded-md border px-3" {...form.register("workType", { required: true })}>
              <option value="WORKS">Роботи</option>
              <option value="SERVICES">Послуги</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Замовник</span>
            <select className="h-10 rounded-md border px-3" {...form.register("customerCompanyId", { required: true })}>
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
            <select className="h-10 rounded-md border px-3" {...form.register("contractorCompanyId", { required: true })}>
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

          <Field label="Терміни виконання робіт" {...form.register("projectTimeline", { required: true })} />
          <Field label="Термін дії договору" {...form.register("contractDuration", { required: true })} />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#FFF7E5] p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-zinc-900">Підписант</div>
          <Field label="ПІБ (називний)" {...form.register("signerFullNameNom", { required: true })} />
          <Field label="ПІБ (родовий)" {...form.register("signerFullNameGen", { required: true })} />
          <Field label="Посада (називний)" {...form.register("signerPositionNom", { required: true })} />
          <Field label="Посада (родовий)" {...form.register("signerPositionGen", { required: true })} />
          <div className="md:col-span-2">
            <Field label="Діє на підставі" {...form.register("signerActingUnder", { required: true })} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-900">Перелік робіт / послуг</div>
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

