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
  planningBudgetOfficerUserIds: string[];
  planningDisburserUserIds: string[];
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
        planningBudgetOfficerUserIds: parseCommaSeparatedIds(
          settings.planningBudgetOfficerUserIds
        ),
        planningDisburserUserIds: parseCommaSeparatedIds(
          settings.planningDisburserUserIds
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
  planningBudgetOfficerUserIds?: string[];
  planningDisburserUserIds?: string[];
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

    const formattedOfficerIds = formatCommaSeparatedIds(input.planningOfficerUserIds);
    const formattedBudgetOfficerIds = formatCommaSeparatedIds(input.planningBudgetOfficerUserIds ?? []);
    const formattedDisburserIds = formatCommaSeparatedIds(input.planningDisburserUserIds ?? []);

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        enablePlanning: Boolean(input.enablePlanning),
        planningOfficerUserIds: formattedOfficerIds,
        planningBudgetOfficerUserIds: formattedBudgetOfficerIds,
        planningDisburserUserIds: formattedDisburserIds,
      },
      create: {
        id: "default",
        enablePlanning: Boolean(input.enablePlanning),
        planningOfficerUserIds: formattedOfficerIds,
        planningBudgetOfficerUserIds: formattedBudgetOfficerIds,
        planningDisburserUserIds: formattedDisburserIds,
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
        planningBudgetOfficerUserIds: parseCommaSeparatedIds(
          updated.planningBudgetOfficerUserIds
        ),
        planningDisburserUserIds: parseCommaSeparatedIds(
          updated.planningDisburserUserIds
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
