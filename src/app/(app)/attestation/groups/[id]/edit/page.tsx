import { ArrowLeft, List, Save } from "lucide-react";
import Link from "next/link";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { ArchiveAttestationGroupButton } from "@/components/attestation/ArchiveAttestationGroupButton";
import { CommissionGroupPickers } from "@/components/attestation/CommissionGroupPickers";
import { CertificateIssueLocationField } from "@/components/attestation/CertificateIssueLocationField";
import { GuardedForm } from "@/components/forms/GuardedForm";
import { db } from "@/db";
import {
  certificationGroupMembers,
  certificationGroups,
  commissionMembers,
} from "@/db/schema/attestation";
import { requireRole } from "@/lib/authz";
import { certificationGroupStatusLabelUa } from "@/lib/attestation/labels-uk";
import { certificationGroupUpdateSchema } from "@/lib/attestation/validation";
import { DROPDOWN_SCOPE, getDropdownOptions, saveDropdownOption } from "@/lib/dropdown-options";

export default async function EditAttestationGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const group = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, id),
  });
  if (!group) notFound();
  if (group.status === "completed" || group.status === "archived") {
    redirect(`/attestation/groups/${id}`);
  }

  const commissionAllRows = await db.select().from(commissionMembers).orderBy(desc(commissionMembers.createdAt));

  const commissionMemberOptions = commissionAllRows
    .filter((m) => m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "uk"))
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      position: m.position,
      role: m.role,
    }));

  const commissionRosterRows = commissionAllRows.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    position: m.position,
    role: m.role,
    isActive: m.isActive,
  }));

  const memberRows = await db
    .select()
    .from(certificationGroupMembers)
    .where(eq(certificationGroupMembers.groupId, id));
  const selectedMemberIds = new Set(memberRows.map((r) => r.memberId));

  const certificateIssueLocationOptions = await getDropdownOptions(DROPDOWN_SCOPE.CERTIFICATE_ISSUE_LOCATION);

  async function update(formData: FormData) {
    "use server";
    await requireRole("MANAGER");

    const memberIds = formData
      .getAll("memberId")
      .map((v) => String(v).trim())
      .filter(Boolean);

    const raw = {
      groupNumber: String(formData.get("groupNumber") ?? ""),
      protocolDate: String(formData.get("protocolDate") ?? ""),
      inspectionDate: String(formData.get("inspectionDate") ?? ""),
      certificateIssueDate: String(formData.get("certificateIssueDate") ?? ""),
      certificateIssueLocation: String(formData.get("certificateIssueLocation") ?? ""),
      headId: String(formData.get("headId") ?? ""),
      memberIds,
    };

    const parsed = certificationGroupUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR");
    }

    const current = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, id),
    });
    if (!current) throw new Error("NOT_FOUND");
    if (current.status === "completed" || current.status === "archived") {
      throw new Error("Редагування заборонено для завершеної або архівної групи");
    }

    const pd = new Date(parsed.data.protocolDate);
    const ins = new Date(parsed.data.inspectionDate);
    if (ins > pd) {
      throw new Error("Дата контролю не може бути пізніше дати протоколу");
    }

    const uniqueMembers = [...new Set(parsed.data.memberIds)];
    if (uniqueMembers.includes(parsed.data.headId)) {
      throw new Error("Голова не повинна дублюватися у списку членів");
    }

    const headRow = await db.query.commissionMembers.findFirst({
      where: and(eq(commissionMembers.id, parsed.data.headId), eq(commissionMembers.role, "head")),
    });
    if (!headRow?.isActive) {
      throw new Error(
        "Оберіть голову комісії з довідника: лише активні особи з роллю «Голова комісії».",
      );
    }

    if (uniqueMembers.length > 0) {
      const memberRows = await db
        .select({ id: commissionMembers.id, role: commissionMembers.role })
        .from(commissionMembers)
        .where(inArray(commissionMembers.id, uniqueMembers));
      if (memberRows.length !== uniqueMembers.length) {
        throw new Error("Невірний ідентифікатор члена комісії");
      }
      if (memberRows.some((r) => r.role !== "member")) {
        throw new Error(
          "У списку членів можуть бути лише особи з роллю «член комісії» у довіднику. Голову вкажіть полем «Голова комісії».",
        );
      }
    }

    const gn = parsed.data.groupNumber.trim();
    const numberTaken = await db.query.certificationGroups.findFirst({
      where: and(eq(certificationGroups.groupNumber, gn), ne(certificationGroups.id, id)),
    });
    if (numberTaken) {
      throw new Error("Номер групи вже зайнятий");
    }

    await db
      .update(certificationGroups)
      .set({
        groupNumber: gn,
        protocolDate: parsed.data.protocolDate,
        inspectionDate: parsed.data.inspectionDate,
        certificateIssueDate: parsed.data.certificateIssueDate,
        certificateIssueLocation: parsed.data.certificateIssueLocation.trim(),
        headId: parsed.data.headId,
        updatedAt: new Date(),
      })
      .where(eq(certificationGroups.id, id));

    await db.delete(certificationGroupMembers).where(eq(certificationGroupMembers.groupId, id));
    if (uniqueMembers.length > 0) {
      await db.insert(certificationGroupMembers).values(
        uniqueMembers.map((memberId) => ({
          groupId: id,
          memberId,
        })),
      );
    }

    await saveDropdownOption(DROPDOWN_SCOPE.CERTIFICATE_ISSUE_LOCATION, parsed.data.certificateIssueLocation.trim());

    redirect(`/attestation/groups/${id}`);
  }

  async function markActive() {
    "use server";
    await requireRole("MANAGER");
    const g = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, id),
    });
    if (!g) throw new Error("NOT_FOUND");
    if (g.status !== "draft") return;
    await db
      .update(certificationGroups)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(certificationGroups.id, id));
    redirect(`/attestation/groups/${id}`);
  }

  async function revertToDraft() {
    "use server";
    await requireRole("MANAGER");
    const g = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, id),
    });
    if (!g) throw new Error("NOT_FOUND");
    if (g.status !== "active") return;
    await db
      .update(certificationGroups)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(certificationGroups.id, id));
    redirect(`/attestation/groups/${id}`);
  }

  async function markCompleted() {
    "use server";
    await requireRole("MANAGER");
    const g = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, id),
    });
    if (!g) throw new Error("NOT_FOUND");
    if (g.status === "completed" || g.status === "archived") return;
    await db
      .update(certificationGroups)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(certificationGroups.id, id));
    redirect(`/attestation/groups/${id}`);
  }

  async function archiveGroup() {
    "use server";
    await requireRole("MANAGER");
    const g = await db.query.certificationGroups.findFirst({
      where: eq(certificationGroups.id, id),
    });
    if (!g) throw new Error("NOT_FOUND");
    if (g.status === "archived") return;
    await db
      .update(certificationGroups)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(certificationGroups.id, id));
    redirect("/attestation/groups");
  }

  const iso = (d: string | Date) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

  const inputClass =
    "h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Редагування групи №{group.groupNumber}</h1>
      </div>

      <GuardedForm action={update} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Номер групи (номер протоколу)</span>
            <input name="groupNumber" required defaultValue={group.groupNumber} className={inputClass} autoComplete="off" />
          </label>
          <CertificateIssueLocationField
            key={group.id}
            defaultValue={group.certificateIssueLocation}
            optionsFromBackend={certificateIssueLocationOptions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Дата протоколу (засідання комісії)</span>
            <input name="protocolDate" type="date" required defaultValue={iso(group.protocolDate)} className={inputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Дата контролю якості зразків</span>
            <input name="inspectionDate" type="date" required defaultValue={iso(group.inspectionDate)} className={inputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Дата видачі посвідчень</span>
            <input
              name="certificateIssueDate"
              type="date"
              required
              defaultValue={iso(group.certificateIssueDate)}
              className={inputClass}
            />
          </label>
        </div>

        <CommissionGroupPickers
          key={group.id}
          members={commissionMemberOptions}
          rosterRows={commissionRosterRows}
          initialHeadId={group.headId}
          initialMemberIds={Array.from(selectedMemberIds)}
        />

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="submit"
            className="crm-btn-primary inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Save className="size-4" aria-hidden="true" />
            Зберегти зміни
          </button>
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm sm:w-auto"
            href={`/attestation/groups/${id}`}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            До картки групи
          </Link>
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm sm:w-auto"
            href="/attestation/groups"
          >
            <List className="size-4 shrink-0" aria-hidden />
            До списку груп
          </Link>
        </div>
      </GuardedForm>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <div className="font-semibold text-foreground">Статус групи</div>
        <p className="text-muted-foreground">
          Поточний статус: <strong>{certificationGroupStatusLabelUa(group.status)}</strong>. Після завершення або архівації редагування групи та зварників буде заблоковано.
        </p>
        <div className="flex flex-wrap gap-2">
          {group.status === "draft" ? (
            <GuardedForm action={markActive} className="inline">
              <button type="submit" className="crm-btn-outline">
                Позначити як активну
              </button>
            </GuardedForm>
          ) : null}
          {group.status === "active" ? (
            <GuardedForm action={revertToDraft} className="inline">
              <button type="submit" className="crm-btn-outline">
                Повернути до чернетки
              </button>
            </GuardedForm>
          ) : null}
          <GuardedForm action={markCompleted} className="inline">
            <button type="submit" className="crm-btn-outline">
              Позначити як завершену
            </button>
          </GuardedForm>
          <ArchiveAttestationGroupButton archiveGroup={archiveGroup} groupNumber={group.groupNumber} />
        </div>
      </div>
    </div>
  );
}
