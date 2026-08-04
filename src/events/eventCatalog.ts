import { z } from "zod";

/**
 * Event Catalog for Academic Planning Platform
 * Defines contract schemas, payload types, and event envelopes for all 12 platform events.
 */

export const PlatformEventType = {
  CURRICULUM_PUBLISHED: "CURRICULUM_PUBLISHED",
  OFFERING_GENERATED: "OFFERING_GENERATED",
  TEACHER_ASSIGNED: "TEACHER_ASSIGNED",
  TEACHER_REASSIGNED: "TEACHER_REASSIGNED",
  PLANNING_APPROVED: "PLANNING_APPROVED",
  PLANNING_REJECTED: "PLANNING_REJECTED",
  READINESS_PASSED: "READINESS_PASSED",
  READINESS_FAILED: "READINESS_FAILED",
  TIMETABLE_REQUESTED: "TIMETABLE_REQUESTED",
  TIMETABLE_PUBLISHED: "TIMETABLE_PUBLISHED",
  EXAM_GENERATED: "EXAM_GENERATED",
  PA_OBSERVATION_CREATED: "PA_OBSERVATION_CREATED",
} as const;

export type PlatformEventType = typeof PlatformEventType[keyof typeof PlatformEventType];

// ---------------------------------------------------------------------------
// 1. CurriculumPublishedEvent
// ---------------------------------------------------------------------------
export const CurriculumPublishedPayloadSchema = z.object({
  curriculumVersionId: z.string(),
  academicYear: z.number().int(),
  term: z.number().int(),
  totalSubjects: z.number().int().nonnegative(),
  publishedBy: z.string(),
  checksum: z.string().optional(),
});
export type CurriculumPublishedPayload = z.infer<typeof CurriculumPublishedPayloadSchema>;

// ---------------------------------------------------------------------------
// 2. OfferingGeneratedEvent
// ---------------------------------------------------------------------------
export const OfferingGeneratedPayloadSchema = z.object({
  offeringId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
  classRoomId: z.string(),
  academicYear: z.number().int(),
  term: z.number().int(),
});
export type OfferingGeneratedPayload = z.infer<typeof OfferingGeneratedPayloadSchema>;

// ---------------------------------------------------------------------------
// 3. TeacherAssignedEvent
// ---------------------------------------------------------------------------
export const TeacherAssignedPayloadSchema = z.object({
  offeringId: z.string(),
  teacherId: z.string(),
  teacherName: z.string(),
  departmentId: z.string(),
  assignedBy: z.string(),
});
export type TeacherAssignedPayload = z.infer<typeof TeacherAssignedPayloadSchema>;

// ---------------------------------------------------------------------------
// 4. TeacherReassignedEvent
// ---------------------------------------------------------------------------
export const TeacherReassignedPayloadSchema = z.object({
  offeringId: z.string(),
  previousTeacherId: z.string(),
  newTeacherId: z.string(),
  reason: z.string().optional(),
  reassignedBy: z.string(),
});
export type TeacherReassignedPayload = z.infer<typeof TeacherReassignedPayloadSchema>;

// ---------------------------------------------------------------------------
// 5. PlanningApprovedEvent
// ---------------------------------------------------------------------------
export const PlanningApprovedPayloadSchema = z.object({
  sessionId: z.string(),
  stageOrder: z.number().int(),
  approvedBy: z.string(),
  academicYear: z.number().int(),
  term: z.number().int(),
});
export type PlanningApprovedPayload = z.infer<typeof PlanningApprovedPayloadSchema>;

// ---------------------------------------------------------------------------
// 6. PlanningRejectedEvent
// ---------------------------------------------------------------------------
export const PlanningRejectedPayloadSchema = z.object({
  sessionId: z.string(),
  stageOrder: z.number().int(),
  rejectedBy: z.string(),
  reason: z.string(),
});
export type PlanningRejectedPayload = z.infer<typeof PlanningRejectedPayloadSchema>;

// ---------------------------------------------------------------------------
// 7. ReadinessPassedEvent
// ---------------------------------------------------------------------------
export const ReadinessIndicatorResultSchema = z.object({
  indicatorId: z.string(),
  code: z.string(),
  name: z.string(),
  weight: z.number(),
  score: z.number(),
  passed: z.boolean(),
  expression: z.string(),
});

export const ReadinessPassedPayloadSchema = z.object({
  sessionId: z.string(),
  overallScore: z.number().min(0).max(100),
  checks: z.array(ReadinessIndicatorResultSchema),
});
export type ReadinessPassedPayload = z.infer<typeof ReadinessPassedPayloadSchema>;

// ---------------------------------------------------------------------------
// 8. ReadinessFailedEvent
// ---------------------------------------------------------------------------
export const ReadinessFailedPayloadSchema = z.object({
  sessionId: z.string(),
  overallScore: z.number().min(0).max(100),
  checks: z.array(ReadinessIndicatorResultSchema),
  failedIndicators: z.array(z.string()),
});
export type ReadinessFailedPayload = z.infer<typeof ReadinessFailedPayloadSchema>;

