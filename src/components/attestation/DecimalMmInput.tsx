"use client";

import { useState } from "react";

function normalizeFromServer(v: string | undefined): string {
  if (v == null || v === "") return "";
  return String(v).trim().replace(",", ".");
}

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className: string;
  /** Максимум цифр у цілій частині (товщина 6, діаметр труби 7). */
  maxIntegerDigits: number;
  placeholder?: string;
};

/** Поле для мм: лише додатні десяткові числа, кома або крапка як роздільник. */
export function DecimalMmInput({ name, defaultValue, required, className, maxIntegerDigits, placeholder }: Props) {
  const [value, setValue] = useState(() => normalizeFromServer(defaultValue));

  return (
    <input
      name={name}
      value={value}
      required={required}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        let next = e.target.value.replace(",", ".");
        next = next.replace(/[^\d.]/g, "");
        const dot = next.indexOf(".");
        if (dot !== -1) {
          next = next.slice(0, dot + 1) + next.slice(dot + 1).replace(/\./g, "");
        }
        const [intRaw, fracRaw = ""] = next.split(".");
        const intPart = intRaw.replace(/\D/g, "").slice(0, maxIntegerDigits);
        const fracPart = fracRaw.replace(/\D/g, "").slice(0, 2);
        const hasDot = next.includes(".");
        const built =
          hasDot || fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
        setValue(built);
      }}
    />
  );
}
