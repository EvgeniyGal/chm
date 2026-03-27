"use client";

import { useState } from "react";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";

export function SignerPositionField({
  name,
  label,
  scope,
  defaultValue = "",
  optionsFromBackend = [],
  deletedName = "signerPositionDeletedJson",
}: {
  name: string;
  label: string;
  scope: "SIGNER_POSITION_NOM" | "SIGNER_POSITION_GEN";
  defaultValue?: string;
  optionsFromBackend?: string[];
  deletedName?: string;
}) {
  const [value, setValue] = useState(defaultValue.trim());

  return (
    <div className="flex flex-col gap-1 text-sm">
      <SearchableDropdownOptionField
        label={label}
        scope={scope}
        value={value}
        onChange={setValue}
        optionsFromBackend={optionsFromBackend}
        placeholder="Оберіть або введіть посаду"
      />
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name={deletedName} value="[]" />
    </div>
  );
}
