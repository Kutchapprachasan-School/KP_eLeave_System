import { prisma } from "@/lib/db";
import {
  PlatformEventType,
  createPlatformEvent,
  PlanningApprovedPayload,
  PlanningRejectedPayload,
  PlatformEventEnvelope,
} from "@/events/eventCatalog";

export interface WorkflowStageInput {
  stageOrder: number;
  stageName: string;
  roleName: string;
  isMandatory?: boolean;
}

export interface WorkflowStatusSummary {
  sessionId: string;
  sessionStatus: string;
  workflowName: string;
  currentActiveStageOrder: number | null;
  currentActiveRole: string | null;
  isFullyApproved: boolean;
  isRejected: boolean;
  steps: Array<{
    id: string;
    stepOrder: number;
    roleRequired: string;
    status: string; // PENDING, APPROVED, REJECTED
    comment?: string | null;
    approvedById?: string | null;
    approvedAt?: Date | null;
  }>;
}

export class WorkflowEngine {
  /**
   * Initializes approval steps for a PlanningSession using the default or requested ApprovalWorkflow.
   */
  public async initializeSessionWorkflow(
    planningSessionId: string,
    workflowId?: string
  ): Promise<WorkflowStatusSummary> {
    const session = await prisma.planningSession.findUnique({
      where: { id: planningSessionId },
      include: { approvalSteps: true },
    });

    if (!session) {
      throw new Error(`PlanningSession with ID "${planningSessionId}" not found.`);
    }

    // Find workflow by ID or fallback to default
    let workflow = workflowId
      ? await prisma.approvalWorkflow.findUnique({ where: { id: workflowId }, include: { stages: true } })
      : await prisma.approvalWorkflow.findFirst({ where: { isDefault: true }, include: { stages: true } });

    if (!workflow || workflow.stages.length === 0) {
      workflow = await this.seedDefaultWorkflow();
    }

    // Clear existing steps if any and initialize fresh steps from workflow stages
    await prisma.approvalStep.deleteMany({
      where: { planningSessionId },
    });

    const sortedStages = [...workflow.stages].sort((a, b) => a.stageOrder - b.stageOrder);

    const stepPromises = sortedStages.map((stage) =>
      prisma.approvalStep.create({
        data: {
          planningSessionId,
          stepOrder: stage.stageOrder,
          roleRequired: stage.roleName,
          status: "PENDING",
        },
      })
    );

    await Promise.all(stepPromises);

    await prisma.planningSession.update({
      where: { id: planningSessionId },
      data: { status: "UNDER_REVIEW" },
    });

    return this.getWorkflowStatus(planningSessionId);
  }

