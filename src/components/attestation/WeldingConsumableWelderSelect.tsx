"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import {
  QuickCreateWeldingConsumableModal,
  type WeldingConsumableEditTarget,
} from "@/components/attestation/QuickCreateWeldingConsumableModal";

type WeldingConsumableOption = { id: string; materialGrade: string; coatingType: string };

export function WeldingConsumableWelderSelect({
  name,
  initialOptions,
  defaultConsumableId,
  required: requiredProp,
  placeholder,
}: {
  name: string;
  initialOptions: WeldingConsumableOption[];
  defaultConsumableId: string;
  /** Для другого дроту в комбінованому зварюванні — необов’язково. */
  required?: boolean;
  placeholder: string;
}) {
  const required = requiredProp ?? true;

  const [optionsState, setOptionsState] = useState(initialOptions);
  const [value, setValue] = useState(defaultConsumableId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditTarget, setModalEditTarget] = useState<WeldingConsumableEditTarget | null>(null);

  const companyOptions = useMemo(
    () => optionsState.map((o) => ({ id: o.id, label: `${o.materialGrade} (${o.coatingType})` })),
    [optionsState],
  );

  const selectedRow = useMemo(() => optionsState.find((o) => o.id === value) ?? null, [optionsState, value]);

  function openCreate() {
    setModalEditTarget(null);
    setModalOpen(true);
  }

  function openEditSelected() {
    if (!selectedRow) return;
    setModalEditTarget({
      id: selectedRow.id,
      materialGrade: selectedRow.materialGrade,
      coatingType: selectedRow.coatingType,
    });
    setModalOpen(true);
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <CompanySearchSelect
            label=""
            placeholder={placeholder}
            companies={companyOptions}
            value={value}
            onChange={(nextId) => setValue(nextId)}
          />
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:text-foreground dark:hover:bg-muted"
          aria-label="Редагувати вибраний матеріал"
          title="Редагувати вибраний матеріал"
          onClick={openEditSelected}
          disabled={!selectedRow}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 dark:text-foreground dark:hover:bg-muted"
          aria-label="Додати електрод / дріт"
          title="Додати електрод / дріт"
          onClick={openCreate}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      {required ? (
        <input type="hidden" name={name} value={value} required />
      ) : (
        <input type="hidden" name={name} value={value} />
      )}

      <QuickCreateWeldingConsumableModal
        open={modalOpen}
        onOpenChange={(next) => {
          setModalOpen(next);
          if (!next) setModalEditTarget(null);
        }}
        editTarget={modalEditTarget}
        onSuccess={(row) => {
          setOptionsState((prev) => {
            const rest = prev.filter((o) => o.id !== row.id);
            const nextRow: WeldingConsumableOption = {
              id: row.id,
              materialGrade: row.materialGrade,
              coatingType: row.coatingType,
            };
            return [nextRow, ...rest];
          });
          setValue(row.id);
        }}
      />
    </>
  );
}
