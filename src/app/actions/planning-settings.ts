"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { formatCommaSeparatedIds } from "@/lib/planning/permissions";

const updatePlanningSettingsSchema = z.object({
  enablePlanning: z.boolean(),
  planningOfficerUserIds: z.array(z.string()).default([]),
});

export async function updatePlanningSettingsAction(rawData: z.infer<typeof updatePlanningSettingsSchema>) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;

    if (!user || user.role !== "ADMIN") {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์แก้ไขการตั้งค่าระบบ (ต้องเป็น ADMIN)" };
    }

    const validated = updatePlanningSettingsSchema.parse(rawData);
    const officerIdsString = formatCommaSeparatedIds(validated.planningOfficerUserIds);

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        enablePlanning: validated.enablePlanning,
        planningOfficerUserIds: officerIdsString,
      },
      create: {
        id: "default",
        enablePlanning: validated.enablePlanning,
        planningOfficerUserIds: officerIdsString,
      },
      select: {
        enablePlanning: true,
        planningOfficerUserIds: true,
      },
    });

    revalidatePath("/planning");
    revalidatePath("/settings");

    return { success: true as const, data: updated };
  } catch (error: any) {
    console.error("updatePlanningSettingsAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า" };
  }
}
