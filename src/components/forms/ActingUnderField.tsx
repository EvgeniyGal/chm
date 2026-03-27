"use client";

import { useState } from "react";
import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";

export function ActingUnderField({
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
    <div className="flex flex-col gap-1 text-sm">
      <SearchableDropdownOptionField
        label="Підписант договору діє на підставі"
        scope="ACTING_UNDER"
        value={value}
        onChange={setValue}
        optionsFromBackend={optionsFromBackend}
        placeholder="Оберіть або введіть підставу"
      />
      <input type="hidden" name="contractSignerActingUnder" value={value} />
      <input type="hidden" name="actingUnderDeletedJson" value="[]" />
    </div>
  );
}
