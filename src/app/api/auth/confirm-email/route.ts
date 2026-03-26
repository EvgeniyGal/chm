import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";

export const runtime = "nodejs";

function redirectToSignInConfirmed(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/auth/sign-in?emailConfirmed=1`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return Response.json({ error: "MISSING_TOKEN" }, { status: 400 });

  const now = new Date();

  const tokenRow = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.token, token),
  });

  if (!tokenRow) {
    return Response.json({ error: "INVALID_OR_EXPIRED_TOKEN" }, { status: 400 });
  }

  if (tokenRow.usedAt) {
    return redirectToSignInConfirmed(req);
  }

  if (tokenRow.expiresAt <= now) {
    return Response.json({ error: "INVALID_OR_EXPIRED_TOKEN" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerified: now, updatedAt: now })
      .where(eq(users.id, tokenRow.userId));

    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokens.id, tokenRow.id));
  });

  return redirectToSignInConfirmed(req);
}
