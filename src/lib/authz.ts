import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/db/schema";

async function requireAuth() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) throw new Error("UNAUTHORIZED");
  const dbUser = await db.query.users.findFirst({ where: eq(users.id, String(user.id)) });
  if (!dbUser || dbUser.isDeleted) throw new Error("UNAUTHORIZED");
  if (dbUser.role !== "OWNER" && !dbUser.approvedAt) throw new Error("UNAPPROVED");
  return { session, userId: String(user.id), role: dbUser.role as UserRole | undefined };
}

const roleRank: Record<UserRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MANAGER: 1,
};

export async function requireRole(minRole: UserRole) {
  const { userId, role } = await requireAuth();
  const actual = role ?? "MANAGER";
  if (roleRank[actual] < roleRank[minRole]) throw new Error("FORBIDDEN");
  return { userId, role: actual };
}

/** Any approved account (OWNER / ADMIN / MANAGER). No extra role rank — use for org-wide features like attestation. */
export async function requireApprovedUser() {
  const { userId, role } = await requireAuth();
  const actual = role ?? "MANAGER";
  return { userId, role: actual };
}

