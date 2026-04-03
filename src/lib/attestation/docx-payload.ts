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
  formatCoatingAdmissionShort,
  formatElectrodeOrWireDocx,
  formatMaterialGroupAdmissionShort,
  formatSampleMaterialGradeDocx,
  formatWeldedPartsSampleDisplay,
} from "@/lib/attestation/admission-scope";
import { buildCertificationCodeString, formatJointCharacteristicsForCode } from "@/lib/attestation/certification-code";
import {
  computeCertificateBlankNumber,
  computeCertificateNumber,
  computeValidityDates,
} from "@/lib/attestation/compute";
import {
  admissionJointTypesShort,
  certificationTypeLabelUa,
  jointTypeLabelUa,
  seamTypeDocxUa,
  theoryScoreLabelUa,
} from "@/lib/attestation/labels-uk";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("uk-UA");
}

/** Порядок полів як у посвідченні; збирається в один рядок для `{admission}` у протоколі. */
const ADMISSION_SUMMARY_KEYS = [
  "admission-welding-method",
  "admission-welded-parts-type",
  "admission-seam-type",
  "admission-sample-material-grade",
  "admission-electrode-or-wire",
  "admission-shielding-gas-or-flux",
  "admission-pipe-outer-diameter",
  "admission-sample-thickness",
  "admission-welding-position",
  "admission-performing-weld",
] as const;

function skipAdmissionSummaryToken(s: string): boolean {
  const t = s.trim();
  return t === "" || t === "—" || t === "-";
}

function normalizeAdmissionWeldingMethodSummary(s: string): string {
  return s.trim().replace(/\s*\/\s*/g, "\\");
}

/** `P(пластина)` / `T(труба)…` → `П` / `Т` як у компактному коді (§7.7.1). */
function compactAdmissionWeldedPartsType(s: string): string {
  const t = s.trim();
  if (t === "P(пластина)") return "П";
  if (t.includes("T(труба)")) return "Т";
  return t;
}

/**
 * Один рядок з полів допуску посвідчення (ті самі ключі, що в шаблоні сертифіката).
 */
export function buildAdmissionSummaryLine(cert: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of ADMISSION_SUMMARY_KEYS) {
    const raw = cert[key];
    if (typeof raw !== "string") continue;
    if (skipAdmissionSummaryToken(raw)) continue;
    let v = raw.trim();
    if (key === "admission-welding-method") v = normalizeAdmissionWeldingMethodSummary(v);
    if (key === "admission-welded-parts-type") v = compactAdmissionWeldedPartsType(v);
    parts.push(v);
  }
  return parts.join(" ");
}

