/**
 * Master Architecture Blueprint Domain Data Model Specification
 * Next-Gen Enterprise Scheduling Platform Types
 */

export interface TimeSlot {
  id: string;
  dayOfWeek: number;       // 1 (Mon) - 7 (Sun)
  periodIndex: number;     // คาบที่ 1, 2, 3...
  startTime: string;       // "08:30"
  endTime: string;         // "09:20"
  isAcademicSlot: boolean; // เป็นคาบวิชาการหรือไม่
}

export type ScheduleBlockType = 
  | "ACADEMIC_SUBJECT" // วิชาเรียน
  | "LUNCH"            // พักเที่ยง
  | "ASSEMBLY"         // เข้าแถว/สวดมนต์
  | "SCOUT"            // ลูกเสือ
  | "CLUB"             // ชุมนุม
  | "HOMEROOM"         // โฮมรูม
  | "EXAM"             // สอบ
  | "SPECIAL_EVENT";   // กิจกรรมพิเศษ

export interface ScheduleBlock {
  id: string;
  type: ScheduleBlockType;
  title: string;
  timeSlotId?: string;     // assigned TimeSlot ID
  dayOfWeek?: number;
  periodIndex?: number;
  
  // Scoping & Filtering
  targetGradeIds?: string[];     // เช่น ม.1 - ม.3
  targetClassroomIds?: string[]; // เช่น ม.1/1
  
  // Resource Assignments
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  teacherIds?: string[];
  teacherNames?: string[];
  roomId?: string;
  roomName?: string;
  
  // Lock & Freeze Controls (สำหรับ Incremental Solving)
  isLocked: boolean;  // ปักหมุดโดยผู้ใช้
  isFrozen: boolean;  // Freeze สถานะหลังเปิดเทอม
}

export type ConstraintSeverity = "HARD" | "CRITICAL_SOFT" | "SOFT";

export interface ConstraintDefinition {
  code: string;       // e.g., "TEACHER_NO_OVERLAP"
  name: string;
  description: string;
  category: "TEACHER" | "ROOM" | "STUDENT" | "ACADEMIC";
  severity: ConstraintSeverity;
  defaultWeight: number; // 1 - 10000
  isEnabled: boolean;
  customParameters?: Record<string, unknown>;
}

export interface ConstraintEvaluationContext {
  timeSlots: TimeSlot[];
  blocks: ScheduleBlock[];
  customParameters?: Record<string, unknown>;
}

export interface ConstraintViolation {
  constraintCode: string;
  severity: ConstraintSeverity;
  penaltyScore: number;
  message: string;
  affectedBlockIds: string[];
  entityDetails?: { teacherId?: string; classroomId?: string; timeSlotId?: string };
}

export interface IConstraintPlugin {
  readonly code: string;
  readonly name: string;
  readonly category: "TEACHER" | "ROOM" | "STUDENT" | "ACADEMIC";
  readonly defaultSeverity: ConstraintSeverity;
  readonly defaultWeight: number;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[];
}

export type CancellationToken = {
  isCancelled: boolean;
};

export type ProgressCallback = (percent: number, currentPhase: string) => void;

export interface SchedulingOptions {
  maxExecutionTimeSeconds: number;
  cancellationToken?: CancellationToken;
  onProgress?: ProgressCallback;
  dirtyTeacherIds?: string[]; // สำหรับ Localized Incremental Solving
  objectiveWeightsOverride?: Record<string, number>;
}

export interface ObjectiveScore {
  totalScore: number;            // 0 - 100%
  hardViolationsCount: number;   // ต้องเป็น 0 เท่านั้นถึงจะใช้ได้จริง
  softPenaltyTotal: number;
  
  categoryScores: {
    teacherSatisfaction: number; // 0 - 100%
    roomUtilization: number;     // 0 - 100%
    workloadBalance: number;     // 0 - 100%
    gapMinimization: number;     // 0 - 100%
  };
}

export interface DecisionTrace {
  subjectCode?: string;
  blockId?: string;
  action: "MOVED" | "ASSIGNED" | "UNLOCKED" | "RETAINED";
  reason: string;
  scoreDelta: number;
}

export interface ExplainabilityReport {
  overallSummary: string;
  hardConstraintStatus: "PASS" | "FAIL";
  violations: ConstraintViolation[];
  explanations: DecisionTrace[];
  suggestions: {
    priority: "HIGH" | "MEDIUM" | "LOW";
    suggestion: string;
    potentialScoreGain: number;
  }[];
}

export interface EnterpriseSchedulingResult {
  scenarioId: string;
  blocks: ScheduleBlock[];
  score: ObjectiveScore;
  explainabilityReport: ExplainabilityReport;
  executionTimeMs: number;
  solverEngineName: string; // e.g. "TypeScript Local Search Solver (Phase 1)"
}

export interface ISchedulingEngine {
  readonly engineName: string;

  solve(
    timeSlots: TimeSlot[],
    blocks: ScheduleBlock[],
    constraints: ConstraintDefinition[],
    options: SchedulingOptions
  ): Promise<EnterpriseSchedulingResult>;
}

export type JobStatus = "DRAFT" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface SchedulingJob {
  jobId: string;
  scenarioId: string;
  status: JobStatus;
  progressPercent: number;
  currentPhase: string;
  result?: EnterpriseSchedulingResult;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