  /**
   * Evaluates and returns current workflow status summary for a session.
   */
  public async getWorkflowStatus(planningSessionId: string): Promise<WorkflowStatusSummary> {
    const session = await prisma.planningSession.findUnique({
      where: { id: planningSessionId },
      include: {
        approvalSteps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!session) {
      throw new Error(`PlanningSession with ID "${planningSessionId}" not found.`);
    }

    const steps = session.approvalSteps;
    const isRejected = steps.some((s) => s.status === "REJECTED");
    const pendingStep = steps.find((s) => s.status === "PENDING");
    const isFullyApproved = steps.length > 0 && steps.every((s) => s.status === "APPROVED");

    return {
      sessionId: session.id,
      sessionStatus: session.status,
      workflowName: "Standard Approval Workflow",
      currentActiveStageOrder: pendingStep ? pendingStep.stepOrder : null,
      currentActiveRole: pendingStep ? pendingStep.roleRequired : null,
      isFullyApproved,
      isRejected,
      steps: steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        roleRequired: s.roleRequired,
        status: s.status,
        comment: s.comment,
        approvedById: s.approvedById,
        approvedAt: s.approvedAt,
      })),
    };
  }

  /**
   * Approves a specific stage step in the workflow.
   */
  public async approveStep(
    planningSessionId: string,
    stepOrder: number,
    approvedById: string,
    comment?: string
  ): Promise<{
    summary: WorkflowStatusSummary;
    event: PlatformEventEnvelope<PlanningApprovedPayload>;
  }> {
    const step = await prisma.approvalStep.findFirst({
      where: { planningSessionId, stepOrder },
    });

    if (!step) {
      throw new Error(`Approval step order ${stepOrder} not found for session "${planningSessionId}".`);
    }

    if (step.status === "APPROVED") {
      throw new Error(`Step order ${stepOrder} has already been approved.`);
    }

    // Verify all previous lower-order steps are already approved
    const previousSteps = await prisma.approvalStep.findMany({
      where: {
        planningSessionId,
        stepOrder: { lt: stepOrder },
      },
    });

    const unapprovedPrev = previousSteps.filter((s) => s.status !== "APPROVED");
    if (unapprovedPrev.length > 0) {
      throw new Error(`Cannot approve step ${stepOrder} before previous steps are approved.`);
    }

    // Update current step to APPROVED
    await prisma.approvalStep.update({
      where: { id: step.id },
      data: {
        status: "APPROVED",
        approvedById,
        approvedAt: new Date(),
        comment: comment || null,
      },
    });

    // Check if all steps in the session are now approved
    const allSteps = await prisma.approvalStep.findMany({
      where: { planningSessionId },
    });
    const allApproved = allSteps.every((s) => s.status === "APPROVED");

    const session = await prisma.planningSession.findUnique({ where: { id: planningSessionId } });

    if (allApproved && session) {
      await prisma.planningSession.update({
        where: { id: planningSessionId },
        data: { status: "APPROVED" },
      });
    }

    const event = createPlatformEvent<PlanningApprovedPayload>({
      aggregateType: "PLANNING_SESSION",
      aggregateId: planningSessionId,
      eventType: PlatformEventType.PLANNING_APPROVED,
      payload: {
        sessionId: planningSessionId,
        stageOrder,
        approvedBy: approvedById,
        academicYear: session?.academicYear ?? 2569,
        term: session?.term ?? 1,
      },
    });

    const summary = await this.getWorkflowStatus(planningSessionId);
    return { summary, event };
  }

  /**
   * Rejects a stage step in the workflow and resets session status.
   */
  public async rejectStep(
    planningSessionId: string,
    stepOrder: number,
    rejectedById: string,
    reason: string
  ): Promise<{
    summary: WorkflowStatusSummary;
    event: PlatformEventEnvelope<PlanningRejectedPayload>;
  }> {
    const step = await prisma.approvalStep.findFirst({
      where: { planningSessionId, stepOrder },
    });

    if (!step) {
      throw new Error(`Approval step order ${stepOrder} not found for session "${planningSessionId}".`);
    }

    await prisma.approvalStep.update({
      where: { id: step.id },
      data: {
        status: "REJECTED",
        approvedById: rejectedById,
        approvedAt: new Date(),
        comment: reason,
      },
    });

    // Revert PlanningSession back to IN_PLANNING
    await prisma.planningSession.update({
      where: { id: planningSessionId },
      data: { status: "IN_PLANNING" },
    });

    const event = createPlatformEvent<PlanningRejectedPayload>({
      aggregateType: "PLANNING_SESSION",
      aggregateId: planningSessionId,
      eventType: PlatformEventType.PLANNING_REJECTED,
      payload: {
        sessionId: planningSessionId,
        stageOrder,
        rejectedBy: rejectedById,
        reason,
      },
    });

    const summary = await this.getWorkflowStatus(planningSessionId);
    return { summary, event };
  }

  /**
   * Creates a new ApprovalWorkflow in database.
   */
  public async createWorkflow(
    name: string,
    stages: WorkflowStageInput[],
    isDefault: boolean = false
  ) {
    if (isDefault) {
      await prisma.approvalWorkflow.updateMany({
        data: { isDefault: false },
      });
    }

    return prisma.approvalWorkflow.create({
      data: {
        name,
        isDefault,
        stages: {
          create: stages.map((s) => ({
            stageOrder: s.stageOrder,
            stageName: s.stageName,
            roleName: s.roleName,
            isMandatory: s.isMandatory ?? true,
          })),
        },
      },
      include: { stages: true },
    });
  }

  /**
   * Seeds standard 3-stage workflow if not existing.
   */
  public async seedDefaultWorkflow() {
    const existing = await prisma.approvalWorkflow.findFirst({
      where: { name: "Standard 3-Stage Approval" },
      include: { stages: true },
    });
    if (existing) return existing;

    return this.createWorkflow(
      "Standard 3-Stage Approval",
      [
        { stageOrder: 1, stageName: "หัวหน้ากลุ่มสาระการเรียนรู้", roleName: "HEAD_OF_DEPT", isMandatory: true },
        { stageOrder: 2, stageName: "รองผู้อำนวยการฝ่ายวิชาการ", roleName: "ACADEMIC_DIRECTOR", isMandatory: true },
        { stageOrder: 3, stageName: "ผู้อำนวยการโรงเรียน", roleName: "SCHOOL_DIRECTOR", isMandatory: true },
      ],
      true
    );
  }
}

export const workflowEngine = new WorkflowEngine();
