import { describe, expect, it } from "vitest";

import {
  diameterBoundsMinMax,
  formatCoatingAdmissionShort,
  formatCoatingAdmissionUa,
  formatElectrodeOrWireDocx,
  formatMaterialGroupAdmissionShort,
  formatPipeDiameterAdmissionShort,
  formatPipeDiameterAdmissionShortFromBounds,
  formatPipeDiameterAdmissionUa,
  formatPlateTubeSpreadShort,
  formatSampleMaterialGradeDocx,
  formatThicknessAdmissionShortFromPairs,
  formatThicknessAdmissionUa,
  formatThicknessAdmissionUaFromPairs,
  formatWeldedPartsAdmissionDisplay,
  formatWeldedPartsSampleDisplay,
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

  it("table 8: short form", () => {
    expect(formatCoatingAdmissionShort(["A"])).toBe("A, RA");
    expect(formatCoatingAdmissionShort(["B"])).toContain("A");
    expect(formatCoatingAdmissionShort(["B"])).toContain("B");
  });

  it("table 8: combined coatings — intersection of both", () => {
    expect(formatCoatingAdmissionShort(["A", "B"])).toBe("A, RA");
  });

  it("electrode-or-wire docx: coating (grade) / combined", () => {
    expect(
      formatElectrodeOrWireDocx({ coatingType: "B", materialGrade: "GHGhH67" }, null, false),
    ).toBe("B (GHGhH67)");
    expect(
      formatElectrodeOrWireDocx(
        { coatingType: "B", materialGrade: "GHGhH67" },
        { coatingType: "C", materialGrade: "BCG67" },
        true,
      ),
    ).toBe("B (GHGhH67) / C (BCG67)");
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

  it("plate spread: PA → п.6.2.3", () => {
    expect(formatPlateTubeSpreadShort("PA", null)).toBe("D>150 мм (п.6.2.3)");
  });

  it("plate spread: PF → п.6.2.2", () => {
    expect(formatPlateTubeSpreadShort("PF", null)).toBe("D>500 мм (п.6.2.2)");
  });

  it("welded-parts-type: лише факт зразка", () => {
    expect(formatWeldedPartsSampleDisplay("plate")).toBe("P (пластина)");
    expect(formatWeldedPartsSampleDisplay("pipe")).toBe("T (труба)");
  });

  it("admission-welded-parts-type: допуск пластина / труба+пластина", () => {
    expect(formatWeldedPartsAdmissionDisplay("plate")).toBe("P(пластина)");
    expect(formatWeldedPartsAdmissionDisplay("pipe")).toBe("T(труба), P(пластина)");
  });

  it("табл. 2: кілька зразків (лист або стінка труби) t=5 і t=10 → 3≤t≤20", () => {
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

  it("табл. 6–7: короткі коди груп допуску", () => {
    expect(formatMaterialGroupAdmissionShort("W01")).toBe("W01");
    expect(formatMaterialGroupAdmissionShort("W02")).toBe("W01, W02");
    expect(formatMaterialGroupAdmissionShort("W03")).toBe("W01, W02, W03");
    expect(formatMaterialGroupAdmissionShort("W04")).toBe("W01, W02, W04");
    expect(formatMaterialGroupAdmissionShort("W11")).toBe("W01, W02, W03, W04, W11");
  });

  it("зразок у документі: група (марка)", () => {
    expect(formatSampleMaterialGradeDocx("W01", "Ст3пс")).toBe("W01 (Ст3пс)");
  });
});
