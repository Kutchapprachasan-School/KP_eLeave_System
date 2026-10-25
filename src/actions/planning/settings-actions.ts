"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  formatCommaSeparatedIds,
  parseCommaSeparatedIds,
} from "@/lib/planning/permissions";
import { ActionResult, getPlanningActionContext } from "./_context";

export interface PlanningSettingsDTO {
  enablePlanning: boolean;
  planningOfficerUserIds: string[];
}

/**
 * ดึงค่าการตั้งค่าระบบแผนงานสำหรับหน้า Admin Settings
 */
export async function getPlanningSettingsAction(): Promise<
  ActionResult<PlanningSettingsDTO>
> {
  try {
    const { settings } = await getPlanningActionContext();
    return {
      success: true,
      data: {
        enablePlanning: settings.enablePlanning,
        planningOfficerUserIds: parseCommaSeparatedIds(
          settings.planningOfficerUserIds
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ไม่สามารถดึงข้อมูลการตั้งค่าระบบแผนงานได้",
    };
  }
}

/**
 * อัปเดตการตั้งค่าระบบแผนงาน (เฉพาะผู้ดูแลระบบ ADMIN เท่านั้น)
 */
export async function updatePlanningSettingsAction(input: {
  enablePlanning: boolean;
  planningOfficerUserIds: string[];
}): Promise<ActionResult<PlanningSettingsDTO>> {
  try {
    const { user } = await getPlanningActionContext();
    const role = (user.role || "").toUpperCase();

    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return {
        success: false,
        error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขการตั้งค่านี้ได้",
      };
    }

    const formattedIds = formatCommaSeparatedIds(input.planningOfficerUserIds);

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        enablePlanning: Boolean(input.enablePlanning),
        planningOfficerUserIds: formattedIds,
      },
      create: {
        id: "default",
        enablePlanning: Boolean(input.enablePlanning),
        planningOfficerUserIds: formattedIds,
      },
    });

    revalidatePath("/planning");
    revalidatePath("/settings");

    return {
      success: true,
      data: {
        enablePlanning: updated.enablePlanning,
        planningOfficerUserIds: parseCommaSeparatedIds(
          updated.planningOfficerUserIds
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการบันทึกการตั้งค่าระบบแผนงาน",
    };
  }
}
