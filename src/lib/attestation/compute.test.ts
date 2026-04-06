import { describe, expect, it } from "vitest";

import {
  computeCertificateBlankNumber,
  computeCertificateNumber,
  computeValidityDates,
} from "./compute";

describe("attestation compute", () => {
  it("computes certificate number with 2-digit year", () => {
    expect(computeCertificateNumber("3", 15, new Date(2026, 0, 1))).toBe("3.15-26");
  });

  it("computes blank number prefix", () => {
    expect(computeCertificateBlankNumber("3", 15, new Date(2026, 0, 1))).toBe("ОД-1/3.15-26");
  });

  it("adds two calendar years for validity and next certification", () => {
    const protocol = new Date(2026, 1, 15);
    const { certificateValidUntil, nextCertificationDate } = computeValidityDates(protocol);
    const expected = new Date(2028, 1, 15);
    expect(certificateValidUntil.getTime()).toBe(expected.getTime());
    expect(nextCertificationDate.getTime()).toBe(expected.getTime());
  });
});
