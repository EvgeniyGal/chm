import { describe, expect, it } from "vitest";

import { computeCertificateNumber, computeValidityDates } from "@/lib/attestation/compute";
import { parseWelderCertificationForm } from "@/lib/attestation/parse-welder-form";
import { certificationGroupCreateSchema } from "@/lib/attestation/validation";

describe("attestation critical path (validation + domain)", () => {
  it("parses a minimal valid welder form", () => {
    const fd = new FormData();
    fd.set("groupId", "00000000-0000-4000-8000-000000000001");
    fd.set("lastName", "Іванов");
    fd.set("firstName", "Іван");
    fd.set("middleName", "Іванович");
    fd.set("birthLocation", "Київ");
    fd.set("birthday", "1990-05-15");
    fd.set("prevQualificationDoc", "№123 від 2015");
    fd.set("workExperienceYears", "5");
    fd.set("companyId", "00000000-0000-4000-8000-000000000002");
    fd.set("certificationType", "primary");
    fd.set("weldingMethod1", "111");
    fd.set("weldedPartsType", "plate");
    fd.set("jointType", "BW");
    fd.set("jointCharacteristics", "ss_nb");
    fd.set("weldingPosition1", "PA");
    fd.set("sampleMaterialId", "00000000-0000-4000-8000-000000000003");
    fd.set("thickness1", "12");
    fd.set("manualJointCharacteristicsAdmission", "Допуск за характеристикою шва");
    fd.set("manualWeldingPositionAdmission", "Допуск за положенням");
    fd.set("manualThicknessAdmission", "3≤t≤20 мм");
    fd.set("consumable1Id", "00000000-0000-4000-8000-000000000004");
    fd.set("sampleMark", "A-1");
    fd.set("theoryScore", "passed");
    fd.append("regulatoryDocumentId", "00000000-0000-4000-8000-000000000005");

    const parsed = parseWelderCertificationForm(fd);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.lastName).toBe("Іванов");
      expect(parsed.data.workExperienceYears).toBe("5");
      expect(parsed.data.regulatoryDocumentIds).toHaveLength(1);
    }
  });

  it("rejects non-integer work experience years", () => {
    const fd = new FormData();
    fd.set("groupId", "00000000-0000-4000-8000-000000000001");
    fd.set("lastName", "Іванов");
    fd.set("firstName", "Іван");
    fd.set("middleName", "Іванович");
    fd.set("birthLocation", "Київ");
    fd.set("birthday", "1990-05-15");
    fd.set("prevQualificationDoc", "№123");
    fd.set("workExperienceYears", "3.5");
    fd.set("companyId", "00000000-0000-4000-8000-000000000002");
    fd.set("certificationType", "primary");
    fd.set("weldingMethod1", "111");
    fd.set("weldedPartsType", "plate");
    fd.set("jointType", "BW");
    fd.set("jointCharacteristics", "ss_nb");
    fd.set("weldingPosition1", "PA");
    fd.set("sampleMaterialId", "00000000-0000-4000-8000-000000000003");
    fd.set("thickness1", "12");
    fd.set("manualJointCharacteristicsAdmission", "x");
    fd.set("manualWeldingPositionAdmission", "y");
    fd.set("manualThicknessAdmission", "z");
    fd.set("consumable1Id", "00000000-0000-4000-8000-000000000004");
    fd.set("sampleMark", "A-1");
    fd.set("theoryScore", "passed");
    fd.append("regulatoryDocumentId", "00000000-0000-4000-8000-000000000005");

    expect(parseWelderCertificationForm(fd).success).toBe(false);
  });

  it("validates certification group payload", () => {
    const parsed = certificationGroupCreateSchema.safeParse({
      groupNumber: "12",
      protocolDate: "2026-01-15",
      inspectionDate: "2026-01-10",
      certificateIssueDate: "2026-01-20",
      certificateIssueLocation: "Київ",
      headId: "00000000-0000-4000-8000-000000000010",
      memberIds: ["00000000-0000-4000-8000-000000000011"],
    });
    expect(parsed.success).toBe(true);
  });

  it("requires at least one commission member for new group", () => {
    const parsed = certificationGroupCreateSchema.safeParse({
      groupNumber: "12",
      protocolDate: "2026-01-15",
      inspectionDate: "2026-01-10",
      certificateIssueDate: "2026-01-20",
      certificateIssueLocation: "Київ",
      headId: "00000000-0000-4000-8000-000000000010",
      memberIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("chains certificate number with validity window", () => {
    const cert = computeCertificateNumber("42", 3, new Date("2026-03-01"));
    expect(cert).toMatch(/^42\.3-/);
    const v = computeValidityDates(new Date("2026-03-01"));
    expect(v.certificateValidUntil.getTime()).toBeGreaterThan(new Date("2026-03-01").getTime());
  });
});
