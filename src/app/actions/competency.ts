"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type SetPaTargetConfigInput = {
  academicYear: number;
  targetPdHours: number;
  competencyMaxScore?: number;
  description?: string;
};

export type SubmitPaAgreementInput = {
  academicYear: number;
  teacherId: string;
  teacherName: string;
  departmentId: string;
  agreementTitle: string;
};

export type LogPdHoursInput = {
  teacherId: string;
  academicYear: number;
  topic: string;
  organizer: string;
  hours: number;
  completedDate: string; // ISO string
  certificateUrl?: string;
};

export async function setPaTargetConfigAction(data: SetPaTargetConfigInput) {
  const config = await prisma.paTargetConfig.upsert({
    where: { academicYear: data.academicYear },
    update: {
      targetPdHours: data.targetPdHours,
      competencyMaxScore: data.competencyMaxScore || 5,
      description: data.description
    },
    create: {
      academicYear: data.academicYear,
      targetPdHours: data.targetPdHours,
      competencyMaxScore: data.competencyMaxScore || 5,
      description: data.description
    }
  });

  revalidatePath("/academic/settings");
  revalidatePath("/academic/competency");
  return config;
}

export async function getPaTargetConfigAction(academicYear: number) {
  return await prisma.paTargetConfig.findUnique({
    where: { academicYear }
  });
}

export async function submitPaAgreementAction(data: SubmitPaAgreementInput) {
  const agreement = await prisma.paAgreement.upsert({
    where: {
      academicYear_teacherId: {
        academicYear: data.academicYear,
        teacherId: data.teacherId
      }
    },
    update: {
      teacherName: data.teacherName,
      departmentId: data.departmentId,
      agreementTitle: data.agreementTitle,
      status: "SUBMITTED"
    },
    create: {
      academicYear: data.academicYear,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      departmentId: data.departmentId,
      agreementTitle: data.agreementTitle,
      status: "SUBMITTED"
    }
  });

  revalidatePath("/academic/competency");
  return agreement;
}

export async function logPdHoursAction(data: LogPdHoursInput) {
  const pdLog = await prisma.pdHourLog.create({
    data: {
      teacherId: data.teacherId,
      academicYear: data.academicYear,
      topic: data.topic,
      organizer: data.organizer,
      hours: data.hours,
      completedDate: new Date(data.completedDate),
      certificateUrl: data.certificateUrl,
      isApproved: true
    }
  });

  revalidatePath("/academic/competency");
  return pdLog;
}

export async function getTeacherPdSummaryAction(teacherId: string, academicYear: number) {
  const logs = await prisma.pdHourLog.findMany({
    where: { teacherId, academicYear, isApproved: true }
  });

  const totalHours = logs.reduce((acc, curr) => acc + curr.hours, 0);
  const targetConfig = await getPaTargetConfigAction(academicYear);
  const targetHours = targetConfig?.targetPdHours || 20;

  return {
    totalHours,
    targetHours,
    isTargetMet: totalHours >= targetHours,
    logs
  };
}
