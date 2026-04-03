import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { certificationGroups, commissionMembers, welderCertifications } from "@/db/schema/attestation";
import { requireApprovedUser } from "@/lib/authz";
import { buildReportDocxPayload, buildReportItemRow } from "@/lib/attestation/docx-payload";
import { attestationDocxOrPdfResponse } from "@/lib/attestation/document-download";
import { wantsPdfFormat } from "@/lib/attestation/output-format";
import { loadGroupCommissionMembersForDocx, loadWelderDocContext } from "@/lib/attestation/load-context";
import { loadActiveTemplateBuffer } from "@/lib/attestation/resolve-template";
import { renderDocxTemplate } from "@/lib/attestation/render-docx";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireApprovedUser();
  const url = new URL(req.url);
  const groupId = url.searchParams.get("groupId")?.trim();
  if (!groupId) {
    return Response.json({ error: "MISSING_GROUP_ID" }, { status: 400 });
  }

  const group = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, groupId),
  });
  if (!group) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const head = await db.query.commissionMembers.findFirst({
    where: eq(commissionMembers.id, group.headId),
  });
  if (!head) {
    return Response.json({ error: "HEAD_NOT_FOUND" }, { status: 404 });
  }

  const welders = await db
    .select()
    .from(welderCertifications)
    .where(eq(welderCertifications.groupId, groupId))
    .orderBy(asc(welderCertifications.orderInGroup));

  const { namesOnly: memberNamesOnly, displayLines: membersWithPositionLines } =
    await loadGroupCommissionMembersForDocx(groupId);

  const items: Record<string, unknown>[] = [];
  for (const w of welders) {
    const ctx = await loadWelderDocContext(w.id);
    if (ctx) items.push(buildReportItemRow(ctx));
  }

  try {
    const { buffer } = await loadActiveTemplateBuffer("report_protocol");
    const data = buildReportDocxPayload(group, head, memberNamesOnly, membersWithPositionLines, items);
    const out = renderDocxTemplate(buffer, data);
    const filename = `report-${group.groupNumber}.docx`;
    return attestationDocxOrPdfResponse(Buffer.from(out), filename, wantsPdfFormat(url.searchParams));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NO_ACTIVE_ATTESTATION_TEMPLATE" || msg.includes("TEMPLATE_")) {
      return Response.json(
        {
          error: "NO_ACTIVE_TEMPLATE",
          hint: "Завантажте та активуйте звітний шаблон в Атестація → Налаштування.",
        },
        { status: 409 },
      );
    }
    console.error("[attestation report doc]", e);
    return Response.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }
}
