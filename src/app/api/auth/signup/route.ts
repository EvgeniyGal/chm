import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";

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

  return Response.json({
    ok: true,
    userId: created!.id,
    // For now we return a link instead of sending email.
    confirmUrl: `/api/auth/confirm-email?token=${encodeURIComponent(token)}`,
  });
}

