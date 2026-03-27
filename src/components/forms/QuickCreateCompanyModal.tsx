"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ActingUnderField } from "@/components/forms/ActingUnderField";
import { ContactsField } from "@/components/forms/ContactsField";
import { SignerPositionField } from "@/components/forms/SignerPositionField";
import { TaxStatusField } from "@/components/forms/TaxStatusField";

type CreatedCompany = {
  id: string;
  label: string;
  contractSignerFullNameNom: string;
  contractSignerFullNameGen: string;
  contractSignerPositionNom: string;
  contractSignerPositionGen: string;
  contractSignerActingUnder: string;
};

const emptyForm = () => ({
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

export function QuickCreateCompanyModal({
  open,
  onOpenChange,
  onCreated,
  taxStatusOptions,
  signerPositionNomOptions,
  signerPositionGenOptions,
  actingUnderOptions,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreated: (company: CreatedCompany) => void;
  taxStatusOptions: string[];
  signerPositionNomOptions: string[];
  signerPositionGenOptions: string[];
  actingUnderOptions: string[];
}) {
  const [form, setForm] = useState(emptyForm);
  const [contactsJson, setContactsJson] = useState("[]");
  const [contactsMountKey, setContactsMountKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const isDirty = useMemo(() => {
    if (Object.values(form).some((v) => String(v).trim().length > 0)) return true;
    try {
      const parsed = JSON.parse(contactsJson) as unknown[];
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return contactsJson !== "[]";
    }
  }, [form, contactsJson]);

  const reset = useCallback(() => {
    setForm(emptyForm());
    setContactsJson("[]");
    setContactsMountKey((k) => k + 1);
    setError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  const requestClose = () => {
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(false);
  };

  async function submit() {
    const requiredKeys: Array<keyof ReturnType<typeof emptyForm>> = [
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
      const msg = "Заповніть усі обовʼязкові поля.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      fullName: form.fullName.trim(),
      shortName: form.shortName.trim(),
      address: form.address.trim(),
      contactsJson,
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

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
      if (!res.ok || !body?.data) {
        setSubmitting(false);
        const msg = "Не вдалося створити компанію. Перевірте права доступу та спробуйте ще раз.";
        setError(msg);
        toast.error(msg);
        return;
      }

      const d = body.data;
      toast.success("Компанію створено.");
      onCreated({
        id: String(d.id),
        label: String(d.shortName),
        contractSignerFullNameNom: String(d.contractSignerFullNameNom),
        contractSignerFullNameGen: String(d.contractSignerFullNameGen),
        contractSignerPositionNom: String(d.contractSignerPositionNom),
        contractSignerPositionGen: String(d.contractSignerPositionGen),
        contractSignerActingUnder: String(d.contractSignerActingUnder),
      });
      onOpenChange(false);
    } catch {
      setSubmitting(false);
      const msg = "Помилка мережі. Спробуйте ще раз.";
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 flex max-h-[min(90vh,calc(100vh-24px))] w-[min(960px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg outline-none">
            <Dialog.Title className="page-title">Нова компанія</Dialog.Title>
            <Dialog.Description className="sr-only">
              Створення компанії: реквізити, контакти та підписанти за замовчуванням.
            </Dialog.Description>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4">
                <ModalField
                  label="Повна назва"
                  value={form.fullName}
                  onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
                />
                <ModalField
                  label="Скорочена назва"
                  value={form.shortName}
                  onChange={(v) => setForm((p) => ({ ...p, shortName: v }))}
                />
                <ModalField
                  label="Адреса"
                  multiline
                  value={form.address}
                  onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ModalField
                    label="ЄДРПОУ"
                    value={form.edrpouCode}
                    onChange={(v) => setForm((p) => ({ ...p, edrpouCode: v }))}
                  />
                  <ModalField
                    label="ІПН"
                    required={false}
                    value={form.vatIdTin}
                    onChange={(v) => setForm((p) => ({ ...p, vatIdTin: v }))}
                  />
                </div>
                <TaxStatusField
                  optionsFromBackend={taxStatusOptions}
                  value={form.taxStatus}
                  onChange={(v) => setForm((p) => ({ ...p, taxStatus: v }))}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ModalField label="IBAN" value={form.iban} onChange={(v) => setForm((p) => ({ ...p, iban: v }))} />
                  <ModalField label="Банк" value={form.bank} onChange={(v) => setForm((p) => ({ ...p, bank: v }))} />
                </div>

                <ContactsField
                  key={contactsMountKey}
                  defaultValue="[]"
                  onContactsJsonChange={setContactsJson}
                />

                <div className="mt-2 grid grid-cols-1 gap-4 rounded-lg bg-muted p-4">
                  <div className="text-sm font-semibold text-foreground">Підписанти (за замовчуванням)</div>

                  <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Називний відмінок</div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ModalField
                          label="Підписант договору"
                          value={form.contractSignerFullNameNom}
                          onChange={(v) => setForm((p) => ({ ...p, contractSignerFullNameNom: v }))}
                        />
                        <SignerPositionField
                          name="contractSignerPositionNom"
                          label="Посада підписанта договору"
                          scope="SIGNER_POSITION_NOM"
                          deletedName="signerPositionNomDeletedJson"
                          optionsFromBackend={signerPositionNomOptions}
                          value={form.contractSignerPositionNom}
                          onChange={(v) => setForm((p) => ({ ...p, contractSignerPositionNom: v }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ModalField
                          label="Підписант акту"
                          value={form.actSignerFullNameNom}
                          onChange={(v) => setForm((p) => ({ ...p, actSignerFullNameNom: v }))}
                        />
                        <SignerPositionField
                          name="actSignerPositionNom"
                          label="Посада підписанта акту"
                          scope="SIGNER_POSITION_NOM"
                          deletedName="signerPositionNomDeletedJson"
                          optionsFromBackend={signerPositionNomOptions}
                          value={form.actSignerPositionNom}
                          onChange={(v) => setForm((p) => ({ ...p, actSignerPositionNom: v }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ModalField
                          label="Підписант рахунку"
                          value={form.invoiceSignerFullNameNom}
                          onChange={(v) => setForm((p) => ({ ...p, invoiceSignerFullNameNom: v }))}
                        />
                        <SignerPositionField
                          name="invoiceSignerPositionNom"
                          label="Посада підписанта рахунку"
                          scope="SIGNER_POSITION_NOM"
                          deletedName="signerPositionNomDeletedJson"
                          optionsFromBackend={signerPositionNomOptions}
                          value={form.invoiceSignerPositionNom}
                          onChange={(v) => setForm((p) => ({ ...p, invoiceSignerPositionNom: v }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-sky-200 bg-sky-50/70 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-900">Родовий відмінок</div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ModalField
                          label="Підписант договору"
                          value={form.contractSignerFullNameGen}
                          onChange={(v) => setForm((p) => ({ ...p, contractSignerFullNameGen: v }))}
                        />
                        <SignerPositionField
                          name="contractSignerPositionGen"
                          label="Посада підписанта договору"
                          scope="SIGNER_POSITION_GEN"
                          deletedName="signerPositionGenDeletedJson"
                          optionsFromBackend={signerPositionGenOptions}
                          value={form.contractSignerPositionGen}
                          onChange={(v) => setForm((p) => ({ ...p, contractSignerPositionGen: v }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ModalField
                          label="Підписант акту"
                          value={form.actSignerFullNameGen}
                          onChange={(v) => setForm((p) => ({ ...p, actSignerFullNameGen: v }))}
                        />
                        <SignerPositionField
                          name="actSignerPositionGen"
                          label="Посада підписанта акту"
                          scope="SIGNER_POSITION_GEN"
                          deletedName="signerPositionGenDeletedJson"
                          optionsFromBackend={signerPositionGenOptions}
                          value={form.actSignerPositionGen}
                          onChange={(v) => setForm((p) => ({ ...p, actSignerPositionGen: v }))}
                        />
                      </div>
                    </div>
                  </div>

                  <ActingUnderField
                    optionsFromBackend={actingUnderOptions}
                    value={form.contractSignerActingUnder}
                    onChange={(v) => setForm((p) => ({ ...p, contractSignerActingUnder: v }))}
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    className="crm-btn-primary disabled:opacity-50"
                    onClick={submit}
                  >
                    {submitting ? "Створення..." : "Зберегти"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-zinc-50"
                    onClick={requestClose}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-foreground">Незбережені зміни</Dialog.Title>
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

function ModalField({
  label,
  value,
  onChange,
  required = true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      {multiline ? (
        <textarea
          required={required}
          className="min-h-24 rounded-md border border-border bg-card px-3 py-2"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          required={required}
          className="h-10 rounded-md border border-border bg-card px-3"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
