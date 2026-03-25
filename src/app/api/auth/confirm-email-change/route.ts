import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { emailChangeTokens, users } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return Response.json({ error: "MISSING_TOKEN" }, { status: 400 });

  const now = new Date();
  const tokenRow = await db.query.emailChangeTokens.findFirst({
    where: and(eq(emailChangeTokens.token, token), gt(emailChangeTokens.expiresAt, now)),
  });
  if (!tokenRow) return Response.json({ error: "INVALID_OR_EXPIRED_TOKEN" }, { status: 400 });

  const newEmail = tokenRow.newEmail.toLowerCase().trim();
  const existing = await db.query.users.findFirst({ where: eq(users.email, newEmail) });
  if (existing && existing.id !== tokenRow.userId && !existing.isDeleted) {
    return Response.json({ error: "EMAIL_IN_USE" }, { status: 409 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ email: newEmail, emailVerified: now, updatedAt: now })
      .where(eq(users.id, tokenRow.userId));
    await tx.delete(emailChangeTokens).where(eq(emailChangeTokens.id, tokenRow.id));
  });

  return Response.json({ ok: true });
}

