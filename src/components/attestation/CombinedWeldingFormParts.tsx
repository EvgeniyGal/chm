"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { WeldingConsumableWelderSelect } from "@/components/attestation/WeldingConsumableWelderSelect";
import { weldingMethodSelectOptions } from "@/lib/attestation/welding-iso-options";
import { cn } from "@/lib/utils";

type CombinedCtx = {
  isCombined: boolean;
  setIsCombined: (v: boolean) => void;
};

const CombinedWeldingContext = createContext<CombinedCtx | null>(null);

export function CombinedWeldingProvider({
  defaultIsCombined,
  children,
}: {
  defaultIsCombined: boolean;
  children: ReactNode;
}) {
  const [isCombined, setIsCombined] = useState(defaultIsCombined);

  return (
    <CombinedWeldingContext.Provider value={{ isCombined, setIsCombined }}>{children}</CombinedWeldingContext.Provider>
  );
}

function useCombinedWelding() {
  const ctx = useContext(CombinedWeldingContext);
  if (!ctx) {
    throw new Error("CombinedWelding fields must be used inside CombinedWeldingProvider");
  }
  return ctx;
}

export function CombinedWeldingCheckbox() {
  const { isCombined, setIsCombined } = useCombinedWelding();
  return (
    <label className="flex min-w-0 shrink-0 items-center gap-2 text-sm md:whitespace-nowrap">
      <input
        name="isCombined"
        type="checkbox"
        className="size-4 shrink-0"
        checked={isCombined}
        onChange={(e) => setIsCombined(e.target.checked)}
      />
      Комбіноване зварювання
    </label>
  );
}

export function WeldingMethodsGrid({
  defaultWeldingMethod1,
  defaultWeldingMethod2,
  inputClassName,
}: {
  defaultWeldingMethod1: string;
  defaultWeldingMethod2: string;
  inputClassName: string;
}) {
  const { isCombined } = useCombinedWelding();
  const options1 = useMemo(() => weldingMethodSelectOptions(defaultWeldingMethod1), [defaultWeldingMethod1]);
  const options2 = useMemo(() => weldingMethodSelectOptions(defaultWeldingMethod2), [defaultWeldingMethod2]);
  const d1 = defaultWeldingMethod1.trim();
  const d2 = defaultWeldingMethod2.trim();
  return (
    <div
      className={cn(
        "min-w-0 gap-2",
        isCombined
          ? "flex flex-col md:flex-row md:items-start md:gap-4"
          : "grid grid-cols-1",
      )}
    >
      <label className={cn("flex min-w-0 flex-col gap-1 text-sm", isCombined && "md:min-w-0 md:flex-1")}>
        <span>Спосіб зварювання 1 (ISO 4063) *</span>
        <select name="weldingMethod1" required defaultValue={d1 || undefined} className={inputClassName}>
          <option value="">— Оберіть код —</option>
          {options1.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {isCombined ? (
        <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
          <span>Спосіб зварювання 2 *</span>
          <select name="weldingMethod2" required defaultValue={d2 || undefined} className={inputClassName}>
            <option value="">— Оберіть код —</option>
            {options2.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

type ConsumableOpt = { id: string; materialGrade: string; coatingType: string };

export function WeldingConsumablesPairRow({
  consumables,
  defaultConsumable1Id,
  defaultConsumable2Id,
}: {
  consumables: ConsumableOpt[];
  defaultConsumable1Id: string;
  defaultConsumable2Id: string;
}) {
  const { isCombined } = useCombinedWelding();
  return (
    <div
      className={cn(
        "min-w-0 gap-2",
        isCombined
          ? "flex flex-col md:flex-row md:items-start md:gap-4"
          : "grid grid-cols-1",
      )}
    >
      <div className={cn("flex min-w-0 flex-col gap-1 text-sm", isCombined && "md:min-w-0 md:flex-1")}>
        <span>Електрод / дріт 1 *</span>
        <WeldingConsumableWelderSelect
          name="consumable1Id"
          initialOptions={consumables}
          defaultConsumableId={defaultConsumable1Id}
          required
          placeholder="Оберіть електрод / дріт…"
        />
      </div>
      {isCombined ? (
        <div className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
          <span>Електрод / дріт 2</span>
          <WeldingConsumableWelderSelect
            name="consumable2Id"
            initialOptions={consumables}
            defaultConsumableId={defaultConsumable2Id}
            required={false}
            placeholder="Оберіть електрод / дріт (2)…"
          />
        </div>
      ) : null}
    </div>
  );
}
