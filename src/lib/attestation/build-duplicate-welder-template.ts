import type { welderCertifications } from "@/db/schema/attestation";

type WelderRow = typeof welderCertifications.$inferSelect;

/**
 * Копіює технічні поля атестації; очищає ПІБ, місце народження, дати, стаж, компанію.
 * Група в шаблоні: лише якщо група активна (інакше порожньо — користувач обере).
 */
export function buildDuplicateWelderTemplate(source: WelderRow, groupIsActive: boolean): WelderRow {
  return {
    ...source,
    lastName: "",
    firstName: "",
    middleName: null,
    birthLocation: null,
    birthday: null,
    prevQualificationDoc: null,
    workExperienceYears: "" as WelderRow["workExperienceYears"],
    companyId: "" as WelderRow["companyId"],
    groupId: groupIsActive ? source.groupId : ("" as unknown as WelderRow["groupId"]),
  };
}
