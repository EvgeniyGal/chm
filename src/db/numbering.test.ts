import { describe, expect, it } from "vitest";

import {
  canInheritFromContractNumber,
  firstFreeSuffixNumber,
  formatDocNumber,
  parseDocNumber,
  rewriteAutoNumberForDate,
} from "@/db/schema";

function invoiceNumberingMode(contractNumber: string | null | undefined): "inherit" | "consume" {
  if (contractNumber && canInheritFromContractNumber(contractNumber)) return "inherit";
  return "consume";
}

describe("formatDocNumber / parseDocNumber", () => {
  it("formats seq/MM-YYYY without a suffix for the first document", () => {
    expect(formatDocNumber({ seq: 75, year: 2026, month: 8 })).toBe("75/08-2026");
    expect(formatDocNumber({ seq: 125, year: 2026, month: 9, suffix: 1 })).toBe("125/09-2026");
  });

  it("appends /2, /3 for later documents in the same month", () => {
    expect(formatDocNumber({ seq: 125, year: 2026, month: 9, suffix: 2 })).toBe("125/09-2026/2");
    expect(formatDocNumber({ seq: 125, year: 2026, month: 9, suffix: 3 })).toBe("125/09-2026/3");
  });

  it("parses auto numbers including optional suffix", () => {
    expect(parseDocNumber("75/08-2026")).toEqual({ seq: 75, year: 2026, month: 8, suffix: 1 });
    expect(parseDocNumber("125/09-2026/2")).toEqual({ seq: 125, year: 2026, month: 9, suffix: 2 });
  });

  it("rejects custom and invalid numbers", () => {
    expect(parseDocNumber("Договір-5")).toBeNull();
    expect(parseDocNumber("125/09-2026/1")).toBeNull();
    expect(parseDocNumber("125/13-2026")).toBeNull();
    expect(parseDocNumber("")).toBeNull();
  });
});

describe("firstFreeSuffixNumber", () => {
  it("uses the base number when nothing is taken", () => {
    expect(firstFreeSuffixNumber({ seq: 125, year: 2026, month: 9, taken: [] })).toBe("125/09-2026");
  });

  it("uses /2 then /3 when earlier slots are taken", () => {
    expect(
      firstFreeSuffixNumber({ seq: 125, year: 2026, month: 9, taken: ["125/09-2026"] }),
    ).toBe("125/09-2026/2");
    expect(
      firstFreeSuffixNumber({
        seq: 125,
        year: 2026,
        month: 9,
        taken: ["125/09-2026", "125/09-2026/2"],
      }),
    ).toBe("125/09-2026/3");
  });

  it("fills the first hole rather than appending", () => {
    expect(
      firstFreeSuffixNumber({
        seq: 125,
        year: 2026,
        month: 9,
        taken: ["125/09-2026", "125/09-2026/3"],
      }),
    ).toBe("125/09-2026/2");
  });
});

describe("inherit vs consume", () => {
  it("inherits from an auto-format treaty number", () => {
    expect(invoiceNumberingMode("125/09-2026")).toBe("inherit");
    expect(canInheritFromContractNumber("125/09-2026")).toBe(true);
  });

  it("consumes a new seq for standalone/external and custom treaty numbers", () => {
    expect(invoiceNumberingMode(null)).toBe("consume");
    expect(invoiceNumberingMode("Договір-5")).toBe("consume");
    expect(invoiceNumberingMode("125/09-2026/2")).toBe("consume");
    expect(canInheritFromContractNumber("ABC")).toBe(false);
  });
});

describe("rewriteAutoNumberForDate", () => {
  it("keeps seq (and suffix) and rewrites month/year", () => {
    expect(rewriteAutoNumberForDate("125/09-2026", new Date("2026-10-01T00:00:00.000Z"))).toBe(
      "125/10-2026",
    );
    expect(rewriteAutoNumberForDate("125/09-2026/2", new Date("2026-10-15T00:00:00.000Z"))).toBe(
      "125/10-2026/2",
    );
  });

  it("leaves custom numbers unchanged (returns null)", () => {
    expect(rewriteAutoNumberForDate("Договір-5", new Date("2026-10-01T00:00:00.000Z"))).toBeNull();
  });
});
