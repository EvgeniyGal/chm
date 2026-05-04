export function formatUaDateWithYearSuffix(value: Date | string | null | undefined): string {
  if (value == null) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("uk-UA")} р.`;
}
