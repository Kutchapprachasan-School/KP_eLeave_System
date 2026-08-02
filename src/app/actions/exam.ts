"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ConfigureExamPeriodInput = {
  academicYear: number;
  term: number;
  examType: "MIDTERM" | "FINAL" | "SPECIAL";
  title: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  desksPerRoom?: number;
};

export type CreateExamSlotInput = {
  examPeriodId: string;
  subjectCode: string;
  subjectName: string;
  gradeLevel: string;
  examDate: string; // ISO string
  startTime: string;
  endTime: string;
  durationMins?: number;
};

export async function configureExamPeriodAction(data: ConfigureExamPeriodInput) {
  if (!data.title || !data.academicYear || !data.term) {
    throw new Error("Missing required exam period configurations");
  }

  // Deactivate existing active periods for same year/term/type
  await prisma.examPeriod.updateMany({
    where: {
      academicYear: data.academicYear,
      term: data.term,
      examType: data.examType
    },
    data: { isActive: false }
  });

  const period = await prisma.examPeriod.create({
    data: {
      academicYear: data.academicYear,
      term: data.term,
      examType: data.examType,
      title: data.title,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      desksPerRoom: data.desksPerRoom || 30,
      isActive: true
    }
  });

  revalidatePath("/academic/settings");
  revalidatePath("/academic/exam");
  return period;
}

export async function getActiveExamPeriodAction(academicYear: number, term: number) {
  return await prisma.examPeriod.findFirst({
    where: { academicYear, term, isActive: true },
    include: {
      examSlots: {
        include: { proctors: true }
      }
    }
  });
}

export async function createExamSlotAction(data: CreateExamSlotInput) {
  const slot = await prisma.examSubjectSlot.create({
    data: {
      examPeriodId: data.examPeriodId,
      subjectCode: data.subjectCode,
      subjectName: data.subjectName,
      gradeLevel: data.gradeLevel,
      examDate: new Date(data.examDate),
      startTime: data.startTime,
      endTime: data.endTime,
      durationMins: data.durationMins || 90
    }
  });

  revalidatePath("/academic/exam");
  return slot;
}

export async function assignExamProctorsAction(
  slotId: string,
  assignments: { teacherId: string; teacherName: string; roomId: string; roomName: string; role?: string }[]
) {
  await prisma.examProctorAssignment.deleteMany({
    where: { slotId }
  });

  const created = await prisma.examProctorAssignment.createMany({
    data: assignments.map(a => ({
      slotId,
      teacherId: a.teacherId,
      teacherName: a.teacherName,
      roomId: a.roomId,
      roomName: a.roomName,
      role: a.role || "MAIN_PROCTOR"
    }))
  });

  revalidatePath("/academic/exam");
  return created;
}
