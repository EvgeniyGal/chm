import { describe, expect, it } from "vitest";

import { sameUtcCalendarDay, toUtcDateOnly, utcDateOnlyIso } from "./document-date";

describe("document-date", () => {
  it("normalizes YYYY-MM-DD to UTC midnight", () => {
    const d = toUtcDateOnly("2026-08-12");
    expect(d.toISOString()).toBe("2026-08-12T00:00:00.000Z");
  });

  it("strips time-of-day from Date values", () => {
    const d = toUtcDateOnly(new Date("2026-08-12T15:21:00.000Z"));
    expect(d.toISOString()).toBe("2026-08-12T00:00:00.000Z");
  });

  it("treats same calendar day as equal even when times differ", () => {
    const a = new Date("2026-08-12T15:21:00.000Z");
    const b = toUtcDateOnly("2026-08-12");
    expect(sameUtcCalendarDay(a, b)).toBe(true);
    expect(a.getTime() === b.getTime()).toBe(false);
  });

  it("returns UTC date-only iso", () => {
    expect(utcDateOnlyIso(new Date("2026-08-12T15:21:00.000Z"))).toBe("2026-08-12");
  });
});
