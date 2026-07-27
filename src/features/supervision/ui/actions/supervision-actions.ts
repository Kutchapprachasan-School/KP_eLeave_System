"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getVerifiedServerSession, hasPermission } from "@/core/infrastructure/auth/auth-guard";
import { getErrorMessage } from "@/core/utils/error-handler";
import { prisma } from "@/core/infrastructure/prisma";
import { SUPERVISION_PERMISSIONS } from "@/constants/permissions";
import { DirectorSignUseCase } from "../../application/use-cases/director-sign.use-case";

export async function submitDirectorSignAction(formData: {
  sessionId: string;
  directorComment?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 🛡️ 1. Zero-Trust Verified Session
    const session = await getVerifiedServerSession();
    if (!session) {
      return { success: false, error: "Unauthenticated: กรุณาล็อกอินเข้าสู่ระบบ" };
    }

    // 🛡️ 2. Strict Permission Check
    if (!hasPermission(session, SUPERVISION_PERMISSIONS.DIRECTOR_SIGN)) {
      return { success: false, error: "Forbidden: คุณไม่มีสิทธิ์ลงนามในเอกสารนี้" };
    }

    // 🚀 3. Execute Transactional Use Case
    const useCase = new DirectorSignUseCase(prisma);
    const result = await useCase.execute({
      sessionId: formData.sessionId,
      directorId: session.id,
      directorComment: formData.directorComment,
    });

    // 🔄 4. Multi-Scope Cache Invalidation
    revalidatePath("/academic/supervision");
    revalidatePath(`/academic/supervision/${result.sessionId}`);
    revalidatePath("/academic/dashboard");
    
    revalidateTag("supervision-matrix-grid");
    revalidateTag("academic-kpi-stats");

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
