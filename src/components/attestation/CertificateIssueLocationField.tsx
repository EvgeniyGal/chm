"use client";

import { useState } from "react";

import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";

export function CertificateIssueLocationField({
  defaultValue = "",
  optionsFromBackend,
}: {
  defaultValue?: string;
  optionsFromBackend: string[];
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="min-w-0">
      <input type="hidden" name="certificateIssueLocation" value={value} required />
      <SearchableDropdownOptionField
        label="Місце видачі посвідчень"
        scope="CERTIFICATE_ISSUE_LOCATION"
        value={value}
        onChange={setValue}
        optionsFromBackend={optionsFromBackend}
        placeholder="Оберіть або введіть місце видачі"
        inputClassName="bg-zinc-50"
        required={false}
      />
    </div>
  );
}
