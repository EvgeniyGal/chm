import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return Response.json({ error: "MISSING_TOKEN" }, { status: 400 });

  const now = new Date();

  const tokenRow = await db.query.emailVerificationTokens.findFirst({
    where: and(eq(emailVerificationTokens.token, token), gt(emailVerificationTokens.expiresAt, now)),
  });

  if (!tokenRow) return Response.json({ error: "INVALID_OR_EXPIRED_TOKEN" }, { status: 400 });

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerified: now, updatedAt: now })
      .where(eq(users.id, tokenRow.userId));

    await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, tokenRow.id));
  });

  return Response.json({ ok: true });
}

