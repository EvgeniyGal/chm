import Link from "next/link";
import { desc, eq, inArray, max } from "drizzle-orm";
import { redirect } from "next/navigation";

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

export default async function NewWelderCertificationPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const defaultGroupId = String(sp.groupId ?? "").trim();

  const [groups, companyRows, samples, consumables, regDocs] = await Promise.all([
    db
      .select()
      .from(certificationGroups)
      .where(inArray(certificationGroups.status, ["draft", "active"]))
      .orderBy(desc(certificationGroups.createdAt)),
    db.select().from(companies).orderBy(companies.shortName),
    db.select().from(sampleMaterials).where(eq(sampleMaterials.isActive, true)).orderBy(sampleMaterials.steelGrade),
    db.select().from(weldingConsumables).where(eq(weldingConsumables.isActive, true)).orderBy(weldingConsumables.materialGrade),
    db.select().from(regulatoryDocuments).where(eq(regulatoryDocuments.isActive, true)).orderBy(regulatoryDocuments.sortOrder, regulatoryDocuments.code),
  ]);

  async function createWelder(formData: FormData) {
    "use server";
    await requireRole("MANAGER");

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

    const [{ m }] = await db
      .select({ m: max(welderCertifications.orderInGroup) })
      .from(welderCertifications)
      .where(eq(welderCertifications.groupId, d.groupId));
    const nextOrder = (m ?? 0) + 1;

    const pipeNull = d.weldedPartsType === "plate";

    const [row] = await db
      .insert(welderCertifications)
      .values({
        groupId: d.groupId,
        orderInGroup: nextOrder,
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

    redirect(`/attestation/welders/${row.id}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link className="text-sm text-muted-foreground underline" href="/attestation/welders">
          ← До списку зварників
        </Link>
        <h1 className="page-title mt-2">Нова атестація зварника</h1>
      </div>

      <GuardedForm action={createWelder} className="flex flex-col gap-4">
        <WelderCertificationFormFields
          groups={groups}
          companies={companyRows}
          sampleMaterials={samples}
          consumables={consumables}
          regulatoryDocs={regDocs}
          defaultGroupId={defaultGroupId}
        />
        <button type="submit" className="crm-btn-primary w-fit">
          Зберегти
        </button>
      </GuardedForm>
    </div>
  );
}
