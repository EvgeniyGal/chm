import { normalizeAdmissionComparisonSymbols } from "@/lib/attestation/admission-text-normalize";
import { welderCertificationCreateSchema } from "@/lib/attestation/validation";

function opt(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

function optDec(s: string | undefined): string | undefined {
  const t = opt(s);
  if (!t) return undefined;
  return t.replace(",", ".").replace(/\.$/, "").trim() || undefined;
}

export function parseWelderCertificationForm(formData: FormData) {
  const regulatoryDocumentIds = formData.getAll("regulatoryDocumentId").map((v) => String(v).trim());

  return welderCertificationCreateSchema.safeParse({
    groupId: String(formData.get("groupId") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    middleName: String(formData.get("middleName") ?? ""),
    birthLocation: String(formData.get("birthLocation") ?? ""),
    birthday: String(formData.get("birthday") ?? ""),
    prevQualificationDoc: String(formData.get("prevQualificationDoc") ?? ""),
    workExperienceYears: String(formData.get("workExperienceYears") ?? ""),
    companyId: String(formData.get("companyId") ?? ""),
    certificationType: String(formData.get("certificationType") ?? "primary"),
    isCombined: formData.get("isCombined") === "on",
    weldingMethod1: String(formData.get("weldingMethod1") ?? ""),
    weldingMethod2: opt(String(formData.get("weldingMethod2") ?? "")),
    weldedPartsType: String(formData.get("weldedPartsType") ?? "plate"),
    jointType: String(formData.get("jointType") ?? "BW"),
    jointCharacteristics: String(formData.get("jointCharacteristics") ?? "ss_nb"),
    weldingPosition1: String(formData.get("weldingPosition1") ?? ""),
    weldingPosition2: opt(String(formData.get("weldingPosition2") ?? "")),
    preheat: formData.get("preheat") === "on",
    heatTreatment: formData.get("heatTreatment") === "on",
    sampleMaterialId: String(formData.get("sampleMaterialId") ?? ""),
    thickness1: optDec(String(formData.get("thickness1") ?? "")),
    thickness2: optDec(String(formData.get("thickness2") ?? "")),
    thickness3: optDec(String(formData.get("thickness3") ?? "")),
    manualJointCharacteristicsAdmission: normalizeAdmissionComparisonSymbols(
      String(formData.get("manualJointCharacteristicsAdmission") ?? ""),
    ),
    manualWeldingPositionAdmission: normalizeAdmissionComparisonSymbols(
      String(formData.get("manualWeldingPositionAdmission") ?? ""),
    ),
    manualThicknessAdmission: normalizeAdmissionComparisonSymbols(String(formData.get("manualThicknessAdmission") ?? "")),
    manualDiameterAdmission: normalizeAdmissionComparisonSymbols(String(formData.get("manualDiameterAdmission") ?? "")),
    pipeDiameter1: optDec(String(formData.get("pipeDiameter1") ?? "")),
    pipeDiameter2: optDec(String(formData.get("pipeDiameter2") ?? "")),
    pipeDiameter3: optDec(String(formData.get("pipeDiameter3") ?? "")),
    consumable1Id: String(formData.get("consumable1Id") ?? ""),
    consumable2Id: (() => {
      const v = String(formData.get("consumable2Id") ?? "").trim();
      return v ? v : undefined;
    })(),
    shieldingGasFlux: opt(String(formData.get("shieldingGasFlux") ?? "")),
    sampleMark: String(formData.get("sampleMark") ?? ""),
    inspVisual: formData.get("inspVisual") === "on",
    inspRadiographic: formData.get("inspRadiographic") === "on",
    inspUltrasonic: formData.get("inspUltrasonic") === "on",
    inspBend: formData.get("inspBend") === "on",
    inspMetallographic: formData.get("inspMetallographic") === "on",
    inspAdditional: formData.get("inspAdditional") === "on",
    theoryScore: String(formData.get("theoryScore") ?? "passed"),
    regulatoryDocumentIds,
  });
}
