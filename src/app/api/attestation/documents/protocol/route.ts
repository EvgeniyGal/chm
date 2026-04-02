import { requireRole } from "@/lib/authz";
import { buildCertificateDocxPayload } from "@/lib/attestation/docx-payload";
import { attestationDocxOrPdfResponse } from "@/lib/attestation/document-download";
import { wantsPdfFormat } from "@/lib/attestation/output-format";
import { loadWelderDocContext } from "@/lib/attestation/load-context";
import { computeCertificateNumber } from "@/lib/attestation/compute";
import { loadActiveTemplateBuffer } from "@/lib/attestation/resolve-template";
import { renderDocxTemplate } from "@/lib/attestation/render-docx";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("MANAGER");
  const url = new URL(req.url);
  const welderId = url.searchParams.get("welderId")?.trim();
  if (!welderId) {
    return Response.json({ error: "MISSING_WELDER_ID" }, { status: 400 });
  }

  const ctx = await loadWelderDocContext(welderId);
  if (!ctx) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const { buffer } = await loadActiveTemplateBuffer("protocol");
    const data = buildCertificateDocxPayload(ctx);
    const out = renderDocxTemplate(buffer, data);
    const protocolDate = new Date(ctx.group.protocolDate);
    const certNum = computeCertificateNumber(ctx.group.groupNumber, ctx.welder.orderInGroup, protocolDate);
    const filename = `protocol-${certNum}.docx`;
    return attestationDocxOrPdfResponse(Buffer.from(out), filename, wantsPdfFormat(url.searchParams));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NO_ACTIVE_ATTESTATION_TEMPLATE" || msg.includes("TEMPLATE_")) {
      return Response.json(
        {
          error: "NO_ACTIVE_TEMPLATE",
          hint: "Завантажте та активуйте шаблон протоколу в Атестація → Налаштування.",
        },
        { status: 409 },
      );
    }
    console.error("[attestation protocol doc]", e);
    return Response.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }
}
