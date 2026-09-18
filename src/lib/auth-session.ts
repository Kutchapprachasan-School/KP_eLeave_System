import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers, cookies } from "next/headers";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;

  const actualUser = session.user as any;
  
  // Safe DB queries to verify admin status and load active appointed duties
  const [dbUser, activeDuties] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actualUser.id },
      select: { role: true, position: true }
    }),
    prisma.userDutyAssignment.findMany({
      where: { userId: actualUser.id, revokedAt: null },
      select: {
        id: true,
        dutyType: true,
        divisionScope: true,
        departmentScope: true,
      }
    })
  ]);

  actualUser.duties = activeDuties;
  const isActualAdmin = dbUser?.role === "ADMIN" || dbUser?.position === "แอดมิน";
  
  if (isActualAdmin) {
    actualUser.isActualAdmin = true;
    const cookieStore = await cookies();
    let impPosition = cookieStore.get("imp_position")?.value;
    const impRole = cookieStore.get("imp_role")?.value;
    
    if (impPosition) {
      try {
        impPosition = decodeURIComponent(impPosition);
      } catch (e) {}
      actualUser.position = impPosition === "CLEAR" ? null : impPosition;
    }
    if (impRole) {
      actualUser.role = impRole === "CLEAR" ? "TEACHER" : impRole;
    }
  }

  return session;
}
