import { companies } from "@/db/schema/companies";
import {
  certificationGroups,
  commissionMembers,
  regulatoryDocuments,
  sampleMaterials,
  weldingConsumables,
  welderCertifications,
} from "@/db/schema/attestation";

import { buildCertificationCodeString } from "@/lib/attestation/certification-code";
import {
  computeCertificateBlankNumber,
  computeCertificateNumber,
  computeValidityDates,
} from "@/lib/attestation/compute";
import {
  certificationTypeLabelUa,
  jointTypeLabelUa,
  theoryScoreLabelUa,
  weldedPartsTypeLabelUa,
} from "@/lib/attestation/labels-uk";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("uk-UA");
}

function decStr(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : v;
}

export type WelderDocContext = {
  welder: typeof welderCertifications.$inferSelect;
  group: typeof certificationGroups.$inferSelect;
  company: typeof companies.$inferSelect;
  head: typeof commissionMembers.$inferSelect;
  sampleMaterial: typeof sampleMaterials.$inferSelect;
  consumable1: typeof weldingConsumables.$inferSelect;
  consumable2: typeof weldingConsumables.$inferSelect | null;
  regulatoryDocs: (typeof regulatoryDocuments.$inferSelect)[];
};

/** Payload keys aligned with `forms/certificate.docx` / `forms/report.docx` placeholders. */
export function buildCertificateDocxPayload(ctx: WelderDocContext): Record<string, unknown> {
  const { welder, group, company, head, sampleMaterial, consumable1, consumable2, regulatoryDocs } = ctx;
  const protocolDate = new Date(group.protocolDate);
  const issueDate = new Date(group.certificateIssueDate);
  const { certificateValidUntil, nextCertificationDate } = computeValidityDates(protocolDate);

  const certNum = computeCertificateNumber(group.groupNumber, welder.orderInGroup, protocolDate);
  const blankNum = computeCertificateBlankNumber(group.groupNumber, welder.orderInGroup, protocolDate);

  const certification = buildCertificationCodeString({
    weldingMethod1: welder.weldingMethod1,
    weldingMethod2: welder.weldingMethod2,
    isCombined: welder.isCombined,
    weldedPartsType: welder.weldedPartsType,
    jointType: welder.jointType,
    sampleMaterialGroupCode: sampleMaterial.groupCode,
    consumableCoating1: consumable1.coatingType,
    consumableCoating2: consumable2?.coatingType ?? null,
    thickness1: decStr(welder.thickness1),
    thickness2: decStr(welder.thickness2),
    thickness3: decStr(welder.thickness3),
    pipeDiameter1: decStr(welder.pipeDiameter1),
    pipeDiameter2: decStr(welder.pipeDiameter2),
    pipeDiameter3: decStr(welder.pipeDiameter3),
    weldingPosition1: welder.weldingPosition1,
    weldingPosition2: welder.weldingPosition2,
    jointCharacteristics: welder.jointCharacteristics,
  });

  const standardsList = regulatoryDocs.map((r) => r.code).join(", ");
  const standardsAdmission = regulatoryDocs.map((r) => r.admissionText.trim()).join("\n");

  const electrodeOrWire = welder.isCombined
    ? `${consumable1.materialGrade} / ${consumable2?.materialGrade ?? ""}`
    : consumable1.materialGrade;

  const thicknessParts = [welder.thickness1, welder.thickness2, welder.thickness3]
    .map(decStr)
    .filter(Boolean) as string[];
  const sampleThickness = thicknessParts.join(", ");

  const weldingPosition = [welder.weldingPosition1, welder.weldingPosition2].filter(Boolean).join(", ");

  const birthdayStr = welder.birthday ? fmtDate(new Date(welder.birthday)) : "—";

  const base: Record<string, unknown> = {
    "last-name": welder.lastName,
    "first-name": welder.firstName,
    "middle-name": welder.middleName ?? "",
    birthday: birthdayStr,
    chairperson: head.fullName,
    "prev-qualification-doc-number": welder.prevQualificationDoc ?? "—",
    "theory-score": theoryScoreLabelUa(welder.theoryScore),
    "sert-number": certNum,
    "protocol-number": group.groupNumber,
    "protocol-date": fmtDate(protocolDate),
    "certificate issued": fmtDate(issueDate),
    "next-certification-date": fmtDate(nextCertificationDate),
    "standards-list": standardsList,
    "standards-list-admission": standardsAdmission,
    certification,
    "welding-method": welder.isCombined
      ? `${welder.weldingMethod1} / ${welder.weldingMethod2 ?? ""}`
      : welder.weldingMethod1,
    "welded-parts-type": weldedPartsTypeLabelUa(welder.weldedPartsType),
    "sample-material-grade": sampleMaterial.steelGrade,
    "sample-thickness": sampleThickness,
    "pipe-outer-diameter": [welder.pipeDiameter1, welder.pipeDiameter2, welder.pipeDiameter3]
      .map(decStr)
      .filter(Boolean)
      .join(", "),
    "shielding-gas-or-flux": welder.shieldingGasFlux ?? "—",
    "welding-position": weldingPosition,
    "electrode-or-wire": electrodeOrWire,
    "joint-type": jointTypeLabelUa(welder.jointType),
    "certification-type": certificationTypeLabelUa(welder.certificationType),
    "work-company": company.shortName,
    "certificate-valid-until": fmtDate(certificateValidUntil),
    "blank-number": blankNum,
  };

  // Admission block mirrors (MVP: repeat technical scope text; detailed rules tables can refine later)
  const admission = (suffix: string) => base[suffix] ?? "—";
  Object.assign(base, {
    "admission-electrode-or-wire": admission("electrode-or-wire"),
    "admission-pipe-outer-diameter": admission("pipe-outer-diameter"),
    "admission-sample-thickness": admission("sample-thickness"),
    "admission-shielding-gas-or-flux": admission("shielding-gas-or-flux"),
    "admission-welding-position": admission("welding-position"),
    "admission-sample-material-grade": admission("sample-material-grade"),
    "admission-welded-parts-type": admission("welded-parts-type"),
    "admission-welding-method": admission("welding-method"),
    "admission-seam-type": jointTypeLabelUa(welder.jointType),
    "seam-type": jointTypeLabelUa(welder.jointType),
    "performing-weld": certificationTypeLabelUa(welder.certificationType),
  });

  return base;
}

export function buildReportDocxPayload(
  group: typeof certificationGroups.$inferSelect,
  head: typeof commissionMembers.$inferSelect,
  memberLines: string[],
  items: Record<string, unknown>[],
): Record<string, unknown> {
  const protocolDate = new Date(group.protocolDate);
  return {
    "group-date": fmtDate(protocolDate),
    "group-number": group.groupNumber,
    chairperson: head.fullName,
    members: memberLines.join("; "),
    items,
  };
}

export function buildReportItemRow(ctx: WelderDocContext): Record<string, unknown> {
  const certPayload = buildCertificateDocxPayload(ctx);
  const { welder, company } = ctx;
  const fullNameBirthday = [welder.lastName, welder.firstName, welder.middleName].filter(Boolean).join(" ");
  return {
    ...certPayload,
    "sertificate-number": certPayload["sert-number"],
    "full-name-birthday": `${fullNameBirthday}; ${certPayload.birthday}`,
    "work-experience-years-work-company": `${welder.workExperienceYears} р.; ${company.shortName}`,
    "group-oder-number": String(welder.orderInGroup),
    "member-1": String(welder.orderInGroup),
  };
}
