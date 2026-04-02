import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { documentTemplates } from "@/db/schema/attestation";
import type { AttestationTemplateType } from "@/db/schema/attestation";

import { readTemplateBuffer } from "@/lib/attestation/template-buffer";

export async function loadActiveTemplateBuffer(
  templateType: AttestationTemplateType,
): Promise<{ buffer: Buffer }> {
  const row = await db.query.documentTemplates.findFirst({
    where: and(eq(documentTemplates.templateType, templateType), eq(documentTemplates.isActive, true)),
  });
  if (!row) {
    throw new Error("NO_ACTIVE_ATTESTATION_TEMPLATE");
  }
  return { buffer: await readTemplateBuffer(row.storageKey) };
}
