import test from 'node:test';
import assert from 'node:assert/strict';
import * as academicPlanning from '../../../src/app/actions/academic-planning.ts';
import * as curriculumWorkflow from '../../../src/app/actions/curriculum-workflow.ts';
import * as workloadPolicy from '../../../src/app/actions/workload-policy.ts';

test('academic-planning exports all required functions', () => {
  assert.equal(typeof academicPlanning.getPlanningControlCenterStatsAction, 'function');
  assert.equal(typeof academicPlanning.getReadinessIndicatorsAction, 'function');
  assert.equal(typeof academicPlanning.updateReadinessIndicatorAction, 'function');
  assert.equal(typeof academicPlanning.evaluatePlanningSessionReadinessAction, 'function');
  assert.equal(typeof academicPlanning.publishPlanningSessionAtomicAction, 'function');
});

test('curriculum-workflow exports all required functions', () => {
  assert.equal(typeof curriculumWorkflow.getApprovalWorkflowsAction, 'function');
  assert.equal(typeof curriculumWorkflow.saveApprovalWorkflowAction, 'function');
  assert.equal(typeof curriculumWorkflow.getPlanningSandboxScenariosAction, 'function');
  assert.equal(typeof curriculumWorkflow.savePlanningSandboxScenarioAction, 'function');
  assert.equal(typeof curriculumWorkflow.compareSandboxScenariosAction, 'function');
  assert.equal(typeof curriculumWorkflow.getAcademicCalendarEventsAction, 'function');
  assert.equal(typeof curriculumWorkflow.saveAcademicEventAction, 'function');
  assert.equal(typeof curriculumWorkflow.getResourceItemsAction, 'function');
  assert.equal(typeof curriculumWorkflow.saveResourceItemAction, 'function');
  assert.equal(typeof curriculumWorkflow.reserveResourceAction, 'function');
});

test('workload-policy exports all required functions', () => {
  assert.equal(typeof workloadPolicy.getTeachingLoadPoliciesAction, 'function');
  assert.equal(typeof workloadPolicy.saveTeachingLoadPolicyAction, 'function');
  assert.equal(typeof workloadPolicy.getCourseWeightFactorsAction, 'function');
  assert.equal(typeof workloadPolicy.saveCourseWeightFactorAction, 'function');
  assert.equal(typeof workloadPolicy.calculateTeacherEtuWorkloadAction, 'function');
});
