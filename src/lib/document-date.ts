/** UTC calendar day as YYYY-MM-DD. */
export function utcDateOnlyIso(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Normalize a document date to UTC midnight.
 * Form inputs are YYYY-MM-DD; analogues previously stored `new Date()` with a time
 * component, which made PATCH treat an unchanged calendar day as a date change
 * and allocate a new document number.
 */
export function toUtcDateOnly(value: Date | string): Date {
  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return parsed;
    return new Date(`${parsed.toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
  if (Number.isNaN(value.getTime())) return value;
  return new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export function sameUtcCalendarDay(a: Date, b: Date): boolean {
  return utcDateOnlyIso(a) === utcDateOnlyIso(b);
}
