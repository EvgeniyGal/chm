import { List, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  certificationGroupMembers,
  certificationGroups,
  commissionMembers,
} from "@/db/schema/attestation";
import { CommissionGroupPickers } from "@/components/attestation/CommissionGroupPickers";
import { CertificateIssueLocationField } from "@/components/attestation/CertificateIssueLocationField";
import { GuardedForm } from "@/components/forms/GuardedForm";
import { requireApprovedUser } from "@/lib/authz";
import { certificationGroupCreateSchema } from "@/lib/attestation/validation";
import { DROPDOWN_SCOPE, getDropdownOptions, saveDropdownOption } from "@/lib/dropdown-options";

export default async function NewAttestationGroupPage() {
  await requireApprovedUser();

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

  const certificateIssueLocationOptions = await getDropdownOptions(DROPDOWN_SCOPE.CERTIFICATE_ISSUE_LOCATION);

  async function create(formData: FormData) {
    "use server";
    await requireApprovedUser();

    const skipRedirect = String(formData.get("_skipRedirect") ?? "") === "1";

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

    const parsed = certificationGroupCreateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR");
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

    const [group] = await db
      .insert(certificationGroups)
      .values({
        groupNumber: parsed.data.groupNumber.trim(),
        protocolDate: parsed.data.protocolDate,
        inspectionDate: parsed.data.inspectionDate,
        certificateIssueDate: parsed.data.certificateIssueDate,
        certificateIssueLocation: parsed.data.certificateIssueLocation.trim(),
        headId: parsed.data.headId,
        status: "active",
      })
      .returning();

    if (!group) throw new Error("CREATE_FAILED");

    if (uniqueMembers.length > 0) {
      await db.insert(certificationGroupMembers).values(
        uniqueMembers.map((memberId) => ({
          groupId: group.id,
          memberId,
        })),
      );
    }

    await saveDropdownOption(DROPDOWN_SCOPE.CERTIFICATE_ISSUE_LOCATION, parsed.data.certificateIssueLocation.trim());

    if (skipRedirect) {
      return;
    }
    redirect("/attestation/groups");
  }

  const inputClass =
    "h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h1 className="page-title">Нова група атестації</h1>
      </div>

      <GuardedForm
        action={create}
        className="flex min-w-0 flex-col gap-4 rounded-xl border bg-white p-4"
        enableSaveAndProceed
        successMessage="Групу створено."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Номер групи (номер протоколу)</span>
            <input name="groupNumber" required className={inputClass} autoComplete="off" />
          </label>
          <CertificateIssueLocationField optionsFromBackend={certificateIssueLocationOptions} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Дата протоколу (засідання комісії)</span>
            <input name="protocolDate" type="date" required className={inputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Дата контролю якості зразків</span>
            <input name="inspectionDate" type="date" required className={inputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Дата видачі посвідчень</span>
            <input name="certificateIssueDate" type="date" required className={inputClass} />
          </label>
        </div>

        <CommissionGroupPickers
          members={commissionMemberOptions}
          rosterRows={commissionRosterRows}
          variant="create"
        />

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="submit"
            className="crm-btn-primary inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Save className="size-4" aria-hidden="true" />
            Створити групу
          </button>
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm sm:w-auto"
            href="/attestation/groups"
          >
            <List className="size-4 shrink-0" aria-hidden />
            До списку груп
          </Link>
        </div>
      </GuardedForm>
    </div>
  );
}
