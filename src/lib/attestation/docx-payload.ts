import { companies } from "@/db/schema/companies";
import {
  certificationGroups,
  commissionMembers,
  regulatoryDocuments,
  sampleMaterials,
  weldingConsumables,
  welderCertifications,
} from "@/db/schema/attestation";

import {
  buildAdmissionScopeFields,
  formatWeldedPartsSampleDisplay,
} from "@/lib/attestation/admission-scope";
import { buildCertificationCodeString, formatJointCharacteristicsForCode } from "@/lib/attestation/certification-code";
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

/**
 * Payload keys for docxtemplater (`forms/certificate.docx`, `forms/protocol.docx`, `forms/report.docx`).
 * `welded-parts-type` — факт зразка: `P(пластина)` або `T(труба)`.
 * `admission-welded-parts-type` — допуск: пластина → лише `P(пластина)`; труба → `T(труба), P(пластина)`.
 * `admission-thickness-scope` + `admission-thickness-table-ref` (табл. 2: лист / стінка труби).
 * Непорожні `manualThicknessAdmission` / `manualDiameterAdmission` (труба) підставляються замість авто у відповідні `admission-*-scope`.
 * `admission-seam-type` / `welding-position`: непорожні `manualJointCharacteristicsAdmission` / `manualWeldingPositionAdmission` замінюють фрагмент з правил.
 * `admission-diameter-scope` + `admission-diameter-table-ref` (табл. 3 для труби; п.6.2.2–6.2.3 для пластини).
 * Короткі межі, напр. `3≤t≤20`,
 * `admission-diameter-scope` (табл. 3 або `D>500` / `D>150` для пластини п.6.2.2–6.2.3), інші `admission-*`.
 */
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
  const standardsAdmission = regulatoryDocs.map((r) => r.admissionText.trim()).join(", ");

  const electrodeOrWire = welder.isCombined
    ? `${consumable1.materialGrade} / ${consumable2?.materialGrade ?? ""}`
    : consumable1.materialGrade;

  const thicknessParts = [welder.thickness1, welder.thickness2, welder.thickness3]
    .map(decStr)
    .filter(Boolean) as string[];
  const sampleThickness = thicknessParts.join(", ");

  const weldingPositionCodes = [welder.weldingPosition1, welder.weldingPosition2].filter(Boolean).join(", ");
  const manualPos = welder.manualWeldingPositionAdmission?.trim();
  const weldingPosition = manualPos || weldingPositionCodes;

  const birthdayStr = welder.birthday ? fmtDate(new Date(welder.birthday)) : "—";

  const admissionScopeComputed = buildAdmissionScopeFields({
    weldedPartsType: welder.weldedPartsType,
    jointType: welder.jointType,
    sampleMaterialGroupCode: sampleMaterial.groupCode,
    weldingMethod1: welder.weldingMethod1,
    weldingMethod2: welder.weldingMethod2,
    isCombined: welder.isCombined,
    weldingPosition1: welder.weldingPosition1,
    weldingPosition2: welder.weldingPosition2,
    thickness1: welder.thickness1,
    thickness2: welder.thickness2,
    thickness3: welder.thickness3,
    pipeDiameter1: welder.pipeDiameter1,
    pipeDiameter2: welder.pipeDiameter2,
    pipeDiameter3: welder.pipeDiameter3,
    consumableCoating1: consumable1.coatingType,
    consumableCoating2: consumable2?.coatingType ?? null,
  });

  const manualThickness = welder.manualThicknessAdmission?.trim();
  const manualDiameter = welder.manualDiameterAdmission?.trim();
  const admissionScope: Record<string, string> = {
    ...admissionScopeComputed,
    "admission-thickness-scope": manualThickness || admissionScopeComputed["admission-thickness-scope"],
    "admission-diameter-scope":
      welder.weldedPartsType === "pipe"
        ? manualDiameter || admissionScopeComputed["admission-diameter-scope"]
        : admissionScopeComputed["admission-diameter-scope"],
  };

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
    "welded-parts-type": formatWeldedPartsSampleDisplay(welder.weldedPartsType),
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
    "work-experience-years": String(welder.workExperienceYears),
    "sample-mark": welder.sampleMark,
    "work-company": company.shortName,
    "certificate-valid-until": fmtDate(certificateValidUntil),
    "blank-number": blankNum,
    ...admissionScope,
  };

  const coatingAdmission = admissionScope["admission-coating-scope"];
  const manualJoint = welder.manualJointCharacteristicsAdmission?.trim();
  const seamAdmissionBody = manualJoint || admissionScopeComputed["admission-joint-scope"];
  Object.assign(base, {
    "admission-electrode-or-wire": `${electrodeOrWire}. ${coatingAdmission}`,
    "admission-pipe-outer-diameter": admissionScope["admission-diameter-scope"],
    "admission-sample-thickness": admissionScope["admission-thickness-scope"],
    "admission-shielding-gas-or-flux": welder.shieldingGasFlux ?? "—",
    "admission-welding-position": weldingPosition,
    "admission-sample-material-grade": `${sampleMaterial.steelGrade} (${admissionScope["admission-material-groups-scope"]})`,
    "admission-welding-method": base["welding-method"],
    "admission-seam-type": `${jointTypeLabelUa(welder.jointType)}; ${seamAdmissionBody}`,
    "seam-type": jointTypeLabelUa(welder.jointType),
    "performing-weld": certificationTypeLabelUa(welder.certificationType),
  });

  return base;
}

