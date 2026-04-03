import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { WelderCertificationFormFields } from "@/components/attestation/WelderCertificationFormFields";
import { WelderCertificationNewForm } from "@/components/attestation/WelderCertificationNewForm";
import { db } from "@/db";
import { companies } from "@/db/schema/companies";
import {
  certificationGroups,
  regulatoryDocuments,
  sampleMaterials,
  weldingConsumables,
  welderCertificationRegulatoryDocuments,
  welderCertifications,
} from "@/db/schema/attestation";
import { allocateNextFreeOrderInGroup } from "@/lib/attestation/allocate-next-free-order-in-group";
import { buildDuplicateWelderTemplate } from "@/lib/attestation/build-duplicate-welder-template";
import { requireRole } from "@/lib/authz";
import { parseWelderCertificationForm } from "@/lib/attestation/parse-welder-form";
import { DROPDOWN_SCOPE, getDropdownOptions } from "@/lib/dropdown-options";

export default async function NewWelderCertificationPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; from?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const explicitGroupId = String(sp.groupId ?? "").trim();
  const fromId = String(sp.from ?? "").trim();

  let defaultGroupId = explicitGroupId;
  let duplicateInitial: (typeof welderCertifications.$inferSelect) | undefined;
  let selectedRegulatoryIds: string[] = [];

  if (fromId) {
    const source = await db.query.welderCertifications.findFirst({
      where: eq(welderCertifications.id, fromId),
    });
    if (source) {
      const g = await db.query.certificationGroups.findFirst({
        where: eq(certificationGroups.id, source.groupId),
      });
      if (g) {
        const groupActive = g.status === "active";
        if (!explicitGroupId) {
          defaultGroupId = groupActive ? source.groupId : "";
        }
        duplicateInitial = buildDuplicateWelderTemplate(source, groupActive);
        if (explicitGroupId) {
          duplicateInitial = { ...duplicateInitial, groupId: explicitGroupId };
        }
        const regRows = await db
          .select({ regulatoryDocumentId: welderCertificationRegulatoryDocuments.regulatoryDocumentId })
          .from(welderCertificationRegulatoryDocuments)
          .where(eq(welderCertificationRegulatoryDocuments.welderCertificationId, fromId));
        selectedRegulatoryIds = regRows.map((r) => r.regulatoryDocumentId);
      }
    }
  }

  const [groups, companyRows, samples, consumables, regDocs, dropdownStuff] = await Promise.all([
    db
      .select()
      .from(certificationGroups)
      .where(inArray(certificationGroups.status, ["draft", "active"]))
      .orderBy(desc(certificationGroups.createdAt)),
    db.select().from(companies).orderBy(companies.shortName),
    db.select().from(sampleMaterials).where(eq(sampleMaterials.isActive, true)).orderBy(sampleMaterials.steelGrade),
    db.select().from(weldingConsumables).where(eq(weldingConsumables.isActive, true)).orderBy(weldingConsumables.materialGrade),
    db.select().from(regulatoryDocuments).where(eq(regulatoryDocuments.isActive, true)).orderBy(regulatoryDocuments.sortOrder, regulatoryDocuments.code),
    Promise.all([
      getDropdownOptions(DROPDOWN_SCOPE.TAX_STATUS),
      getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_NOM),
      getDropdownOptions(DROPDOWN_SCOPE.SIGNER_POSITION_GEN),
      getDropdownOptions(DROPDOWN_SCOPE.ACTING_UNDER),
      getDropdownOptions(DROPDOWN_SCOPE.WELDER_MANUAL_JOINT_ADMISSION),
      getDropdownOptions(DROPDOWN_SCOPE.WELDER_MANUAL_POSITION_ADMISSION),
    ]),
  ]);
  const [
    taxStatusOptions,
    signerPositionNomOptions,
    signerPositionGenOptions,
    actingUnderOptions,
    welderManualJointAdmissionOptions,
    welderManualPositionAdmissionOptions,
  ] = dropdownStuff;

  async function createWelder(formData: FormData) {
    "use server";
    await requireRole("MANAGER");

    const skipRedirect = String(formData.get("_skipRedirect") ?? "") === "1";

    const parsed = parseWelderCertificationForm(formData);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const group = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, d.groupId),
    });
    if (!group) throw new Error("Групу не знайдено");
    if (group.status === "completed" || group.status === "archived") {
      throw new Error("Редагування заборонено: група завершена або в архіві");
    }

    const nextOrder = await allocateNextFreeOrderInGroup(d.groupId);

    const pipeNull = d.weldedPartsType === "plate";

    const [row] = await db
      .insert(welderCertifications)
      .values({
        groupId: d.groupId,
        orderInGroup: nextOrder,
        lastName: d.lastName.trim(),
        firstName: d.firstName.trim(),
        middleName: d.middleName.trim(),
        birthLocation: d.birthLocation.trim(),
        birthday: d.birthday.trim(),
        prevQualificationDoc: d.prevQualificationDoc.trim(),
        workExperienceYears: d.workExperienceYears.trim(),
        companyId: d.companyId,
        certificationType: d.certificationType,
        isCombined: d.isCombined,
        weldingMethod1: d.weldingMethod1.trim(),
        weldingMethod2: d.isCombined ? d.weldingMethod2?.trim() ?? null : null,
        weldedPartsType: d.weldedPartsType,
        jointType: d.jointType,
        jointCharacteristics: d.jointCharacteristics,
        weldingPosition1: d.weldingPosition1.trim(),
        weldingPosition2: d.weldingPosition2?.trim() || null,
        preheat: d.preheat,
        heatTreatment: d.heatTreatment,
        manualJointCharacteristicsAdmission: d.manualJointCharacteristicsAdmission.trim(),
        manualWeldingPositionAdmission: d.manualWeldingPositionAdmission.trim(),
        manualThicknessAdmission: d.manualThicknessAdmission.trim(),
        manualDiameterAdmission: pipeNull ? "" : d.manualDiameterAdmission.trim(),
        sampleMaterialId: d.sampleMaterialId,
        thickness1: d.thickness1?.trim() ?? null,
        thickness2: d.thickness2?.trim() || null,
        thickness3: d.thickness3?.trim() || null,
        pipeDiameter1: pipeNull ? null : d.pipeDiameter1?.trim() ?? null,
        pipeDiameter2: pipeNull ? null : d.pipeDiameter2?.trim() || null,
        pipeDiameter3: pipeNull ? null : d.pipeDiameter3?.trim() || null,
        consumable1Id: d.consumable1Id,
        consumable2Id: d.isCombined ? d.consumable2Id ?? null : null,
        shieldingGasFlux: d.shieldingGasFlux?.trim() || null,
        sampleMark: d.sampleMark.trim(),
        inspVisual: d.inspVisual,
        inspRadiographic: d.inspRadiographic,
        inspUltrasonic: d.inspUltrasonic,
        inspBend: d.inspBend,
        inspMetallographic: d.inspMetallographic,
        inspAdditional: d.inspAdditional,
        inspVisualResult: null,
        inspRadiographicResult: null,
        inspUltrasonicResult: null,
        inspBendResult: null,
        inspMetallographicResult: null,
        inspAdditionalResult: null,
        theoryScore: d.theoryScore,
      })
      .returning();

    if (!row) throw new Error("CREATE_FAILED");

    if (d.regulatoryDocumentIds.length > 0) {
      await db.insert(welderCertificationRegulatoryDocuments).values(
        d.regulatoryDocumentIds.map((regulatoryDocumentId) => ({
          welderCertificationId: row.id,
          regulatoryDocumentId,
        })),
      );
    }

    if (skipRedirect) {
      return { welderId: row.id };
    }
    redirect("/attestation/welders");
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <Link className="text-sm text-muted-foreground underline" href="/attestation/welders">
          ← До списку зварників
        </Link>
        <h1 className="page-title mt-2">Нова атестація зварника</h1>
        {duplicateInitial ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Заповнено за шаблоном іншого запису: прізвище, імʼя, по батькові, місце народження, дати, попереднє посвідчення, стаж і компанію потрібно ввести заново. Група атестації залишена лише якщо вона була в статусі «Активна».
          </p>
        ) : null}
      </div>

      <WelderCertificationNewForm createWelder={createWelder} successMessage="Атестацію створено.">
        <WelderCertificationFormFields
          key={fromId ? `dup-${fromId}` : "new-welder"}
          groups={groups}
          companies={companyRows}
          quickCreateCompanyDropdowns={{
            taxStatusOptions,
            signerPositionNomOptions,
            signerPositionGenOptions,
            actingUnderOptions,
          }}
          sampleMaterials={samples}
          consumables={consumables}
          regulatoryDocs={regDocs}
          defaultGroupId={defaultGroupId}
          initial={duplicateInitial}
          selectedRegulatoryIds={selectedRegulatoryIds}
          welderManualJointAdmissionOptions={welderManualJointAdmissionOptions}
          welderManualPositionAdmissionOptions={welderManualPositionAdmissionOptions}
        />
      </WelderCertificationNewForm>
    </div>
  );
}
