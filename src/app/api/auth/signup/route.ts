import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { appBaseUrl, sendAuthEmail } from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing && !existing.isDeleted) {
    return Response.json({ error: "EMAIL_IN_USE" }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const [created] = await db
    .insert(users)
    .values({
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      email,
      passwordHash,
      role: "MANAGER",
      emailVerified: null,
      isDeleted: false,
      deletedAt: null,
    })
    .returning();

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await db.insert(emailVerificationTokens).values({
    userId: created!.id,
    token,
    expiresAt,
  });

  const confirmUrl = `${appBaseUrl()}/api/auth/confirm-email?token=${encodeURIComponent(token)}`;
  try {
    await sendAuthEmail({
      to: created!.email,
      subject: "Підтвердження email для CRM",
      text: `Підтвердіть email, перейшовши за посиланням: ${confirmUrl}`,
      html: `<p>Підтвердіть email для CRM:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
    });
  } catch (error) {
    console.error("MAIL_SEND_SIGNUP_FAILED", error);
    // Keep signup atomic from user's perspective: if email didn't send,
    // remove just-created records so user can safely retry registration.
    await db.transaction(async (tx) => {
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, created!.id));
      await tx.delete(users).where(eq(users.id, created!.id));
    });
    return Response.json({ error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    userId: created!.id,
    confirmUrl,
  });
}

