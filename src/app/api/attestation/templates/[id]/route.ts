import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documentTemplates } from "@/db/schema/attestation";
import { readTemplateBuffer } from "@/lib/attestation/template-buffer";
import { blobReadWriteToken, vercelPrivateBlobUrlFromStorageKey } from "@/lib/blob-token";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

function attachmentFilename(baseName: string): string {
  const trimmed = baseName.trim() || "template";
  const withoutExt = trimmed.replace(/\.docx$/i, "");
  const safe = `${withoutExt}.docx`;
  const ascii = safe.replace(/[^\x20-\x7E]/g, "_") || "template.docx";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const row = await db.query.documentTemplates.findFirst({
    where: eq(documentTemplates.id, id),
  });
  if (!row) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const buffer = await readTemplateBuffer(row.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": attachmentFilename(row.name),
      },
    });
  } catch {
    return Response.json({ error: "TEMPLATE_UNAVAILABLE" }, { status: 503 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "MISSING_NAME" }, { status: 400 });
  }

  const [updated] = await db
    .update(documentTemplates)
    .set({ name })
    .where(eq(documentTemplates.id, id))
    .returning();
  if (!updated) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return Response.json({ data: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;

  const row = await db.query.documentTemplates.findFirst({
    where: eq(documentTemplates.id, id),
  });
  if (!row) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (row.isActive) {
    return Response.json({ error: "CANNOT_DELETE_ACTIVE_TEMPLATE" }, { status: 400 });
  }

  const token = blobReadWriteToken();
  if (!token) {
    return Response.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const url = vercelPrivateBlobUrlFromStorageKey(row.storageKey, token);
    await del(url, { token });
  } catch {
    // Continue removing DB row if blob already missing.
  }

  await db.delete(documentTemplates).where(eq(documentTemplates.id, id));
  return Response.json({ ok: true });
}
