import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { CommissionRosterTable } from "@/components/attestation/CommissionRosterTable";
import { TemplateRowActions } from "@/components/attestation/TemplateRowActions";
import { TemplateActivateButton, TemplateUploadForm } from "@/components/attestation/TemplateUploadForm";
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
import { requireRole } from "@/lib/authz";

export default async function AttestationSettingsPage() {
  await requireRole("MANAGER");

  const members = await db.select().from(commissionMembers).orderBy(desc(commissionMembers.createdAt));
  const templates = await db.select().from(documentTemplates).orderBy(desc(documentTemplates.createdAt));
  const regulatory = await db
    .select()
    .from(regulatoryDocuments)
    .orderBy(regulatoryDocuments.sortOrder, regulatoryDocuments.code);
  const samples = await db.select().from(sampleMaterials).orderBy(sampleMaterials.steelGrade);
  const consumablesList = await db.select().from(weldingConsumables).orderBy(weldingConsumables.materialGrade);

  async function addRegulatory(formData: FormData) {
    "use server";
    await requireRole("MANAGER");
    const code = String(formData.get("code") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const admissionText = String(formData.get("admissionText") ?? "").trim();
    if (!code || !name || !admissionText) throw new Error("Заповніть усі поля НД");
    await db.insert(regulatoryDocuments).values({ code, name, admissionText, isActive: true });
    revalidatePath("/attestation/settings");
  }

  async function archiveRegulatory(formData: FormData) {
    "use server";
    await requireRole("MANAGER");
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    await db.update(regulatoryDocuments).set({ isActive: false }).where(eq(regulatoryDocuments.id, id));
    revalidatePath("/attestation/settings");
  }

  async function addSampleMaterial(formData: FormData) {
    "use server";
    await requireRole("MANAGER");
    const groupCode = String(formData.get("groupCode") ?? "").trim() as "W01" | "W02" | "W03" | "W04" | "W11";
    const steelGrade = String(formData.get("steelGrade") ?? "").trim();
    if (!steelGrade) throw new Error("Вкажіть марку сталі");
    if (!["W01", "W02", "W03", "W04", "W11"].includes(groupCode)) throw new Error("Некоректна група");
    await db.insert(sampleMaterials).values({ groupCode, steelGrade, isActive: true });
    revalidatePath("/attestation/settings");
  }

  async function archiveSample(formData: FormData) {
    "use server";
    await requireRole("MANAGER");
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    await db.update(sampleMaterials).set({ isActive: false }).where(eq(sampleMaterials.id, id));
    revalidatePath("/attestation/settings");
  }

  async function addConsumable(formData: FormData) {
    "use server";
    await requireRole("MANAGER");
    const materialGrade = String(formData.get("materialGrade") ?? "").trim();
    const coatingType = String(formData.get("coatingType") ?? "").trim() as "A" | "RA" | "R" | "RB" | "RC" | "B" | "C" | "S";
    if (!materialGrade) throw new Error("Вкажіть марку матеріалу");
    const allowed = ["A", "RA", "R", "RB", "RC", "B", "C", "S"] as const;
    if (!allowed.includes(coatingType)) throw new Error("Некоректний тип покриття");
    await db.insert(weldingConsumables).values({ materialGrade, coatingType, isActive: true });
    revalidatePath("/attestation/settings");
  }

  async function archiveConsumable(formData: FormData) {
    "use server";
    await requireRole("MANAGER");
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    await db.update(weldingConsumables).set({ isActive: false }).where(eq(weldingConsumables.id, id));
    revalidatePath("/attestation/settings");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">Налаштування атестації</h1>
        <p className="text-sm text-muted-foreground">
          Члени комісії та шаблони документів для генерації .docx. Шаблони зберігаються у Vercel Blob; потрібен{" "}
          <code className="rounded bg-muted px-1">VERCEL_BLOB_READ_WRITE_TOKEN</code> у змінних середовища.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Члени комісії</h2>
        <GuardedForm action={addCommissionMemberAction} className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3">
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Нормативні документи</h2>
        <GuardedForm action={addRegulatory} className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3">
          <div className="text-sm font-medium">Додати НД</div>
          <input name="code" required placeholder="Шифр (унікальний)" className="h-10 rounded-md border border-border px-3" />
          <input name="name" required placeholder="Повна назва" className="h-10 rounded-md border border-border px-3" />
          <textarea name="admissionText" required placeholder="Текст допуску" rows={3} className="rounded-md border border-border px-3 py-2" />
          <button type="submit" className="crm-btn-primary w-fit">
            Додати
          </button>
        </GuardedForm>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-2 font-medium">Шифр</th>
                <th className="p-2 font-medium">Назва</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {regulatory.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="p-2">{r.code}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">
                    {r.isActive ? (
                      <GuardedForm action={archiveRegulatory} className="inline">
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-sm text-destructive underline">
                          Архівувати
                        </button>
                      </GuardedForm>
                    ) : (
                      <span className="text-muted-foreground">архів</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Матеріали зразків</h2>
        <GuardedForm action={addSampleMaterial} className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3">
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
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-2 font-medium">Група</th>
                <th className="p-2 font-medium">Марка</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="p-2">{s.groupCode}</td>
                  <td className="p-2">{s.steelGrade}</td>
                  <td className="p-2 text-right">
                    {s.isActive ? (
                      <GuardedForm action={archiveSample} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-sm text-destructive underline">
                          Архівувати
                        </button>
                      </GuardedForm>
                    ) : (
                      <span className="text-muted-foreground">архів</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Зварювальні матеріали</h2>
        <GuardedForm action={addConsumable} className="flex max-w-xl flex-col gap-2 rounded-md border border-border p-3">
          <div className="text-sm font-medium">Додати матеріал</div>
          <input name="materialGrade" required placeholder="Марка (напр. УОНИ 13/45)" className="h-10 rounded-md border border-border px-3" />
          <select name="coatingType" required className="h-10 rounded-md border border-border px-3" defaultValue="B">
            {(["A", "RA", "R", "RB", "RC", "B", "C", "S"] as const).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="crm-btn-primary w-fit">
            Додати
          </button>
        </GuardedForm>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-2 font-medium">Марка</th>
                <th className="p-2 font-medium">Покриття</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {consumablesList.map((c) => (
                <tr key={c.id} className="border-b border-border">
                  <td className="p-2">{c.materialGrade}</td>
                  <td className="p-2">{c.coatingType}</td>
                  <td className="p-2 text-right">
                    {c.isActive ? (
                      <GuardedForm action={archiveConsumable} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-sm text-destructive underline">
                          Архівувати
                        </button>
                      </GuardedForm>
                    ) : (
                      <span className="text-muted-foreground">архів</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Шаблони документів</h2>
        <p className="text-sm text-muted-foreground">
          Завантажте три типи шаблонів (.docx) та активуйте по одному на тип. Генерація документів використовує лише завантажені
          шаблони з Blob.
        </p>
        <TemplateUploadForm />
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-2 font-medium">Тип</th>
                <th className="p-2 font-medium">Назва</th>
                <th className="p-2 font-medium">Активний</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={4}>
                    Шаблонів ще немає. Завантажте .docx вище.
                  </td>
                </tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="p-2">{t.templateType}</td>
                    <td className="p-2 align-top">
                      <TemplateRowActions templateId={t.id} initialName={t.name} isActive={t.isActive} />
                    </td>
                    <td className="p-2">{t.isActive ? "так" : "ні"}</td>
                    <td className="p-2 text-right">
                      {!t.isActive ? <TemplateActivateButton templateId={t.id} /> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
