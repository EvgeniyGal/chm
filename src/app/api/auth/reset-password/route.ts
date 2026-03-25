import { hash } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: and(eq(passwordResetTokens.token, parsed.data.token), gt(passwordResetTokens.expiresAt, now)),
  });
  if (!tokenRow) return Response.json({ error: "INVALID_OR_EXPIRED_TOKEN" }, { status: 400 });

  const passwordHash = await hash(parsed.data.newPassword, 12);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, tokenRow.userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRow.id));
  });

  return Response.json({ ok: true });
}

