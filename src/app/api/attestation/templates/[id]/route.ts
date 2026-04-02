import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documentTemplates } from "@/db/schema/attestation";
import { blobReadWriteToken, vercelPrivateBlobUrlFromStorageKey } from "@/lib/blob-token";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

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
