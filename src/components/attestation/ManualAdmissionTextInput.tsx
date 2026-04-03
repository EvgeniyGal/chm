"use client";

import { useState } from "react";

import { RequiredFieldMark } from "@/components/attestation/RequiredFieldMark";
import { normalizeAdmissionComparisonSymbols } from "@/lib/attestation/admission-text-normalize";
import { cn } from "@/lib/utils";

/** Звичайне текстове поле допуску з нормалізацією ≤ / ≥ (без searchable dropdown). */
export function ManualAdmissionTextInput({
  name,
  label,
  defaultValue,
  className,
  wrapClassName,
  required = true,
  placeholder = "Напр. 3≤t≤20 мм",
  maxLength = 4000,
}: {
  name: string;
  label: string;
  defaultValue: string;
  className: string;
  /** Додаткові класи для `<label>` (напр. `md:min-w-[12rem]` у рядку з товщинами). */
  wrapClassName?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const [value, setValue] = useState(() => normalizeAdmissionComparisonSymbols(defaultValue));

  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1", wrapClassName)}>
      <span>
        {label} {required ? <RequiredFieldMark /> : null}
      </span>
      <input
        name={name}
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        onChange={(e) => setValue(normalizeAdmissionComparisonSymbols(e.target.value))}
        onBlur={() => setValue((v) => normalizeAdmissionComparisonSymbols(v))}
      />
    </label>
  );
}
