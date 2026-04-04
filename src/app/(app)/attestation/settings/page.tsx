import { desc } from "drizzle-orm";

import { AttestationSettingsTabs } from "@/components/attestation/AttestationSettingsTabs";
import { CommissionRosterTable } from "@/components/attestation/CommissionRosterTable";
import { DocumentTemplatesTable } from "@/components/attestation/DocumentTemplatesTable";
import { RegulatoryDocumentsTable } from "@/components/attestation/RegulatoryDocumentsTable";
import { SampleMaterialsTable } from "@/components/attestation/SampleMaterialsTable";
import { TemplateUploadForm } from "@/components/attestation/TemplateUploadForm";
import { WeldingConsumablesTable } from "@/components/attestation/WeldingConsumablesTable";
import { GuardedForm } from "@/components/forms/GuardedForm";
import { db } from "@/db";
import {
  commissionMembers,
  documentTemplates,
  regulatoryDocuments,
  sampleMaterials,
  weldingConsumables,
} from "@/db/schema/attestation";
import { addCommissionMemberAction } from "@/lib/attestation/commission-roster-actions";
import { addRegulatoryDocumentAction } from "@/lib/attestation/regulatory-documents-actions";
import { addSampleMaterialAction } from "@/lib/attestation/sample-materials-actions";
import { WELDING_COATING_TYPES } from "@/lib/attestation/welding-consumable-coating-options";
import { addWeldingConsumableAction } from "@/lib/attestation/welding-consumables-actions";
import { requireApprovedUser } from "@/lib/authz";

export default async function AttestationSettingsPage() {
  await requireApprovedUser();

  const members = await db.select().from(commissionMembers).orderBy(desc(commissionMembers.createdAt));
  const templates = await db.select().from(documentTemplates).orderBy(desc(documentTemplates.createdAt));
  const regulatory = await db
    .select()
    .from(regulatoryDocuments)
    .orderBy(regulatoryDocuments.sortOrder, regulatoryDocuments.code);
  const samples = await db.select().from(sampleMaterials).orderBy(sampleMaterials.steelGrade);
  const consumablesList = await db
    .select()
    .from(weldingConsumables)
    .orderBy(weldingConsumables.coatingType, weldingConsumables.materialGrade);

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Налаштування атестації</h1>
      </div>

      <AttestationSettingsTabs
        commission={
          <>
            <GuardedForm
              action={addCommissionMemberAction}
              resetOnSuccess
              className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="text-sm font-medium">Додати члена</div>
              <input name="fullName" required placeholder="ПІБ" className="h-10 rounded-md border border-border px-3" />
              <input name="position" placeholder="Посада (для протоколу)" className="h-10 rounded-md border border-border px-3" />
              <select name="role" className="h-10 rounded-md border border-border px-3" defaultValue="member">
                <option value="member">Член комісії</option>
                <option value="head">Голова комісії</option>
              </select>
              <button type="submit" className="crm-btn-primary w-fit">
                Додати
              </button>
            </GuardedForm>

            <CommissionRosterTable
              rosterRows={members.map((m) => ({
                id: m.id,
                fullName: m.fullName,
                position: m.position,
                role: m.role,
                isActive: m.isActive,
              }))}
            />
          </>
        }
        regulatory={
          <>
            <GuardedForm
              action={addRegulatoryDocumentAction}
              resetOnSuccess
              className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="text-sm font-medium">Додати НД</div>
              <input name="code" required placeholder="Шифр (унікальний)" className="h-10 rounded-md border border-border px-3" />
              <input name="name" required placeholder="Повна назва" className="h-10 rounded-md border border-border px-3" />
              <textarea name="admissionText" required placeholder="Текст допуску" rows={3} className="rounded-md border border-border px-3 py-2" />
              <button type="submit" className="crm-btn-primary w-fit">
                Додати
              </button>
            </GuardedForm>
            <RegulatoryDocumentsTable
              rows={regulatory.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                admissionText: r.admissionText,
                isActive: r.isActive,
              }))}
            />
          </>
        }
        samples={
          <>
            <GuardedForm
              action={addSampleMaterialAction}
              resetOnSuccess
              className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="text-sm font-medium">Додати матеріал</div>
              <select name="groupCode" required className="h-10 rounded-md border border-border px-3" defaultValue="W01">
                <option value="W01">W01</option>
                <option value="W02">W02</option>
                <option value="W03">W03</option>
                <option value="W04">W04</option>
                <option value="W11">W11</option>
              </select>
              <input name="steelGrade" required placeholder="Марка сталі" className="h-10 rounded-md border border-border px-3" />
              <button type="submit" className="crm-btn-primary w-fit">
                Додати
              </button>
            </GuardedForm>
            <SampleMaterialsTable
              rows={samples.map((s) => ({
                id: s.id,
                groupCode: s.groupCode,
                steelGrade: s.steelGrade,
                isActive: s.isActive,
              }))}
            />
          </>
        }
        consumables={
          <>
            <GuardedForm
              action={addWeldingConsumableAction}
              resetOnSuccess
              className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="text-sm font-medium">Додати матеріал</div>
              <select name="coatingType" required className="h-10 rounded-md border border-border px-3" defaultValue="B">
                {WELDING_COATING_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input name="materialGrade" required placeholder="Марка (напр. УОНИ 13/45)" className="h-10 rounded-md border border-border px-3" />
              <button type="submit" className="crm-btn-primary w-fit">
                Додати
              </button>
            </GuardedForm>
            <WeldingConsumablesTable
              rows={consumablesList.map((c) => ({
                id: c.id,
                materialGrade: c.materialGrade,
                coatingType: c.coatingType,
                isActive: c.isActive,
              }))}
            />
          </>
        }
        templates={
          <>
            <p className="text-sm text-muted-foreground">
              Завантажте три типи шаблонів (.docx) та активуйте по одному на тип. Генерація документів використовує лише завантажені
              шаблони з Blob.
            </p>
            <TemplateUploadForm />
            <DocumentTemplatesTable
              rows={templates.map((t) => ({
                id: t.id,
                templateType: t.templateType,
                name: t.name,
                isActive: t.isActive,
              }))}
            />
          </>
        }
      />
    </div>
  );
}