/** Поля з `forms/protocol.docx` (і сумісних завантажених шаблонів протоколу). */
export function buildProtocolDocxPayload(
  ctx: WelderDocContext,
  commissionMemberNames: string[],
): Record<string, unknown> {
  const cert = buildCertificateDocxPayload(ctx);
  const { welder, regulatoryDocs } = ctx;

  const fullName = [welder.lastName, welder.firstName, welder.middleName].filter(Boolean).join(" ").trim();

  let birthYearLocation = "—";
  if (welder.birthday) {
    const y = new Date(welder.birthday).getFullYear();
    const loc = welder.birthLocation?.trim() || "—";
    birthYearLocation = `${y} / ${loc}`;
  } else if (welder.birthLocation?.trim()) {
    birthYearLocation = `— / ${welder.birthLocation.trim()}`;
  }

  const jc = formatJointCharacteristicsForCode(
    welder.jointCharacteristics as Parameters<typeof formatJointCharacteristicsForCode>[0],
  );
  const manualJoint = welder.manualJointCharacteristicsAdmission?.trim();
  const jointDesc = `${jointTypeLabelUa(welder.jointType)}; ${jc}${manualJoint ? `; ${manualJoint}` : ""}`;

  const standardsAdmission = regulatoryDocs.map((r) => r.admissionText.trim()).join(", ");

  const memberLines = commissionMemberNames.map((n) => n.trim()).filter(Boolean);

  const admissionTypePart = `виконання зварювальних робіт (${weldedPartsTypeLabelUa(welder.weldedPartsType)})`;

  return {
    ...cert,
    "full-name": fullName,
    "birth-year-location": birthYearLocation,
    "qualification-doc-number": welder.prevQualificationDoc?.trim() || "—",
    "type-of-certification": certificationTypeLabelUa(welder.certificationType),
    "joint-type-description": jointDesc,
    "preheat-and-interpass": welder.preheat ? "Так" : "Ні",
    "heat-treatment": welder.heatTreatment ? "Так" : "Ні",
    members: memberLines.join(", "),
    "standards-list-admission": standardsAdmission,
    "inspection-order-number": "9.1",
    inspection: buildProtocolInspectionSummaryUa(welder),
    commissionMembers: memberLines.map((n) => ({ "member-1": n })),
    "admission-type": admissionTypePart,
    admission: standardsAdmission ? `. ${standardsAdmission}` : "",
  };
}

function buildProtocolInspectionSummaryUa(
  welder: Parameters<typeof buildCertificateDocxPayload>[0]["welder"],
): string {
  const rows: string[] = [];
  if (welder.inspVisual) rows.push("ВТ");
  if (welder.inspRadiographic) rows.push("РТ");
  if (welder.inspUltrasonic) rows.push("УЗК");
  if (welder.inspBend) rows.push("вигин");
  if (welder.inspMetallographic) rows.push("металографія");
  if (welder.inspAdditional) rows.push("додатковий контроль");
  if (rows.length === 0) return "Не обрано";
  return `Обрано: ${rows.join(", ")}`;
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
