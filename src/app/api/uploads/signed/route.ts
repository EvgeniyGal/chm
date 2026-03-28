import { put } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { blobReadWriteToken } from "@/lib/blob-token";
import { getSignedScansForEntity } from "@/lib/signed-scans";

export const runtime = "nodejs";

/**
 * Max upload size (bytes). Entire file is buffered (images are converted with sharp).
 * Override with MAX_SIGNED_UPLOAD_MB (integer, mebibytes).
 */
const maxMbFromEnv = Number(process.env.MAX_SIGNED_UPLOAD_MB);
const MAX_BYTES =
  Number.isFinite(maxMbFromEnv) && maxMbFromEnv > 0
    ? Math.floor(maxMbFromEnv) * 1024 * 1024
    : 12 * 1024 * 1024;

const querySchema = z.object({
  entityType: z.enum(["CONTRACT", "INVOICE", "ACCEPTANCE_ACT"]),
  entityId: z.string().uuid(),
});

function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  const head = buf.subarray(0, 5).toString("latin1");
  return head.startsWith("%PDF");
}

export async function GET(req: Request) {
  await requireRole("MANAGER");

  const url = new URL(req.url);
  const parsedQuery = querySchema.safeParse({
    entityType: url.searchParams.get("entityType"),
    entityId: url.searchParams.get("entityId"),
  });
  if (!parsedQuery.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsedQuery.error.flatten() }, { status: 400 });
  }

  const data = await getSignedScansForEntity(parsedQuery.data.entityType, parsedQuery.data.entityId);
  return Response.json({ data });
}

export async function POST(req: Request) {
  const { userId } = await requireRole("MANAGER");

  const blobToken = blobReadWriteToken();
  if (!blobToken) {
    return Response.json(
      {
        error: "BLOB_NOT_CONFIGURED",
        hint: "Задайте BLOB_READ_WRITE_TOKEN у .env.local (Vercel → Storage → Blob, або vercel env pull). Старий ключ VERCEL_BLOB_READ_WRITE_TOKEN також підтримується.",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const parsedQuery = querySchema.safeParse({
    entityType: url.searchParams.get("entityType"),
    entityId: url.searchParams.get("entityId"),
  });
  if (!parsedQuery.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsedQuery.error.flatten() }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "MISSING_FILE" }, { status: 400 });

  const originalName = file.name || "upload";
  const buf = Buffer.from(await file.arrayBuffer());

  if (buf.length === 0) return Response.json({ error: "EMPTY_FILE" }, { status: 400 });
  if (buf.length > MAX_BYTES) {
    return Response.json({ error: "FILE_TOO_LARGE", maxMb: MAX_BYTES / (1024 * 1024) }, { status: 400 });
  }

  const basePath = `${parsedQuery.data.entityType.toLowerCase()}/${parsedQuery.data.entityId}`;
  const stamp = Date.now();

  let uploadBody: Buffer;
  let storageKey: string;
  let contentType: string;

  if (isPdfBuffer(buf)) {
    uploadBody = buf;
    storageKey = `${basePath}/signed-${stamp}.pdf`;
    contentType = "application/pdf";
  } else {
    // Raster only: always re-encode to WebP before Blob upload (JPEG/PNG/WebP/HEIC/… → smaller file).
    try {
      uploadBody = await sharp(buf)
        .rotate()
        .webp({ quality: 80, effort: 6 })
        .toBuffer();
    } catch {
      return Response.json(
        {
          error: "UNSUPPORTED_OR_CORRUPT_IMAGE",
          hint: "Підтримуються поширені растрові формати (JPEG, PNG, GIF, WebP, TIFF тощо). PDF завантажуйте окремо.",
        },
        { status: 400 },
      );
    }
    storageKey = `${basePath}/signed-${stamp}.webp`;
    contentType = "image/webp";
  }

  const blob = await put(storageKey, uploadBody, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    token: blobToken,
  });

  const [doc] = await db
    .insert(documents)
    .values({
      entityType: parsedQuery.data.entityType,
      entityId: parsedQuery.data.entityId,
      kind: "SIGNED_SCAN",
      storageKey: blob.pathname,
      contentType,
      originalFilename: originalName,
    })
    .returning();

  await writeAuditEvent({
    entityType: parsedQuery.data.entityType === "ACCEPTANCE_ACT" ? "ACCEPTANCE_ACT" : (parsedQuery.data.entityType as any),
    entityId: parsedQuery.data.entityId,
    action: "UPDATE",
    actorUserId: userId,
    diff: { documentId: doc!.id, kind: "SIGNED_SCAN", contentType },
  });

  return Response.json({ ok: true, document: doc, blobUrl: blob.url });
}
