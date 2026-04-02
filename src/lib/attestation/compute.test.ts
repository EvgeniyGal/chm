import { describe, expect, it } from "vitest";

import {
  addDays,
  computeCertificateBlankNumber,
  computeCertificateNumber,
  computeQcProtocolNumbers,
  computeValidityDates,
} from "./compute";

describe("attestation compute", () => {
  it("computes certificate number with 2-digit year", () => {
    expect(computeCertificateNumber("3", 15, new Date(2026, 0, 1))).toBe("3.15-26");
  });

  it("computes blank number prefix", () => {
    expect(computeCertificateBlankNumber("3", 15, new Date(2026, 0, 1))).toBe("ОД-1/3.15-26");
  });

  it("adds 730 calendar days for validity", () => {
    const protocol = new Date(2026, 0, 10);
    const { certificateValidUntil } = computeValidityDates(protocol);
    expect(certificateValidUntil.getTime()).toBe(addDays(protocol, 730).getTime());
  });

  it("builds QC protocol numbers for selected methods", () => {
    const d = new Date(2026, 3, 1);
    const nums = computeQcProtocolNumbers("15", d, {
      inspVisual: true,
      inspRadiographic: true,
      inspUltrasonic: false,
      inspBend: false,
      inspMetallographic: false,
      inspAdditional: false,
    });
    expect(nums.map((n) => n.number)).toEqual(["15/VT", "15/RT"]);
  });
});
