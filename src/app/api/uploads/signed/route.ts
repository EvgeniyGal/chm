import { put } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const querySchema = z.object({
  entityType: z.enum(["CONTRACT", "INVOICE", "ACCEPTANCE_ACT"]),
  entityId: z.string().uuid(),
});

export async function POST(req: Request) {
  const { userId } = await requireRole("MANAGER");

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

  const originalName = file.name || "signed.jpg";
  const buf = Buffer.from(await file.arrayBuffer());

  // Very strict: only accept JPEG magic bytes.
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isJpeg) return Response.json({ error: "ONLY_JPG_ALLOWED" }, { status: 400 });

  const webp = await sharp(buf).rotate().webp({ quality: 80 }).toBuffer();
  const storageKey = `${parsedQuery.data.entityType.toLowerCase()}/${parsedQuery.data.entityId}/signed-${Date.now()}.webp`;

  const blob = await put(storageKey, webp, {
    access: "private",
    contentType: "image/webp",
    addRandomSuffix: false,
  });

  const [doc] = await db
    .insert(documents)
    .values({
      entityType: parsedQuery.data.entityType,
      entityId: parsedQuery.data.entityId,
      kind: "SIGNED_SCAN",
      storageKey: blob.pathname,
      contentType: "image/webp",
      originalFilename: originalName,
    })
    .returning();

  await writeAuditEvent({
    entityType: parsedQuery.data.entityType === "ACCEPTANCE_ACT" ? "ACCEPTANCE_ACT" : (parsedQuery.data.entityType as any),
    entityId: parsedQuery.data.entityId,
    action: "UPDATE",
    actorUserId: userId,
    diff: { documentId: doc!.id, kind: "SIGNED_SCAN" },
  });

  return Response.json({ ok: true, document: doc, blobUrl: blob.url });
}

