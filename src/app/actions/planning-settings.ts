"use server";

import {
  getPlanningSettingsAction as _getPlanningSettingsAction,
  updatePlanningSettingsAction as _updatePlanningSettingsAction,
  type PlanningSettingsDTO,
} from "@/actions/planning/settings-actions";

export type { PlanningSettingsDTO };

export async function getPlanningSettingsAction() {
  return await _getPlanningSettingsAction();
}

export async function updatePlanningSettingsAction(input: {
  enablePlanning: boolean;
  planningOfficerUserIds: string[];
}) {
  return await _updatePlanningSettingsAction(input);
}
