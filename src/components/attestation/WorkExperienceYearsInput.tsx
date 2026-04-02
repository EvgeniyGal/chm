"use client";

import { useState } from "react";

function normalizeInitial(v: string | undefined): string {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  if (Number.isNaN(n)) return "";
  return String(Math.max(0, Math.min(999, Math.floor(n))));
}

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className: string;
};

export function WorkExperienceYearsInput({ name, defaultValue, required, className }: Props) {
  const [value, setValue] = useState(() => normalizeInitial(defaultValue));

  return (
    <input
      name={name}
      value={value}
      required={required}
      inputMode="numeric"
      autoComplete="off"
      placeholder="напр. 5"
      className={className}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
        setValue(digits);
      }}
    />
  );
}
