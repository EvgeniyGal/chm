import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { emailChangeTokens, users } from "@/db/schema";
import { appBaseUrl, sendAuthEmail } from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({
  newEmail: z.string().email(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const newEmail = parsed.data.newEmail.toLowerCase().trim();
  const existing = await db.query.users.findFirst({ where: eq(users.email, newEmail) });
  if (existing && existing.id !== userId && !existing.isDeleted) {
    return Response.json({ error: "EMAIL_IN_USE" }, { status: 409 });
  }

  await db.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2h
  await db.insert(emailChangeTokens).values({ userId, newEmail, token, expiresAt });
  const confirmUrl = `${appBaseUrl()}/auth/confirm-email-change?token=${encodeURIComponent(token)}`;
  try {
    await sendAuthEmail({
      to: newEmail,
      subject: "Підтвердження зміни email у CRM",
      text: `Підтвердіть новий email, перейшовши за посиланням: ${confirmUrl}`,
      html: `<p>Підтвердіть зміну email у CRM:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
    });
  } catch {
    return Response.json({ error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    confirmUrl,
  });
}

