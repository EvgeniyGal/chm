"use client";

import { useState } from "react";

import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";
import type { SearchableDropdownScope } from "@/components/forms/SearchableDropdownOptionField";
import { RequiredFieldMark } from "@/components/attestation/RequiredFieldMark";
import { normalizeAdmissionComparisonSymbols } from "@/lib/attestation/admission-text-normalize";
import { cn } from "@/lib/utils";

type ManualAdmissionSearchableScope = Extract<
  SearchableDropdownScope,
  "WELDER_MANUAL_JOINT_ADMISSION" | "WELDER_MANUAL_POSITION_ADMISSION"
>;

export function ManualAdmissionSearchableField({
  name,
  scope,
  label,
  defaultValue,
  optionsFromBackend,
  inputClassName,
}: {
  name: string;
  scope: ManualAdmissionSearchableScope;
  label: string;
  defaultValue: string;
  optionsFromBackend: string[];
  /** Як у сусідніх полях форми (наприклад `welderFormInputClass`). */
  inputClassName: string;
}) {
  const [value, setValue] = useState(() => normalizeAdmissionComparisonSymbols(defaultValue));

  return (
    <div className={cn("flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1")}>
      <span>
        {label} <RequiredFieldMark />
      </span>
      <input type="hidden" name={name} value={value} required />
      <SearchableDropdownOptionField
        label=""
        scope={scope}
        value={value}
        onChange={(v) => setValue(normalizeAdmissionComparisonSymbols(v))}
        optionsFromBackend={optionsFromBackend}
        hideLabel
        placeholder="Оберіть або введіть значення"
        inputClassName={inputClassName}
        multiline={false}
        required={false}
      />
    </div>
  );
}
