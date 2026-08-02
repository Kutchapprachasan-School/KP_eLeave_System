/**
 * School Resource Orchestration Platform (SROP / School OS) Types
 * Strict Type Definitions for SROP Foundation Infrastructure Layer
 */

export type TeacherEventType = 
  | "LEAVE_APPROVED" 
  | "TIMETABLE_TEACHING" 
  | "SUPERVISION_SESSION" 
  | "SUBSTITUTE_DUTY" 
  | "MEETING" 
  | "TRAINING" 
  | "OTHER_DUTY";

export interface TeacherTimelineEvent {
  eventId: string;
  teacherId: string;
  eventType: TeacherEventType;
  title: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  sourceModule: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface TeacherCapacityIndex {
  teacherId: string;
  weeklyTeachingHours: number;
  meetingHours: number;
  committeeHours: number;
  substituteHours: number;
  homeroomHours: number;
  counselingHours: number;
  otherDutyHours: number;
  totalDutyHours: number;
  maxWeeklyCapacityHours: number;
  remainingCapacityPercent: number;
}

export type ResourceType = "ROOM" | "TEACHER" | "EQUIPMENT" | "VEHICLE" | "LAB";

export interface SchoolResource {
  resourceId: string;
  type: ResourceType;
  name: string;
  capacity?: number;
  location?: string;
  isAvailable: boolean;
}

export interface ResourceReservation {
  reservationId: string;
  resourceId: string;
  consumerModule: string;
  reservedByUserId: string;
  startTime: string;
  endTime: string;
}

export type NotificationChannel = "LINE" | "PUSH" | "EMAIL" | "SMS";

export interface NotificationPayload {
  notificationId: string;
  recipientId: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: "HIGH" | "MEDIUM" | "LOW";
  retryCount: number;
}
