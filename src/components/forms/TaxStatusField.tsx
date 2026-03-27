"use client";

import { useState } from "react";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";

export function TaxStatusField({
  defaultValue = "",
  optionsFromBackend = [],
  value: controlledValue,
  onChange: controlledOnChange,
}: {
  defaultValue?: string;
  optionsFromBackend?: string[];
  value?: string;
  onChange?: (next: string) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue.trim());
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;
  const setValue = controlledOnChange ?? setUncontrolled;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <SearchableDropdownOptionField
        label="Статус платника податку"
        scope="TAX_STATUS"
        value={value}
        onChange={setValue}
        optionsFromBackend={optionsFromBackend}
        placeholder="Оберіть або введіть власний статус"
      />
      <input type="hidden" name="taxStatus" value={value} />
      <input type="hidden" name="taxStatusDeletedJson" value="[]" />
    </div>
  );
}
