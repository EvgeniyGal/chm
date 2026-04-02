"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { CompanySearchSelect } from "@/components/forms/CompanySearchSelect";
import {
  QuickCreateSampleMaterialModal,
  type SampleMaterialEditTarget,
} from "@/components/attestation/QuickCreateSampleMaterialModal";

export type SampleMaterialOption = { id: string; groupCode: string; steelGrade: string };

export function SampleMaterialWelderSelect({
  initialOptions,
  defaultSampleMaterialId,
}: {
  initialOptions: SampleMaterialOption[];
  defaultSampleMaterialId: string;
}) {
  const [optionsState, setOptionsState] = useState(initialOptions);
  const [value, setValue] = useState(defaultSampleMaterialId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditTarget, setModalEditTarget] = useState<SampleMaterialEditTarget | null>(null);

  const companyOptions = useMemo(
    () => optionsState.map((o) => ({ id: o.id, label: `${o.groupCode} — ${o.steelGrade}` })),
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
      groupCode: selectedRow.groupCode,
      steelGrade: selectedRow.steelGrade,
    });
    setModalOpen(true);
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <CompanySearchSelect
            label=""
            placeholder="Оберіть матеріал зразка…"
            companies={companyOptions}
            value={value}
            onChange={(nextId) => setValue(nextId)}
          />
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:text-foreground dark:hover:bg-muted"
          aria-label="Редагувати вибраний матеріал зразка"
          title="Редагувати вибраний матеріал зразка"
          onClick={openEditSelected}
          disabled={!selectedRow}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50 dark:text-foreground dark:hover:bg-muted"
          aria-label="Додати матеріал зразка"
          title="Додати матеріал зразка"
          onClick={openCreate}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <input type="hidden" name="sampleMaterialId" value={value} required />

      <QuickCreateSampleMaterialModal
        open={modalOpen}
        onOpenChange={(next) => {
          setModalOpen(next);
          if (!next) setModalEditTarget(null);
        }}
        editTarget={modalEditTarget}
        onSuccess={(row) => {
          setOptionsState((prev) => {
            const rest = prev.filter((o) => o.id !== row.id);
            const nextRow: SampleMaterialOption = {
              id: row.id,
              groupCode: row.groupCode,
              steelGrade: row.steelGrade,
            };
            return [nextRow, ...rest];
          });
          setValue(row.id);
        }}
      />
    </>
  );
}