// ---------------------------------------------------------------------------
// 9. TimetableRequestedEvent
// ---------------------------------------------------------------------------
export const TimetableRequestedPayloadSchema = z.object({
  timetableVersionId: z.string(),
  academicYear: z.number().int(),
  term: z.number().int(),
  requestedBy: z.string(),
});
export type TimetableRequestedPayload = z.infer<typeof TimetableRequestedPayloadSchema>;

// ---------------------------------------------------------------------------
// 10. TimetablePublishedEvent
// ---------------------------------------------------------------------------
export const TimetablePublishedPayloadSchema = z.object({
  timetableVersionId: z.string(),
  academicYear: z.number().int(),
  term: z.number().int(),
  totalSlots: z.number().int().nonnegative(),
  publishedBy: z.string(),
});
export type TimetablePublishedPayload = z.infer<typeof TimetablePublishedPayloadSchema>;

// ---------------------------------------------------------------------------
// 11. ExamGeneratedEvent
// ---------------------------------------------------------------------------
export const ExamGeneratedPayloadSchema = z.object({
  examPeriodId: z.string(),
  academicYear: z.number().int(),
  term: z.number().int(),
  examType: z.string(),
  totalSlots: z.number().int().nonnegative(),
  generatedBy: z.string(),
});
export type ExamGeneratedPayload = z.infer<typeof ExamGeneratedPayloadSchema>;

// ---------------------------------------------------------------------------
// 12. PAObservationCreatedEvent
// ---------------------------------------------------------------------------
export const PAObservationCreatedPayloadSchema = z.object({
  paAgreementId: z.string(),
  teacherId: z.string(),
  evaluatorId: z.string(),
  observationDate: z.string(),
  dimensionScores: z.object({
    dimension1Score: z.number().int().min(1).max(5),
    dimension2Score: z.number().int().min(1).max(5),
    dimension3Score: z.number().int().min(1).max(5),
    dimension4Score: z.number().int().min(1).max(5),
    dimension5Score: z.number().int().min(1).max(5),
  }),
});
export type PAObservationCreatedPayload = z.infer<typeof PAObservationCreatedPayloadSchema>;

// ---------------------------------------------------------------------------
// Platform Event Envelope Definition & Helpers
// ---------------------------------------------------------------------------
export interface PlatformEventEnvelope<T = unknown> {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: PlatformEventType;
  timestamp: string;
  version: number;
  payload: T;
  hash?: string;
}

export function createPlatformEvent<T>(params: {
  eventId?: string;
  aggregateType: string;
  aggregateId: string;
  eventType: PlatformEventType;
  payload: T;
  version?: number;
  hash?: string;
}): PlatformEventEnvelope<T> {
  return {
    eventId: params.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    aggregateType: params.aggregateType,
    aggregateId: params.aggregateId,
    eventType: params.eventType,
    timestamp: new Date().toISOString(),
    version: params.version ?? 1,
    payload: params.payload,
    hash: params.hash,
  };
}

export const EventSchemaMap: Record<PlatformEventType, z.ZodSchema> = {
  [PlatformEventType.CURRICULUM_PUBLISHED]: CurriculumPublishedPayloadSchema,
  [PlatformEventType.OFFERING_GENERATED]: OfferingGeneratedPayloadSchema,
  [PlatformEventType.TEACHER_ASSIGNED]: TeacherAssignedPayloadSchema,
  [PlatformEventType.TEACHER_REASSIGNED]: TeacherReassignedPayloadSchema,
  [PlatformEventType.PLANNING_APPROVED]: PlanningApprovedPayloadSchema,
  [PlatformEventType.PLANNING_REJECTED]: PlanningRejectedPayloadSchema,
  [PlatformEventType.READINESS_PASSED]: ReadinessPassedPayloadSchema,
  [PlatformEventType.READINESS_FAILED]: ReadinessFailedPayloadSchema,
  [PlatformEventType.TIMETABLE_REQUESTED]: TimetableRequestedPayloadSchema,
  [PlatformEventType.TIMETABLE_PUBLISHED]: TimetablePublishedPayloadSchema,
  [PlatformEventType.EXAM_GENERATED]: ExamGeneratedPayloadSchema,
  [PlatformEventType.PA_OBSERVATION_CREATED]: PAObservationCreatedPayloadSchema,
};

export function validatePlatformEvent(event: PlatformEventEnvelope): { valid: boolean; error?: string } {
  const schema = EventSchemaMap[event.eventType];
  if (!schema) {
    return { valid: false, error: `Unknown event type: ${event.eventType}` };
  }
  const result = schema.safeParse(event.payload);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true };
}
