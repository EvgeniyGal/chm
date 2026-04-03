"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { weldingConsumables } from "@/db/schema/attestation";
import { requireApprovedUser } from "@/lib/authz";
import { WELDING_COATING_TYPES, type WeldingCoatingType } from "@/lib/attestation/welding-consumable-coating-options";

const COATING = WELDING_COATING_TYPES;

function revalidateWeldingConsumableRelated() {
  revalidatePath("/attestation/settings");
  revalidatePath("/attestation/welders");
}

export async function addWeldingConsumableAndReturnId(formData: FormData): Promise<string> {
  await requireApprovedUser();
  const materialGrade = String(formData.get("materialGrade") ?? "").trim();
  const coatingType = String(formData.get("coatingType") ?? "").trim() as WeldingCoatingType;
  if (!materialGrade) throw new Error("Вкажіть марку матеріалу");
  if (!COATING.includes(coatingType)) throw new Error("Некоректний тип покриття");
  const [created] = await db
    .insert(weldingConsumables)
    .values({ materialGrade, coatingType, isActive: true })
    .returning({ id: weldingConsumables.id });
  if (!created) throw new Error("CREATE_FAILED");
  revalidateWeldingConsumableRelated();
  return created.id;
}

export async function addWeldingConsumableAction(formData: FormData): Promise<void> {
  await addWeldingConsumableAndReturnId(formData);
}

export async function updateWeldingConsumableAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  const materialGrade = String(formData.get("materialGrade") ?? "").trim();
  const coatingType = String(formData.get("coatingType") ?? "").trim() as WeldingCoatingType;
  if (!id) throw new Error("Не вказано запис");
  if (!materialGrade) throw new Error("Вкажіть марку матеріалу");
  if (!COATING.includes(coatingType)) throw new Error("Некоректний тип покриття");

  const [clash] = await db
    .select({ id: weldingConsumables.id })
    .from(weldingConsumables)
    .where(
      and(
        eq(weldingConsumables.materialGrade, materialGrade),
        eq(weldingConsumables.coatingType, coatingType),
        ne(weldingConsumables.id, id),
      ),
    )
    .limit(1);
  if (clash) throw new Error("Така комбінація марки та покриття вже є");

  await db.update(weldingConsumables).set({ materialGrade, coatingType }).where(eq(weldingConsumables.id, id));
  revalidateWeldingConsumableRelated();
}

export async function archiveWeldingConsumableAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await db.update(weldingConsumables).set({ isActive: false }).where(eq(weldingConsumables.id, id));
  revalidateWeldingConsumableRelated();
}

export async function restoreWeldingConsumableAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Не вказано запис");
  await db.update(weldingConsumables).set({ isActive: true }).where(eq(weldingConsumables.id, id));
  revalidateWeldingConsumableRelated();
}
