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
  canRecordAndSettleExpenses: boolean;
  canManageAttachments: boolean;
}

export function getPlanningPermissions(
  user: { id: string; role: string },
  settings: { enablePlanning?: boolean; planningOfficerUserIds?: string | null },
  context?: PlanningAuthContext
): PlanningPermissionsResult {
  const isAdmin = user.role === "ADMIN";
  const officerIds = parseCommaSeparatedIds(settings.planningOfficerUserIds);
  const isPlanningOfficer = isAdmin || officerIds.includes(user.id);
  const isProjectOwner =
    Boolean(context?.leaderUserId && context.leaderUserId === user.id) ||
    Boolean(context?.responsibleUserId && context.responsibleUserId === user.id);
  const isEditableProjectStatus =
    context?.projectStatus !== "COMPLETED" && context?.projectStatus !== "CANCELLED";

  return {
    canViewModule: Boolean(settings.enablePlanning ?? true) || isAdmin,
    canManageProjectsAndBudget: isPlanningOfficer,
    canRecordAndSettleExpenses: isPlanningOfficer,
    canManageAttachments: isPlanningOfficer || (isProjectOwner && isEditableProjectStatus),
  };
}
