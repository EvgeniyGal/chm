import { auth } from "@/auth";
import type { UserRole } from "@/db/schema";

export async function requireAuth() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return { session, userId: String(user.id), role: user.role as UserRole | undefined };
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