/** Ukrainian filing style: `20.03.2028 р.` (day.month.year + space + р.) */
function fmtCertFilingDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year} р.`;
}

function decStr(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : v;
}

/** `ПІБ - посада` для полів протоколу / відомості (напр. голова, члени комісії). */
export function formatCommissionMemberDocxLine(
  fullName: string,
  position: string | null | undefined,
): string {
  const name = fullName.trim();
  const pos = position?.trim();
  if (!pos) return name;
  return `${name} - ${pos}`;
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
 * `admission-seam-type` — лише розрахунок: `BW` / `FW` / `BW, FW` (без ручного допуску характеристики шва — він у `admission-performing-weld`).
 * `welding-position` — коди ISO: `PA` або `PA, PF`; `admission-welding-position` — лише `manualWeldingPositionAdmission`.
 * `performing-weld` — характеристика шва: `ss nb`, `bs gg` (код з підкреслення → пробіл); `admission-performing-weld` — лише `manualJointCharacteristicsAdmission`.
 * `admission-diameter-scope` + `admission-diameter-table-ref` (табл. 3 для труби; п.6.2.2–6.2.3 для пластини).
 * Короткі межі, напр. `3≤t≤20`,
 * `admission-diameter-scope` (табл. 3 або `D>500` / `D>150` для пластини п.6.2.2–6.2.3), інші `admission-*`.
 * `sample-material-grade` — `W01 (Ст3пс)`; `admission-sample-material-grade` — коротко `W01` / `W01, W02` / … за табл. 6–7 (п. 6.3).
 * `electrode-or-wire` — `B (марка)` або `B (марка) / C (марка)` при комбінованому зварюванні; `admission-electrode-or-wire` — коротко типи покриття за табл. 8 (перетин для обох матеріалів).
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

  const electrodeOrWire = formatElectrodeOrWireDocx(consumable1, consumable2, welder.isCombined);

  const coatingTypesForAdmission = [consumable1.coatingType, consumable2?.coatingType ?? null].filter(
    Boolean,
  ) as string[];

  const thicknessParts = [welder.thickness1, welder.thickness2, welder.thickness3]
    .map(decStr)
    .filter(Boolean) as string[];
  const sampleThickness = thicknessParts.join(", ");

  const weldingPositionCodes = [...new Set([welder.weldingPosition1, welder.weldingPosition2].filter(Boolean))].join(
    ", ",
  );
  const admissionWeldingPositionManual = welder.manualWeldingPositionAdmission?.trim() || "—";

  const birthdayStr = welder.birthday ? fmtCertFilingDate(new Date(welder.birthday)) : "—";

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
    chairperson: head.fullName.trim(),
    "prev-qualification-doc-number": welder.prevQualificationDoc ?? "—",
    "theory-score": theoryScoreLabelUa(welder.theoryScore),
    "sert-number": certNum,
    "protocol-number": group.groupNumber,
    "protocol-date": fmtCertFilingDate(protocolDate),
    "certificate issued": fmtCertFilingDate(issueDate),
    "next-certification-date": fmtCertFilingDate(nextCertificationDate),
    "standards-list": standardsList,
    "standards-list-admission": standardsAdmission,
    certification,
    "welding-method": welder.isCombined
      ? `${welder.weldingMethod1} / ${welder.weldingMethod2 ?? ""}`
      : welder.weldingMethod1,
    "welded-parts-type": formatWeldedPartsSampleDisplay(welder.weldedPartsType),
    "sample-material-grade": formatSampleMaterialGradeDocx(sampleMaterial.groupCode, sampleMaterial.steelGrade),
    "sample-thickness": sampleThickness,
    "pipe-outer-diameter": [welder.pipeDiameter1, welder.pipeDiameter2, welder.pipeDiameter3]
      .map(decStr)
      .filter(Boolean)
      .join(", "),
    "shielding-gas-or-flux": welder.shieldingGasFlux ?? "—",
    "welding-position": weldingPositionCodes,
    "electrode-or-wire": electrodeOrWire,
    "joint-type": jointTypeLabelUa(welder.jointType),
    "certification-type": certificationTypeLabelUa(welder.certificationType),
    "work-experience-years": String(welder.workExperienceYears),
    "sample-mark": welder.sampleMark,
    "work-company": company.shortName,
    "certificate-valid-until": fmtDate(certificateValidUntil),
    "blank-number": blankNum,
    "sertificate-number": blankNum,
    ...admissionScope,
  };

  const manualJoint = welder.manualJointCharacteristicsAdmission?.trim();
  const admissionJointCharacteristicsManual = manualJoint || "—";
  const jointCharacteristicsDocx = formatJointCharacteristicsForCode(
    welder.jointCharacteristics as Parameters<typeof formatJointCharacteristicsForCode>[0],
  );
  const admissionSeamShort = admissionJointTypesShort(welder.jointType);
  Object.assign(base, {
    "admission-electrode-or-wire": formatCoatingAdmissionShort(coatingTypesForAdmission),
    "admission-pipe-outer-diameter": admissionScope["admission-diameter-scope"],
    "admission-sample-thickness": admissionScope["admission-thickness-scope"],
    "admission-shielding-gas-or-flux": welder.shieldingGasFlux ?? "—",
    "admission-welding-position": admissionWeldingPositionManual,
    "admission-performing-weld": admissionJointCharacteristicsManual,
    "admission-sample-material-grade": formatMaterialGroupAdmissionShort(sampleMaterial.groupCode),
    "admission-welding-method": base["welding-method"],
    "admission-seam-type": admissionSeamShort,
    "seam-type": seamTypeDocxUa(welder.jointType),
    "performing-weld": jointCharacteristicsDocx,
  });

  return base;
}

/** Поля з `forms/protocol.docx` (і сумісних завантажених шаблонів протоколу). */
export function buildProtocolDocxPayload(
  ctx: WelderDocContext,
  commissionMemberDisplayLines: string[],
  commissionMemberNamesForItems: string[],
): Record<string, unknown> {
  const cert = buildCertificateDocxPayload(ctx);
  const { welder, regulatoryDocs } = ctx;

  const fullName = [welder.lastName, welder.firstName, welder.middleName].filter(Boolean).join(" ").trim();

  const hasBirthday = Boolean(welder.birthday);
  const hasBirthLocation = Boolean(welder.birthLocation?.trim());
  let birthYearLocation = "—";
  if (hasBirthday || hasBirthLocation) {
    const datePart = hasBirthday ? fmtCertFilingDate(new Date(welder.birthday!)) : "—";
    const locPart = welder.birthLocation?.trim() || "—";
    birthYearLocation = `${datePart}, ${locPart}`;
  }

  const jc = formatJointCharacteristicsForCode(
    welder.jointCharacteristics as Parameters<typeof formatJointCharacteristicsForCode>[0],
  );
  const jointDesc = `${seamTypeDocxUa(welder.jointType)}, ${jc}`;

  const standardsAdmission = regulatoryDocs.map((r) => r.admissionText.trim()).join(", ");

  const memberLines = commissionMemberDisplayLines.map((n) => n.trim()).filter(Boolean);
  const itemMemberNames = commissionMemberNamesForItems.map((n) => n.trim()).filter(Boolean);

  const inspectionRows = buildProtocolInspectionItems(welder, ctx.group);

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
    items: inspectionRows,
    inspectionItems: inspectionRows,
    inspectionitems: inspectionRows,
    commissionItems: itemMemberNames.map((m) => ({ member: m })),
    "admission-type": standardsAdmission,
    admission: buildAdmissionSummaryLine(cert),
  };
}

type WelderRow = Parameters<typeof buildCertificateDocxPayload>[0]["welder"];

function inspectionResultLabelUa(v: WelderRow["inspVisualResult"]): string {
  if (v === "failed") return "незадовільно";
  return "задовільно";
}

/** Третя колонка: `задовільно, Протокол №1/VT   від 19.03.2026 р.` */
function formatProtocolInspectionLineUa(
  resultLabel: string,
  groupNumber: string,
  methodCode: string,
  inspectionDate: Date,
): string {
  const dateStr = fmtCertFilingDate(inspectionDate);
  return `${resultLabel}, Протокол №${groupNumber}/${methodCode}   від ${dateStr}`;
}

/** Рядки «Контроль якості» для `{#inspectionItems}…{/inspectionItems}`. */
function buildProtocolInspectionItems(
  welder: WelderRow,
  group: typeof certificationGroups.$inferSelect,
): Record<string, unknown>[] {
  const rows: Array<{
    selected: boolean;
    code: string;
    labelUa: string;
    result: WelderRow["inspVisualResult"];
  }> = [
    { selected: welder.inspVisual, code: "VT", labelUa: "Візуальний огляд", result: welder.inspVisualResult },
    { selected: welder.inspRadiographic, code: "RT", labelUa: "Радіографія", result: welder.inspRadiographicResult },
    { selected: welder.inspUltrasonic, code: "UT", labelUa: "УЗК", result: welder.inspUltrasonicResult },
    { selected: welder.inspBend, code: "MT", labelUa: "Вигин", result: welder.inspBendResult },
    {
      selected: welder.inspMetallographic,
      code: "MGT",
      labelUa: "Металографія",
      result: welder.inspMetallographicResult,
    },
    { selected: welder.inspAdditional, code: "IT", labelUa: "Додатковий контроль", result: welder.inspAdditionalResult },
  ];

  const inspectionDate = new Date(group.inspectionDate);
  const out: Record<string, unknown>[] = [];
  let n = 0;
  for (const r of rows) {
    if (!r.selected) continue;
    n++;
    const resultLabel = inspectionResultLabelUa(r.result);
    const inspectionText = formatProtocolInspectionLineUa(resultLabel, group.groupNumber, r.code, inspectionDate);
    out.push({
      "inspection-order-number": `9.${n}`,
      "test-type": r.labelUa,
      inspection: inspectionText,
    });
  }
  return out;
}

/**
 * Звіт до УАКЗ (`report_protocol` / `forms/report.docx`).
 * - `{#items}…{/items}` — рядки таблиці по зварниках (`group-oder-number`, `sertificate-number` = `ОД-1/{номер}`, `certification`, …).
 * - `{#commissionItems}…{/commissionItems}` — підписи членів комісії; у кожному рядку `{member}` або `{member-1}` — лише ПІБ з довідника, без посади, без голови (голова окремо в `{chairperson}`).
 * - `{members-with-position}` — члени комісії (без голови) у тексті листа: `ПІБ - посада` для кожного, через кому.
 * - `{chairperson-with-position}` — ПІБ голови та посада в одному рядку (`ПІБ - посада`).
 */
export function buildReportDocxPayload(
  group: typeof certificationGroups.$inferSelect,
  head: typeof commissionMembers.$inferSelect,
  memberNamesOnly: string[],
  membersWithPositionLines: string[],
  items: Record<string, unknown>[],
): Record<string, unknown> {
  const protocolDate = new Date(group.protocolDate);
  return {
    "group-date": fmtDate(protocolDate),
    "group-number": group.groupNumber,
    chairperson: head.fullName.trim(),
    "chairperson-with-position": formatCommissionMemberDocxLine(head.fullName, head.position),
    "members-with-position": membersWithPositionLines.join(", "),
    items,
    commissionItems: memberNamesOnly.map((line) => ({ member: line, "member-1": line })),
  };
}

export function buildReportItemRow(ctx: WelderDocContext): Record<string, unknown> {
  const certPayload = buildCertificateDocxPayload(ctx);
  const { welder, company } = ctx;
  const fullNameBirthday = [welder.lastName, welder.firstName, welder.middleName].filter(Boolean).join(" ");
  const orderStr = String(welder.orderInGroup);
  return {
    ...certPayload,
    "full-name-birthday": `${fullNameBirthday}, ${certPayload.birthday}`,
    "work-experience-years-work-company": `${welder.workExperienceYears} р.; ${company.shortName}`,
    "group-oder-number": orderStr,
    "group-order-number": orderStr,
  };
}
