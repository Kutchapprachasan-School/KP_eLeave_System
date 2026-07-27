import { auth } from "@/core/infrastructure/auth";
import { prisma } from "@/core/infrastructure/prisma";

export interface VerifiedUserSession {
  id: string;
  permissions: string[];
}

/**
 * Hydrate Session สดจาก Database ทุกครั้งเพื่อป้องกัน Stale Client Data หรือ Permission Spoofing
 */
export async function getVerifiedServerSession(): Promise<VerifiedUserSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, permissions: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    permissions: user.permissions ?? [],
  };
}

export function hasPermission(
  session: VerifiedUserSession | null,
  requiredPermission: string
): boolean {
  if (!session?.permissions) return false;
  return session.permissions.includes(requiredPermission);
}
