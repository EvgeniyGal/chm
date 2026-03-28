import { BlobNotFoundError, del, get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { blobReadWriteToken, vercelPrivateBlobUrlFromStorageKey } from "@/lib/blob-token";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

function safeDownloadFilename(name: string | null, contentType: string): string {
  const base = (name?.replace(/[/\\?%*:|"<>]/g, "_") ?? "scan").slice(0, 120) || "scan";
  if (/\.[a-z0-9]{2,4}$/i.test(base)) return base;
  if (contentType === "application/pdf") return `${base}.pdf`;
  if (contentType === "image/webp") return `${base}.webp`;
  return base;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/signed/[documentId]">) {
  await requireRole("MANAGER");
  const token = blobReadWriteToken();
  if (!token) {
    return Response.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 503 });
  }

  const { documentId } = await ctx.params;
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.kind, "SIGNED_SCAN")),
  });
  if (!doc) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const result = await get(doc.storageKey, { access: "private", token });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return Response.json({ error: "BLOB_UNAVAILABLE" }, { status: 404 });
  }

  const filename = safeDownloadFilename(doc.originalFilename, doc.contentType);
  return new Response(result.stream, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/uploads/signed/[documentId]">) {
  const { userId } = await requireRole("MANAGER");
  const token = blobReadWriteToken();
  if (!token) {
    return Response.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 503 });
  }

  const { documentId } = await ctx.params;
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.kind, "SIGNED_SCAN")),
  });
  if (!doc) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  let blobUrl: string;
  try {
    blobUrl = vercelPrivateBlobUrlFromStorageKey(doc.storageKey, token);
  } catch {
    return Response.json({ error: "BLOB_TOKEN_INVALID" }, { status: 503 });
  }

  try {
    await del(blobUrl, { token });
  } catch (e) {
    if (e instanceof BlobNotFoundError) {
      // Already removed from blob store — continue to drop DB row.
    } else {
      console.error("[signed upload DELETE] blob del failed", e);
      return Response.json({ error: "BLOB_DELETE_FAILED" }, { status: 502 });
    }
  }

  await db.delete(documents).where(eq(documents.id, documentId));

  await writeAuditEvent({
    entityType: doc.entityType === "ACCEPTANCE_ACT" ? "ACCEPTANCE_ACT" : (doc.entityType as any),
    entityId: doc.entityId,
    action: "UPDATE",
    actorUserId: userId,
    diff: { documentId, kind: "SIGNED_SCAN_DELETED", storageKey: doc.storageKey },
  });

  return Response.json({ ok: true });
}
