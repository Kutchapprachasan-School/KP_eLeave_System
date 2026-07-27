import { SupervisionStatus, SupervisionType } from "@prisma/client";

export interface SupervisionDomainSession {
  id: string;
  schoolId: string;
  academicYear: number;
  term: number;
  subjectCode: string;
  subjectName: string;
  gradeLevel: string;
  departmentGroup: string;
  dayOfWeek: number;
  periodNumber: number;
  scheduledDate: Date;
  teacherId: string;
  teacherName: string;
  supervisorId: string;
  supervisorName: string;
  type: SupervisionType;
  lessonPlanUrl?: string | null;
  videoUrl?: string | null;
  totalScore?: number | null;
  status: SupervisionStatus;
  createdAt: Date;
  updatedAt: Date;
}
