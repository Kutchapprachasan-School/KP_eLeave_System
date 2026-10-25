/**
 * School Planning & Budget Tracking - Permissions Helper
 * Module: src/lib/planning/permissions.ts
 */

export function parseCommaSeparatedIds(rawIds?: string | null): string[] {
  if (!rawIds) return [];
  return rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function formatCommaSeparatedIds(ids: string[]): string {
  return ids
    .map((id) => id.trim())
    .filter(Boolean)
    .join(",");
}

export interface PlanningAuthContext {
  leaderUserId?: string;
  responsibleUserId?: string;
  projectStatus?: string;
}

export interface PlanningPermissionsResult {
  canViewModule: boolean;
  canManageProjectsAndBudget: boolean;
  canAdjustBudget: boolean;
  canRecordAndSettleExpenses: boolean;
  canManageAttachments: boolean;
}

export type PlanningUserPermissions = PlanningPermissionsResult;

export interface PlanningSettingsForPermissions {
  enablePlanning?: boolean;
  planningOfficerUserIds?: string | null;
  planningBudgetOfficerUserIds?: string | null;
  planningDisburserUserIds?: string | null;
}

export type PermissionCheckUser = { id: string; role: string };
export type PermissionCheckSettings = PlanningSettingsForPermissions;

export function getPlanningPermissions(
  user: { id: string; role: string },
  settings: PlanningSettingsForPermissions,
  context?: PlanningAuthContext
): PlanningPermissionsResult {
  const roleUpper = (user.role || "").toUpperCase();
  const isAdmin = roleUpper === "ADMIN" || roleUpper === "SUPERADMIN";

  const officerIds = parseCommaSeparatedIds(settings.planningOfficerUserIds);
  const budgetOfficerIds = parseCommaSeparatedIds(settings.planningBudgetOfficerUserIds);
  const disburserIds = parseCommaSeparatedIds(settings.planningDisburserUserIds);

  const isPlanningOfficer = isAdmin || officerIds.includes(user.id);

  // ผู้มีสิทธิ์แก้ไขข้อมูลจำนวนเงินและโอนเกลี่ยงบประมาณ:
  // หากระบุรายชื่อ ให้สิทธิ์เฉพาะผู้มีรายชื่อและ Admin
  // หากยังไม่ระบุ ให้ fallback ใช้สิทธิ์เดียวกับเจ้าหน้าที่แผนงานหลัก
  const canAdjustBudget =
    isAdmin ||
    (budgetOfficerIds.length > 0
      ? budgetOfficerIds.includes(user.id)
      : isPlanningOfficer);

  // ผู้มีสิทธิ์เพิ่มและบันทึกข้อมูลการเบิกจ่ายงบประมาณ:
  // หากระบุรายชื่อ ให้สิทธิ์เฉพาะผู้มีรายชื่อและ Admin
  // หากยังไม่ระบุ ให้ fallback ใช้สิทธิ์เดียวกับเจ้าหน้าที่แผนงานหลัก
  const canRecordAndSettleExpenses =
    isAdmin ||
    (disburserIds.length > 0
      ? disburserIds.includes(user.id)
      : isPlanningOfficer);

  const isProjectOwner =
    Boolean(context?.leaderUserId && context.leaderUserId === user.id) ||
    Boolean(context?.responsibleUserId && context.responsibleUserId === user.id);
  const isEditableProjectStatus =
    context?.projectStatus !== "COMPLETED" && context?.projectStatus !== "CANCELLED";

  return {
    canViewModule: Boolean(settings.enablePlanning ?? true) || isAdmin,
    canManageProjectsAndBudget: isPlanningOfficer,
    canAdjustBudget,
    canRecordAndSettleExpenses,
    canManageAttachments: isPlanningOfficer || (isProjectOwner && isEditableProjectStatus),
  };
}
