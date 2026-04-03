import { describe, expect, it } from "vitest";

import { normalizeAdmissionComparisonSymbols } from "@/lib/attestation/admission-text-normalize";

describe("normalizeAdmissionComparisonSymbols", () => {
  it("replaces inequality digraphs with unicode", () => {
    expect(normalizeAdmissionComparisonSymbols("3<=t<=20")).toBe("3≤t≤20");
    expect(normalizeAdmissionComparisonSymbols("t=<10")).toBe("t≤10");
    expect(normalizeAdmissionComparisonSymbols("D>=150")).toBe("D≥150");
    expect(normalizeAdmissionComparisonSymbols("x=>5")).toBe("x≥5");
    expect(normalizeAdmissionComparisonSymbols("a+>3")).toBe("a≥3");
  });
});
