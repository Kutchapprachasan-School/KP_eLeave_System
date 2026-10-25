"use server";

import {
  getPlanningDashboardDataAction as _getPlanningDashboardDataAction,
  getPlanningLedgerAction as _getPlanningLedgerAction,
  createProjectAction as _createProjectAction,
  updateProjectAction as _updateProjectAction,
  softDeleteProjectAction as _softDeleteProjectAction,
  createActivityAction as _createActivityAction,
  updateActivityAction as _updateActivityAction,
  softDeleteActivityAction as _softDeleteActivityAction,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateActivityInput,
  type UpdateActivityInput,
  type PlanningDashboardPayload,
} from "@/actions/planning/project-actions";

export type {
  PlanningDashboardPayload,
  CreateProjectInput,
  UpdateProjectInput,
  CreateActivityInput,
  UpdateActivityInput,
};

export async function getPlanningDashboardDataAction(
  params?: number | { fiscalYear?: number }
) {
  return await _getPlanningDashboardDataAction(params);
}

export async function getPlanningLedgerAction(
  filters?: number | {
    fiscalYear?: number;
    departmentName?: string;
    budgetSourceType?: string;
    searchQuery?: string;
    myProjectsOnly?: boolean;
  }
) {
  return await _getPlanningLedgerAction(filters);
}

export async function createProjectAction(input: CreateProjectInput) {
  return await _createProjectAction(input);
}

export async function updateProjectAction(input: UpdateProjectInput) {
  return await _updateProjectAction(input);
}

export async function softDeleteProjectAction(projectId: string) {
  return await _softDeleteProjectAction(projectId);
}

export async function createActivityAction(input: CreateActivityInput) {
  return await _createActivityAction(input);
}

export async function updateActivityAction(input: UpdateActivityInput) {
  return await _updateActivityAction(input);
}

export async function softDeleteActivityAction(activityId: string) {
  return await _softDeleteActivityAction(activityId);
}
