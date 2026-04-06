/** Calendar-day addition (local date components). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Calendar-year addition (local date components), e.g. 15.02.2026 → 15.02.2028. */
export function addYears(date: Date, years: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/**
 * Format: `{group_number}.{order}-{yy}` where yy is last two digits of protocol year.
 * Example: group "3", order 15, year 2026 → `3.15-26`.
 */
export function computeCertificateNumber(groupNumber: string, orderInGroup: number, protocolDate: Date): string {
  const yy = protocolDate.getFullYear() % 100;
  return `${groupNumber}.${orderInGroup}-${String(yy).padStart(2, "0")}`;
}

/** Full blank number prefix per TRD: ОД-1/{certificate_number} */
export function computeCertificateBlankNumber(groupNumber: string, orderInGroup: number, protocolDate: Date): string {
  return `ОД-1/${computeCertificateNumber(groupNumber, orderInGroup, protocolDate)}`;
}

export function computeValidityDates(protocolDate: Date): {
  certificateValidUntil: Date;
  nextCertificationDate: Date;
} {
  const end = addYears(protocolDate, 2);
  return { certificateValidUntil: end, nextCertificationDate: new Date(end) };
}
