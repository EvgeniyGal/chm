import { describe, expect, it } from "vitest";

import { admissionJointTypesShort, seamTypeDocxUa } from "@/lib/attestation/labels-uk";

describe("labels-uk seam / admission", () => {
  it("seamTypeDocxUa: code first, Ukrainian in parentheses", () => {
    expect(seamTypeDocxUa("BW")).toBe("BW (стиковий)");
    expect(seamTypeDocxUa("FW")).toBe("FW (кутовий)");
  });

  it("admissionJointTypesShort: BW → BW, FW; FW → FW", () => {
    expect(admissionJointTypesShort("BW")).toBe("BW, FW");
    expect(admissionJointTypesShort("FW")).toBe("FW");
  });
});
