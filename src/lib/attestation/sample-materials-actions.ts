"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { sampleMaterials } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";

const GROUPS = ["W01", "W02", "W03", "W04", "W11"] as const;

function revalidateSampleMaterialRelated() {
  revalidatePath("/attestation/settings");
  revalidatePath("/attestation/welders");
}

export async function addSampleMaterialAndReturnId(formData: FormData): Promise<string> {
  await requireRole("MANAGER");
  const groupCode = String(formData.get("groupCode") ?? "").trim() as (typeof GROUPS)[number];
  const steelGrade = String(formData.get("steelGrade") ?? "").trim();
  if (!steelGrade) throw new Error("Вкажіть марку сталі");
  if (!GROUPS.includes(groupCode)) throw new Error("Некоректна група");
  const [created] = await db
    .insert(sampleMaterials)
    .values({ groupCode, steelGrade, isActive: true })
    .returning({ id: sampleMaterials.id });
  if (!created) throw new Error("CREATE_FAILED");
  revalidateSampleMaterialRelated();
  return created.id;
}

export async function addSampleMaterialAction(formData: FormData): Promise<void> {
  await addSampleMaterialAndReturnId(formData);
}

export async function updateSampleMaterialAction(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "").trim();
  const groupCode = String(formData.get("groupCode") ?? "").trim() as (typeof GROUPS)[number];
  const steelGrade = String(formData.get("steelGrade") ?? "").trim();
  if (!id) throw new Error("Не вказано запис");
  if (!steelGrade) throw new Error("Вкажіть марку сталі");
  if (!GROUPS.includes(groupCode)) throw new Error("Некоректна група");

  const [clash] = await db
    .select({ id: sampleMaterials.id })
    .from(sampleMaterials)
    .where(and(eq(sampleMaterials.groupCode, groupCode), eq(sampleMaterials.steelGrade, steelGrade), ne(sampleMaterials.id, id)))
    .limit(1);
  if (clash) throw new Error("Така комбінація групи та марки вже є");

  await db.update(sampleMaterials).set({ groupCode, steelGrade }).where(eq(sampleMaterials.id, id));
  revalidateSampleMaterialRelated();
}

export async function archiveSampleMaterialAction(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await db.update(sampleMaterials).set({ isActive: false }).where(eq(sampleMaterials.id, id));
  revalidateSampleMaterialRelated();
}

export async function restoreSampleMaterialAction(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Не вказано запис");
  await db.update(sampleMaterials).set({ isActive: true }).where(eq(sampleMaterials.id, id));
  revalidateSampleMaterialRelated();
}
