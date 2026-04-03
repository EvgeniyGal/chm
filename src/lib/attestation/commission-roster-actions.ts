"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { commissionMembers } from "@/db/schema/attestation";
import { requireApprovedUser } from "@/lib/authz";

function revalidateCommissionRoster() {
  revalidatePath("/attestation/settings");
  revalidatePath("/attestation/groups", "layout");
}

export async function addCommissionMemberAction(formData: FormData) {
  await requireApprovedUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const role = String(formData.get("role") ?? "member");
  if (!fullName) throw new Error("Вкажіть ПІБ");
  if (role !== "head" && role !== "member") throw new Error("Некоректна роль");

  await db.insert(commissionMembers).values({
    fullName,
    position: position || null,
    role,
    isActive: true,
  });
  revalidateCommissionRoster();
}

export async function updateCommissionMemberAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const role = String(formData.get("role") ?? "member");
  if (!id) throw new Error("Не вказано запис");
  if (!fullName) throw new Error("Вкажіть ПІБ");
  if (role !== "head" && role !== "member") throw new Error("Некоректна роль");

  await db
    .update(commissionMembers)
    .set({
      fullName,
      position: position || null,
      role,
    })
    .where(eq(commissionMembers.id, id));
  revalidateCommissionRoster();
}

export async function archiveCommissionMemberAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await db.update(commissionMembers).set({ isActive: false }).where(eq(commissionMembers.id, id));
  revalidateCommissionRoster();
}

export async function restoreCommissionMemberAction(formData: FormData) {
  await requireApprovedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Не вказано запис");
  await db.update(commissionMembers).set({ isActive: true }).where(eq(commissionMembers.id, id));
  revalidateCommissionRoster();
}
