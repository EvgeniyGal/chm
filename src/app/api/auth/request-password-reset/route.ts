import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  // Do not leak whether account exists.
  if (!user || user.isDeleted || !user.emailVerified) {
    return Response.json({ ok: true });
  }

  // Invalidate prior tokens for this user.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30m
  await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

  return Response.json({
    ok: true,
    resetUrl: `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
  });
}

