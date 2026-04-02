import { describe, expect, it } from "vitest";

import {
  diameterBoundsMinMax,
  formatCoatingAdmissionUa,
  formatPipeDiameterAdmissionShort,
  formatPipeDiameterAdmissionShortFromBounds,
  formatPipeDiameterAdmissionUa,
  formatPlateTubeSpreadShort,
  formatThicknessAdmissionShortFromPairs,
  formatThicknessAdmissionUa,
  formatThicknessAdmissionUaFromPairs,
  formatWeldedPartsAdmissionLetter,
} from "@/lib/attestation/admission-scope";

describe("admission-scope", () => {
  it("table 2: t=10 mm non-gas → 3–20 mm", () => {
    const s = formatThicknessAdmissionUa([10], ["111"]);
    expect(s).toContain("3");
    expect(s).toContain("20");
  });

  it("table 2: t=10 mm gas 311 → 3–15 mm", () => {
    const s = formatThicknessAdmissionUa([10], ["311"]);
    expect(s).toContain("3");
    expect(s).toContain("15");
  });

  it("table 2: t=2 mm → 2–4 mm (non-gas)", () => {
    const s = formatThicknessAdmissionUa([2], ["111"]);
    expect(s).toContain("2");
    expect(s).toContain("4");
  });

  it("table 3: D=273 mm", () => {
    const s = formatPipeDiameterAdmissionUa(273);
    expect(s).toContain("136,5");
    expect(s).toContain("500");
  });

  it("table 8: coating B", () => {
    const s = formatCoatingAdmissionUa(["B"]);
    expect(s).toContain("A");
    expect(s).toContain("B");
  });

  it("combined: t=10 arc + t=10 gas → union 3–20 mm", () => {
    const s = formatThicknessAdmissionUaFromPairs([
      { tMm: 10, methodCode: "141" },
      { tMm: 10, methodCode: "311" },
    ]);
    expect(s).toContain("3");
    expect(s).toContain("20");
  });

  it("short: thickness 3≤t≤20 for t=10", () => {
    expect(formatThicknessAdmissionShortFromPairs([{ tMm: 10, methodCode: "111" }])).toBe("3≤t≤20");
  });

  it("short: D for sample 273 mm", () => {
    expect(formatPipeDiameterAdmissionShort(273)).toBe("D≥136.5");
  });

  it("plate spread: PA → D>150", () => {
    expect(formatPlateTubeSpreadShort("PA", null)).toBe("D>150");
  });

  it("plate spread: PF → D>500", () => {
    expect(formatPlateTubeSpreadShort("PF", null)).toBe("D>500");
  });

  it("welded parts letter", () => {
    expect(formatWeldedPartsAdmissionLetter("plate")).toBe("p");
    expect(formatWeldedPartsAdmissionLetter("pipe")).toBe("T");
  });

  it("min/max thickness: t=5 and t=10 → lower from min, upper from max → 3≤t≤20", () => {
    expect(
      formatThicknessAdmissionShortFromPairs([
        { tMm: 5, methodCode: "111" },
        { tMm: 10, methodCode: "111" },
      ]),
    ).toBe("3≤t≤20");
  });

  it("min/max diameter: D=20 and D=100 → 20<D≤200", () => {
    const b = diameterBoundsMinMax([
      { dMm: 20, methodCode: "111" },
      { dMm: 100, methodCode: "111" },
    ]);
    expect(b).toEqual({ lo: 20, hi: 200 });
    expect(formatPipeDiameterAdmissionShortFromBounds(b)).toBe("20<D≤200");
  });
});
