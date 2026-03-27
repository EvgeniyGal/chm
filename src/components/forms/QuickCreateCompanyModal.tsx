"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";

type CreatedCompany = {
  id: string;
  label: string;
  contractSignerFullNameNom: string;
  contractSignerFullNameGen: string;
  contractSignerPositionNom: string;
  contractSignerPositionGen: string;
  contractSignerActingUnder: string;
};

export function QuickCreateCompanyModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreated: (company: CreatedCompany) => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    shortName: "",
    address: "",
    edrpouCode: "",
    vatIdTin: "",
    taxStatus: "",
    iban: "",
    bank: "",
    contractSignerFullNameNom: "",
    contractSignerFullNameGen: "",
    contractSignerPositionNom: "",
    contractSignerPositionGen: "",
    contractSignerActingUnder: "",
    actSignerFullNameNom: "",
    actSignerFullNameGen: "",
    actSignerPositionNom: "",
    actSignerPositionGen: "",
    invoiceSignerFullNameNom: "",
    invoiceSignerPositionNom: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const isDirty = useMemo(() => Object.values(form).some((v) => String(v).trim().length > 0), [form]);

  const reset = () => {
    setForm({
      fullName: "",
      shortName: "",
      address: "",
      edrpouCode: "",
      vatIdTin: "",
      taxStatus: "",
      iban: "",
      bank: "",
      contractSignerFullNameNom: "",
      contractSignerFullNameGen: "",
      contractSignerPositionNom: "",
      contractSignerPositionGen: "",
      contractSignerActingUnder: "",
      actSignerFullNameNom: "",
      actSignerFullNameGen: "",
      actSignerPositionNom: "",
      actSignerPositionGen: "",
      invoiceSignerFullNameNom: "",
      invoiceSignerPositionNom: "",
    });
    setError(null);
    setSubmitting(false);
  };

  const requestClose = () => {
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    reset();
    onOpenChange(false);
  };

  async function submit() {
    const requiredKeys: Array<keyof typeof form> = [
      "fullName",
      "shortName",
      "address",
      "edrpouCode",
      "taxStatus",
      "iban",
      "bank",
      "contractSignerFullNameNom",
      "contractSignerFullNameGen",
      "contractSignerPositionNom",
      "contractSignerPositionGen",
      "contractSignerActingUnder",
      "actSignerFullNameNom",
      "actSignerFullNameGen",
      "actSignerPositionNom",
      "actSignerPositionGen",
      "invoiceSignerFullNameNom",
      "invoiceSignerPositionNom",
    ];
    if (requiredKeys.some((k) => !form[k].trim())) {
      setError("Заповніть усі обовʼязкові поля.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      fullName: form.fullName.trim(),
      shortName: form.shortName.trim(),
      address: form.address.trim(),
      contacts: [] as Array<{ type: string; value: string }>,
      edrpouCode: form.edrpouCode.trim(),
      vatIdTin: form.vatIdTin.trim() || null,
      taxStatus: form.taxStatus.trim(),
      iban: form.iban.trim(),
      bank: form.bank.trim(),
      contractSignerFullNameNom: form.contractSignerFullNameNom.trim(),
      contractSignerFullNameGen: form.contractSignerFullNameGen.trim(),
      contractSignerPositionNom: form.contractSignerPositionNom.trim(),
      contractSignerPositionGen: form.contractSignerPositionGen.trim(),
      contractSignerActingUnder: form.contractSignerActingUnder.trim(),
      actSignerFullNameNom: form.actSignerFullNameNom.trim(),
      actSignerFullNameGen: form.actSignerFullNameGen.trim(),
      actSignerPositionNom: form.actSignerPositionNom.trim(),
      actSignerPositionGen: form.actSignerPositionGen.trim(),
      invoiceSignerFullNameNom: form.invoiceSignerFullNameNom.trim(),
      invoiceSignerPositionNom: form.invoiceSignerPositionNom.trim(),
    };

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => null)) as any;
    if (!res.ok || !body?.data) {
      setSubmitting(false);
      setError("Не вдалося створити компанію. Перевірте права доступу та спробуйте ще раз.");
      return;
    }

    onCreated({
      id: body.data.id,
      label: body.data.shortName,
      contractSignerFullNameNom: body.data.contractSignerFullNameNom,
      contractSignerFullNameGen: body.data.contractSignerFullNameGen,
      contractSignerPositionNom: body.data.contractSignerPositionNom,
      contractSignerPositionGen: body.data.contractSignerPositionGen,
      contractSignerActingUnder: body.data.contractSignerActingUnder,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-zinc-900">Нова компанія</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-zinc-700">
              Заповніть усі поля компанії.
            </Dialog.Description>

            <div className="mt-4 max-h-[60vh] overflow-auto pr-1">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(
                  [
                    ["fullName", "Повна назва"],
                    ["shortName", "Скорочена назва"],
                    ["address", "Адреса"],
                    ["edrpouCode", "ЄДРПОУ"],
                    ["vatIdTin", "ІПН (опціонально)"],
                    ["taxStatus", "Статус платника податку"],
                    ["iban", "IBAN"],
                    ["bank", "Банк"],
                    ["contractSignerFullNameNom", "Підписант договору (називний)"],
                    ["contractSignerFullNameGen", "Підписант договору (родовий)"],
                    ["contractSignerPositionNom", "Посада підписанта договору (називний)"],
                    ["contractSignerPositionGen", "Посада підписанта договору (родовий)"],
                    ["contractSignerActingUnder", "Діє на підставі"],
                    ["actSignerFullNameNom", "Підписант акту (називний)"],
                    ["actSignerFullNameGen", "Підписант акту (родовий)"],
                    ["actSignerPositionNom", "Посада підписанта акту (називний)"],
                    ["actSignerPositionGen", "Посада підписанта акту (родовий)"],
                    ["invoiceSignerFullNameNom", "Підписант рахунку (називний)"],
                    ["invoiceSignerPositionNom", "Посада підписанта рахунку (називний)"],
                  ] as Array<[keyof typeof form, string]>
                ).map(([key, label], idx) => (
                  <label key={key} className="flex flex-col gap-1 text-sm md:col-span-1">
                    <span className="text-zinc-700">{label}</span>
                    <input
                      className="h-10 rounded-md border px-3"
                      value={form[key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      autoFocus={idx === 0}
                    />
                  </label>
                ))}
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-zinc-50" onClick={requestClose}>
                Скасувати
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-[#FFAA00] px-3 text-sm font-medium text-[#241800] hover:bg-[#FFBB33] disabled:opacity-50"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? "Створення..." : "Створити"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-zinc-900">Незбережені зміни</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-zinc-700">
              У формі створення компанії є незбережені зміни. Закрити вікно без збереження?
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-zinc-50">
                  Залишитись
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-9 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700"
                  onClick={() => {
                    setConfirmCloseOpen(false);
                    reset();
                    onOpenChange(false);
                  }}
                >
                  Закрити без збереження
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

