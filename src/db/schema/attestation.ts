import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { companies } from "./companies";
import { users } from "./users";

export const commissionMemberRoles = ["head", "member"] as const;
export const commissionMemberRoleEnum = pgEnum("commission_member_role", commissionMemberRoles);

export const sampleMaterialGroupCodes = ["W01", "W02", "W03", "W04", "W11"] as const;
export const sampleMaterialGroupCodeEnum = pgEnum("sample_material_group_code", sampleMaterialGroupCodes);

export const weldingConsumableCoatingTypes = ["A", "RA", "R", "RB", "RC", "B", "C", "S"] as const;
export const weldingConsumableCoatingTypeEnum = pgEnum("welding_consumable_coating_type", weldingConsumableCoatingTypes);

export const certificationGroupStatuses = ["draft", "active", "completed", "archived"] as const;
export const certificationGroupStatusEnum = pgEnum("certification_group_status", certificationGroupStatuses);

export const welderCertificationTypes = ["primary", "additional", "periodic", "extraordinary"] as const;
export const welderCertificationTypeEnum = pgEnum("welder_certification_type", welderCertificationTypes);

export const weldedPartsTypes = ["plate", "pipe"] as const;
export const weldedPartsTypeEnum = pgEnum("welded_parts_type", weldedPartsTypes);

export const jointTypes = ["BW", "FW"] as const;
export const jointTypeEnum = pgEnum("joint_type", jointTypes);

export const jointCharacteristicsValues = ["bs_gg", "bs_ng", "ss_mb", "ss_nb"] as const;
export const jointCharacteristicsEnum = pgEnum("joint_characteristics", jointCharacteristicsValues);

export const inspectionResults = ["passed", "failed"] as const;
export const inspectionResultEnum = pgEnum("inspection_result", inspectionResults);

export const theoryScores = ["passed", "failed"] as const;
export const theoryScoreEnum = pgEnum("theory_score", theoryScores);

export const attestationTemplateTypes = ["protocol", "certificate", "report_protocol"] as const;
export type AttestationTemplateType = (typeof attestationTemplateTypes)[number];
export const attestationTemplateTypeEnum = pgEnum("attestation_template_type", attestationTemplateTypes);

export const commissionMembers = pgTable("commission_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  role: commissionMemberRoleEnum("role").notNull().default("member"),
  position: text("position"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const regulatoryDocuments = pgTable("regulatory_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 500 }).notNull(),
  admissionText: text("admission_text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const sampleMaterials = pgTable("sample_materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupCode: sampleMaterialGroupCodeEnum("group_code").notNull(),
  steelGrade: varchar("steel_grade", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const weldingConsumables = pgTable("welding_consumables", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialGrade: varchar("material_grade", { length: 150 }).notNull(),
  coatingType: weldingConsumableCoatingTypeEnum("coating_type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const certificationGroups = pgTable("certification_groups", {
    id: uuid("id").defaultRandom().primaryKey(),
    groupNumber: varchar("group_number", { length: 50 }).notNull().unique(),
    protocolDate: date("protocol_date").notNull(),
    inspectionDate: date("inspection_date").notNull(),
    certificateIssueDate: date("certificate_issue_date").notNull(),
    certificateIssueLocation: varchar("certificate_issue_location", { length: 255 }).notNull(),
    headId: uuid("head_id")
      .notNull()
      .references(() => commissionMembers.id),
    status: certificationGroupStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  });

export const certificationGroupMembers = pgTable(
  "certification_group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => certificationGroups.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => commissionMembers.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.groupId, t.memberId] }),
  }),
);

export const welderCertifications = pgTable(
  "welder_certifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => certificationGroups.id, { onDelete: "cascade" }),
    orderInGroup: smallint("order_in_group").notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    birthLocation: varchar("birth_location", { length: 255 }),
    birthday: date("birthday"),
    prevQualificationDoc: varchar("prev_qualification_doc", { length: 255 }),
    workExperienceYears: decimal("work_experience_years", { precision: 4, scale: 1 }).notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    certificationType: welderCertificationTypeEnum("certification_type").notNull().default("primary"),
    isCombined: boolean("is_combined").notNull().default(false),
    weldingMethod1: varchar("welding_method_1", { length: 20 }).notNull(),
    weldingMethod2: varchar("welding_method_2", { length: 20 }),
    weldedPartsType: weldedPartsTypeEnum("welded_parts_type").notNull(),
    jointType: jointTypeEnum("joint_type").notNull(),
    jointCharacteristics: jointCharacteristicsEnum("joint_characteristics").notNull(),
    weldingPosition1: varchar("welding_position_1", { length: 10 }).notNull(),
    weldingPosition2: varchar("welding_position_2", { length: 10 }),
    preheat: boolean("preheat").notNull().default(false),
    heatTreatment: boolean("heat_treatment").notNull().default(false),
    sampleMaterialId: uuid("sample_material_id")
      .notNull()
      .references(() => sampleMaterials.id),
    thickness1: decimal("thickness_1", { precision: 6, scale: 2 }),
    thickness2: decimal("thickness_2", { precision: 6, scale: 2 }),
    thickness3: decimal("thickness_3", { precision: 6, scale: 2 }),
    pipeDiameter1: decimal("pipe_diameter_1", { precision: 7, scale: 2 }),
    pipeDiameter2: decimal("pipe_diameter_2", { precision: 7, scale: 2 }),
    pipeDiameter3: decimal("pipe_diameter_3", { precision: 7, scale: 2 }),
    consumable1Id: uuid("consumable_1_id")
      .notNull()
      .references(() => weldingConsumables.id),
    consumable2Id: uuid("consumable_2_id").references(() => weldingConsumables.id),
    shieldingGasFlux: varchar("shielding_gas_flux", { length: 255 }),
    sampleMark: varchar("sample_mark", { length: 50 }).notNull(),
    inspVisual: boolean("insp_visual").notNull().default(true),
    inspRadiographic: boolean("insp_radiographic").notNull().default(true),
    inspUltrasonic: boolean("insp_ultrasonic").notNull().default(false),
    inspBend: boolean("insp_bend").notNull().default(false),
    inspMetallographic: boolean("insp_metallographic").notNull().default(false),
    inspAdditional: boolean("insp_additional").notNull().default(false),
    inspVisualResult: inspectionResultEnum("insp_visual_result"),
    inspRadiographicResult: inspectionResultEnum("insp_radiographic_result"),
    inspUltrasonicResult: inspectionResultEnum("insp_ultrasonic_result"),
    inspBendResult: inspectionResultEnum("insp_bend_result"),
    inspMetallographicResult: inspectionResultEnum("insp_metallographic_result"),
    inspAdditionalResult: inspectionResultEnum("insp_additional_result"),
    theoryScore: theoryScoreEnum("theory_score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("welder_certifications_group_order_uidx").on(t.groupId, t.orderInGroup),
  ],
);

export const welderCertificationRegulatoryDocuments = pgTable(
  "welder_certification_regulatory_documents",
  {
    welderCertificationId: uuid("welder_certification_id")
      .notNull()
      .references(() => welderCertifications.id, { onDelete: "cascade" }),
    regulatoryDocumentId: uuid("regulatory_document_id")
      .notNull()
      .references(() => regulatoryDocuments.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.welderCertificationId, t.regulatoryDocumentId] }),
  }),
);

export const documentTemplates = pgTable(
  "document_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateType: attestationTemplateTypeEnum("template_type").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    storageKey: text("storage_key").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("document_templates_one_active_per_type").on(t.templateType).where(sql`${t.isActive} = true`),
  ],
);
