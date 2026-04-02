"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { certificationGroups, welderCertifications } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";

export async function deleteWelderAction(formData: FormData) {
  await requireRole("MANAGER");
  const wid = String(formData.get("welderId") ?? "").trim();
  if (!wid) throw new Error("MISSING_ID");
  const current = await db.query.welderCertifications.findFirst({
    where: eq(welderCertifications.id, wid),
  });
  if (!current) return;
  const g = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, current.groupId),
  });
  if (g?.status === "completed" || g?.status === "archived") {
    throw new Error("Видалення заборонено: група завершена або в архіві");
  }

  const gid = current.groupId;
  await db.delete(welderCertifications).where(eq(welderCertifications.id, wid));

  revalidatePath("/attestation/welders");
  revalidatePath("/attestation/groups");
  redirect("/attestation/welders");
}
