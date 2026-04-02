import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { GuardedForm } from "@/components/forms/GuardedForm";
import { db } from "@/db";
import { certificationGroups, welderCertifications } from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";
import { computeCertificateNumber } from "@/lib/attestation/compute";
import { resequenceWelderOrdersInGroup } from "@/lib/attestation/resequence-welders";

export default async function WelderCertificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const w = await db.query.welderCertifications.findFirst({
    where: eq(welderCertifications.id, id),
  });
  if (!w) notFound();

  const group = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, w.groupId),
  });
  if (!group) notFound();

  const protocolDate = new Date(group.protocolDate);
  const certNum = computeCertificateNumber(group.groupNumber, w.orderInGroup, protocolDate);

  async function deleteWelder(formData: FormData) {
    "use server";
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
    await resequenceWelderOrdersInGroup(gid);

    redirect(`/attestation/groups/${gid}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="text-sm text-muted-foreground underline" href="/attestation/welders">
          ← До списку зварників
        </Link>
        <h1 className="page-title mt-2">
          {w.lastName} {w.firstName} {w.middleName ?? ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Група №{group.groupNumber}, № у групі {w.orderInGroup}, посвідчення {certNum}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a className="crm-btn-outline" href={`/api/attestation/documents/protocol?welderId=${id}`}>
          Протокол (.docx)
        </a>
        <a className="crm-btn-outline" href={`/api/attestation/documents/certificate?welderId=${id}`}>
          Посвідчення (.docx)
        </a>
        <a className="crm-btn-outline" href={`/api/attestation/documents/report?groupId=${group.id}`}>
          Звіт по групі (.docx)
        </a>
        <Link className="crm-btn-primary" href={`/attestation/groups/${group.id}`}>
          Картка групи
        </Link>
        {group.status !== "completed" && group.status !== "archived" ? (
          <Link className="crm-btn-outline" href={`/attestation/welders/${id}/edit`}>
            Редагувати
          </Link>
        ) : null}
      </div>

      {group.status !== "completed" ? (
        <GuardedForm
          action={deleteWelder}
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
        >
          <input type="hidden" name="welderId" value={id} />
          <p className="mb-2 text-sm text-muted-foreground">
            Видалити запис атестації та перенумерувати послідовність у групі.
          </p>
          <button type="submit" className="rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive">
            Видалити запис
          </button>
        </GuardedForm>
      ) : null}
    </div>
  );
}
