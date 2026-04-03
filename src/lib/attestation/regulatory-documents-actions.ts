"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { regulatoryDocuments } from "@/db/schema/attestation";
import { requireApprovedUser } from "@/lib/authz";

function revalidateSettings() {
  revalidatePath("/attestation/settings");
}

export async function addRegulatoryDocumentAction(formData: FormData) {
  await requireApprovedUser();
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const admissionText = String(formData.get("admissionText") ?? "").trim();
  if (!code || !name || !admissionText) throw new Error("Заповніть усі поля НД");
  await db.insert(regulatoryDocuments).values({ code, name, admissionText, isActive: true });
  revalidateSettings();
}

export async function updateRegulatoryDocumentAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const admissionText = String(formData.get("admissionText") ?? "").trim();
  if (!id) throw new Error("Не вказано запис");
  if (!code || !name || !admissionText) throw new Error("Заповніть усі поля НД");

  const [clash] = await db
    .select({ id: regulatoryDocuments.id })
    .from(regulatoryDocuments)
    .where(and(eq(regulatoryDocuments.code, code), ne(regulatoryDocuments.id, id)))
    .limit(1);
  if (clash) throw new Error("Шифр з таким значенням уже існує");

  await db.update(regulatoryDocuments).set({ code, name, admissionText }).where(eq(regulatoryDocuments.id, id));
  revalidateSettings();
}

export async function archiveRegulatoryDocumentAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await db.update(regulatoryDocuments).set({ isActive: false }).where(eq(regulatoryDocuments.id, id));
  revalidateSettings();
}

export async function restoreRegulatoryDocumentAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Не вказано запис");
  await db.update(regulatoryDocuments).set({ isActive: true }).where(eq(regulatoryDocuments.id, id));
  revalidateSettings();
}
