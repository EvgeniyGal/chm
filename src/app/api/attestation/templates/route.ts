import { put } from "@vercel/blob";

import { db } from "@/db";
import { documentTemplates } from "@/db/schema/attestation";
import type { AttestationTemplateType } from "@/db/schema/attestation";
import { blobReadWriteToken } from "@/lib/blob-token";
import { requireApprovedUser } from "@/lib/authz";

export const runtime = "nodejs";

const TYPES: AttestationTemplateType[] = ["protocol", "certificate", "report_protocol"];

export async function POST(req: Request) {
  const { userId } = await requireApprovedUser();
  const token = blobReadWriteToken();
  if (!token) {
    return Response.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const name = String(form.get("name") ?? "").trim();
  const templateTypeRaw = String(form.get("templateType") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "MISSING_FILE" }, { status: 400 });
  }
  if (!name) {
    return Response.json({ error: "MISSING_NAME" }, { status: 400 });
  }
  const templateType = TYPES.find((t) => t === templateTypeRaw);
  if (!templateType) {
    return Response.json({ error: "INVALID_TEMPLATE_TYPE" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 100) {
    return Response.json({ error: "FILE_TOO_SMALL" }, { status: 400 });
  }

  const pathname = `attestation/templates/${templateType}-${Date.now()}.docx`;
  const blob = await put(pathname, buf, {
    access: "private",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    addRandomSuffix: false,
    token,
  });

  const [row] = await db
    .insert(documentTemplates)
    .values({
      templateType,
      name,
      storageKey: blob.pathname,
      isActive: false,
      uploadedBy: userId,
    })
    .returning();

  return Response.json({ data: row });
}
