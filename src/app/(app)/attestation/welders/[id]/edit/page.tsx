import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { WelderCertificationFormFields } from "@/components/attestation/WelderCertificationFormFields";
import { GuardedForm } from "@/components/forms/GuardedForm";
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
import { requireRole } from "@/lib/authz";
import { parseWelderCertificationForm } from "@/lib/attestation/parse-welder-form";

export default async function EditWelderCertificationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const w = await db.query.welderCertifications.findFirst({
    where: eq(welderCertifications.id, id),
  });
  if (!w) notFound();

  const welderGroupId = w.groupId;

  const group = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, welderGroupId),
  });
  if (!group) notFound();
  if (group.status === "completed" || group.status === "archived") {
    redirect(`/attestation/welders/${id}`);
  }

  const regRows = await db
    .select()
    .from(welderCertificationRegulatoryDocuments)
    .where(eq(welderCertificationRegulatoryDocuments.welderCertificationId, id));
  const selectedRegulatoryIds = regRows.map((r) => r.regulatoryDocumentId);

  const [groups, companyRows, samples, consumables, regDocs] = await Promise.all([
    db.select().from(certificationGroups),
    db.select().from(companies).orderBy(companies.shortName),
    db.select().from(sampleMaterials).where(eq(sampleMaterials.isActive, true)).orderBy(sampleMaterials.steelGrade),
    db.select().from(weldingConsumables).where(eq(weldingConsumables.isActive, true)).orderBy(weldingConsumables.materialGrade),
    db.select().from(regulatoryDocuments).where(eq(regulatoryDocuments.isActive, true)).orderBy(regulatoryDocuments.sortOrder, regulatoryDocuments.code),
  ]);

  async function updateWelder(formData: FormData) {
    "use server";
    await requireRole("MANAGER");

    const parsed = parseWelderCertificationForm(formData);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const g = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, welderGroupId),
    });
    if (!g) throw new Error("Групу не знайдено");
    if (g.status === "completed" || g.status === "archived") {
      throw new Error("Редагування заборонено для цієї групи");
    }

    if (d.groupId !== welderGroupId) {
      throw new Error("Змінювати групу для існуючого запису не можна");
    }

    const pipeNull = d.weldedPartsType === "plate";

    await db
      .update(welderCertifications)
      .set({
        lastName: d.lastName.trim(),
        firstName: d.firstName.trim(),
        middleName: d.middleName?.trim() || null,
        birthLocation: d.birthLocation?.trim() || null,
        birthday: d.birthday?.trim() || null,
        prevQualificationDoc: d.prevQualificationDoc?.trim() || null,
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
        theoryScore: d.theoryScore,
        updatedAt: new Date(),
      })
      .where(eq(welderCertifications.id, id));

    await db
      .delete(welderCertificationRegulatoryDocuments)
      .where(eq(welderCertificationRegulatoryDocuments.welderCertificationId, id));

    if (d.regulatoryDocumentIds.length > 0) {
      await db.insert(welderCertificationRegulatoryDocuments).values(
        d.regulatoryDocumentIds.map((regulatoryDocumentId) => ({
          welderCertificationId: id,
          regulatoryDocumentId,
        })),
      );
    }

    redirect(`/attestation/welders/${id}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link className="text-sm text-muted-foreground underline" href={`/attestation/welders/${id}`}>
          ← До картки зварника
        </Link>
        <h1 className="page-title mt-2">Редагування атестації</h1>
      </div>

      <GuardedForm action={updateWelder} className="flex flex-col gap-4">
        <WelderCertificationFormFields
          groups={groups}
          companies={companyRows}
          sampleMaterials={samples}
          consumables={consumables}
          regulatoryDocs={regDocs}
          defaultGroupId={w.groupId}
          initial={w}
          lockGroupId
          selectedRegulatoryIds={selectedRegulatoryIds}
        />
        <button type="submit" className="crm-btn-primary w-fit">
          Зберегти
        </button>
      </GuardedForm>
    </div>
  );
}
