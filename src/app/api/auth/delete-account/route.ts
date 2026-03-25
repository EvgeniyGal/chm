import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { emailChangeTokens, emailVerificationTokens, passwordResetTokens, users } from "@/db/schema";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

    await tx
      .update(users)
      .set({
        isDeleted: true,
        deletedAt: now,
        passwordHash: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
  });

  return Response.json({ ok: true });
}

