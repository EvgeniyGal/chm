"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { DecimalMmInput } from "@/components/attestation/DecimalMmInput";
import { ManualAdmissionTextInput } from "@/components/attestation/ManualAdmissionTextInput";
import { RequiredFieldMark } from "@/components/attestation/RequiredFieldMark";

type Ctx = { weldedPartsType: string; setWeldedPartsType: (v: string) => void };

const WeldedPartsTypeContext = createContext<Ctx | null>(null);

export function WeldedPartsTypeProvider({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [weldedPartsType, setWeldedPartsType] = useState(defaultValue);

  return (
    <WeldedPartsTypeContext.Provider value={{ weldedPartsType, setWeldedPartsType }}>{children}</WeldedPartsTypeContext.Provider>
  );
}

export function useWeldedPartsType() {
  const ctx = useContext(WeldedPartsTypeContext);
  if (!ctx) {
    throw new Error("useWeldedPartsType must be used within WeldedPartsTypeProvider");
  }
  return ctx;
}

export function WeldedPartsTypeSelect({ className }: { className: string }) {
  const { weldedPartsType, setWeldedPartsType } = useWeldedPartsType();

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
      <span>
        Вид деталей <RequiredFieldMark />
      </span>
      <select
        name="weldedPartsType"
        required
        className={className}
        value={weldedPartsType}
        onChange={(e) => setWeldedPartsType(e.target.value)}
      >
        <option value="plate">Пластина</option>
        <option value="pipe">Труба</option>
      </select>
    </label>
  );
}

export function PipeDiametersRow({
  className,
  inputClassName,
  defaults,
  defaultManualDiameterAdmission = "",
}: {
  className: string;
  inputClassName: string;
  defaults: { d1: string; d2: string; d3: string };
  defaultManualDiameterAdmission?: string;
}) {
  const { weldedPartsType } = useWeldedPartsType();

  if (weldedPartsType !== "pipe") {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
        <span>
          Ø труби 1 (мм) <RequiredFieldMark />
        </span>
        <DecimalMmInput
          name="pipeDiameter1"
          required
          defaultValue={defaults.d1}
          className={className}
          maxIntegerDigits={7}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
        <span>Ø труби 2</span>
        <DecimalMmInput name="pipeDiameter2" defaultValue={defaults.d2} className={className} maxIntegerDigits={7} />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
        <span>Ø труби 3</span>
        <DecimalMmInput name="pipeDiameter3" defaultValue={defaults.d3} className={className} maxIntegerDigits={7} />
      </label>
      <ManualAdmissionTextInput
        name="manualDiameterAdmission"
        label="Допуск (діаметр труби)"
        defaultValue={defaultManualDiameterAdmission}
        className={inputClassName}
        placeholder="Напр. D≥150 мм"
      />
    </div>
  );
}
