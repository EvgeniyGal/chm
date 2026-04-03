/**
 * Способи зварювання ISO 4063 (п.3.2.1 «Welder_Certification_Rules.md»).
 * Значення зберігаються як код (напр. «111»).
 */
const ISO4063_WELDING_METHOD_OPTIONS = [
  { value: "111", label: "111 — Ручне дугове зварювання покритим електродом (РЗЕ)" },
  { value: "114", label: "114 — Дугове зварювання порошковим дротом (ЗП)" },
  { value: "121", label: "121 — Дугове зварювання під флюсом дротяним електродом (ЗФ)" },
  { value: "131", label: "131 — Дугове зварювання металевим електродом в інертних газах (МІГ)" },
  { value: "135", label: "135 — Дугове зварювання металевим електродом в активних газах (МАГ)" },
  { value: "136", label: "136 — Дугове зварювання порошковим дротом із захистом активним газом (ПАГ)" },
  { value: "137", label: "137 — Дугове зварювання порошковим дротом в інертних газах (ПІГ)" },
  { value: "141", label: "141 — Дугове зварювання вольфрамовим електродом в інертних газах (ВІГ)" },
  { value: "15", label: "15 — Плазмове зварювання (ПЗ)" },
  { value: "311", label: "311 — Газове зварювання (ГЗ)" },
] as const;

/**
 * Положення зварювання (ISO 6947 / п.3.2.6, приклади п.7.7.5 у «Welder_Certification_Rules.md»).
 */
const ISO6947_WELDING_POSITION_OPTIONS = [
  { value: "PA", label: "PA — плоский шов (flat)" },
  { value: "PB", label: "PB — горизонтальний у вертикальній площині" },
  { value: "PC", label: "PC — горизонтальний шов" },
  { value: "PD", label: "PD — горизонтальний знизу" },
  { value: "PE", label: "PE — труба — згори" },
  { value: "PF", label: "PF — вертикальний знизу вгору" },
  { value: "PG", label: "PG — вертикальний згори вниз" },
  { value: "PH", label: "PH — знизу (overhead)" },
] as const;

const METHOD_VALUES = new Set<string>(ISO4063_WELDING_METHOD_OPTIONS.map((o) => o.value));
const POSITION_VALUES = new Set<string>(ISO6947_WELDING_POSITION_OPTIONS.map((o) => o.value));

type IsoSelectOption = { value: string; label: string };

/** Якщо в БД збережено код поза списком — додаємо один варіант, щоб select не втрачав значення. */
export function weldingMethodSelectOptions(saved: string | undefined): IsoSelectOption[] {
  const list: IsoSelectOption[] = [...ISO4063_WELDING_METHOD_OPTIONS];
  const s = (saved ?? "").trim();
  if (s && !METHOD_VALUES.has(s)) {
    return [{ value: s, label: `${s} (збережене значення)` }, ...list];
  }
  return list;
}

export function weldingPositionSelectOptions(saved: string | undefined): IsoSelectOption[] {
  const list: IsoSelectOption[] = [...ISO6947_WELDING_POSITION_OPTIONS];
  const s = (saved ?? "").trim();
  if (s && !POSITION_VALUES.has(s)) {
    return [{ value: s, label: `${s} (збережене значення)` }, ...list];
  }
  return list;
}
