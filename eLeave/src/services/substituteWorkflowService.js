/**
 * SROP Phase 2: Substitute Workflow Service
 * Manages Workflow Lifecycle and Assignment Policies (CENTRALIZED, DEPARTMENT, HYBRID).
 */

export class SubstituteWorkflowService {
  constructor(store = { workflows: [], policies: [] }) {
    this.store = store;
  }

  /**
   * Filter candidates based on school AssignmentPolicy:
   * - CENTRALIZED: All teachers in school pool
   * - DEPARTMENT: Only teachers from same department
   * - HYBRID: Same department first, fallback to all teachers if pool empty
   */
  filterCandidatesByPolicy(candidates, targetDepartmentId, policyType = 'DEPARTMENT') {
    if (policyType === 'CENTRALIZED') {
      return candidates;
    }

    const sameDeptCandidates = candidates.filter(c => c.departmentId === targetDepartmentId);

    if (policyType === 'DEPARTMENT') {
      return sameDeptCandidates;
    }

    if (policyType === 'HYBRID') {
      return sameDeptCandidates.length > 0 ? sameDeptCandidates : candidates;
    }

    return candidates;
  }

  /**
   * Create a new substitute assignment workflow item
   */
  assignSubstitute(leaveRequestId, timetableSlotId, dateStr, assignedTeacherId, assignedBy) {
    const workflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      leaveRequestId,
      timetableSlotId,
      date: dateStr,
      assignedTeacherId,
      assignedBy,
      status: 'ASSIGNED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.workflows.push(workflow);
    return workflow;
  }

  /**
   * Transition workflow status (ACKNOWLEDGED or REJECTED)
   */
  respondWorkflow(workflowId, responseStatus) {
    const wf = this.store.workflows.find(w => w.id === workflowId);
    if (!wf) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!['ACKNOWLEDGED', 'REJECTED'].includes(responseStatus)) {
      throw new Error(`Invalid response status: ${responseStatus}`);
    }

    wf.status = responseStatus;
    wf.updatedAt = new Date().toISOString();
    return wf;
  }
}
