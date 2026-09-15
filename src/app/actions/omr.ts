"use server";

import { prisma } from "../../lib/db.ts";
import crypto from "crypto";
import { ExamItemStatus, SubmissionSyncStatus, RegradeJobStatus } from "@prisma/client";
import { ensureStandardTemplatesAction } from "../../lib/services/omrTemplateService.ts";
import { RecycleBinService } from "../../services/recycle-bin/recycle-bin.service.ts";

function safeRevalidatePath(path: string) {
  try {
    const { revalidatePath } = require("next/cache");
    revalidatePath(path);
  } catch {
    // No-op during isolated unit testing
  }
}

export type SubjectiveItemInput = {
  itemNo: number;
  title: string;
  maxScore: number;
  rubricDetail?: string;
};

export type CreateExamPaperInput = {
  subjectCode: string;
  subjectName: string;
  academicYear: number;
  term: number;
  gradeLevel: string;
  title: string;
  templateCode?: string;
  totalItems?: number;
  maxScore: number;
  passScore: number;
  createdById: string;
  subjectiveItems?: SubjectiveItemInput[];
};

export type UpdateExamPaperInput = {
  subjectCode?: string;
  subjectName?: string;
  academicYear?: number;
  term?: number;
  gradeLevel?: string;
  title?: string;
  maxScore?: number;
  passScore?: number;
  subjectiveItems?: SubjectiveItemInput[];
};

export type AnswerKeyItemInput = {
  itemNo: number;
  correctChoices: string[]; // ["A"], ["B", "C"]
  points?: number;
  penaltyPoints?: number;
};

export type ConfigureAnswerKeyInput = {
  examPaperId: string;
  versionCode: string; // "01", "02", "03", "04"
  items: AnswerKeyItemInput[];
};

export type IngestItemInput = {
  itemNo: number;
  detectedChoices: string[];
  fillRatios: Record<string, number>;
  confidenceScore: number;
};

export type IngestSubmissionInput = {
  clientScanId: string;
  examPaperId: string;
  studentId: string;
  studentName?: string;
  classroom?: string;
  seatNo?: number;
  versionCode: string;
  attemptNo?: number;
  scannedImageKey?: string;
  scannedByUserId: string;
  items: IngestItemInput[];
};

export interface UserContext {
  userId: string;
  userRole?: string;
}

/**
 * 1. Create ExamPaper with flexible item counts (1-50) and normalized Subjective items
 */
export async function createExamPaperAction(data: CreateExamPaperInput) {
  await ensureStandardTemplatesAction();

  const totalItems = data.totalItems || 50;
  if (totalItems < 1 || totalItems > 50) {
    throw new Error("จำนวนข้อสอบปรนัยต้องอยู่ระหว่าง 1 ถึง 50 ข้อ");
  }

  const templateCode = data.templateCode || (totalItems <= 20 ? "KP-OMR-A4-20" : "KP-OMR-A4-50");
  const template = await prisma.examTemplate.findFirst({
    where: { code: templateCode, isDeprecated: false },
    orderBy: { version: "desc" }
  });

  if (!template) {
    throw new Error(`ไม่พบแม่แบบกระดาษคำตอบรหัส ${templateCode}`);
  }

  const subjectiveItems = data.subjectiveItems || [];
  let subjectiveMaxScore = 0;
  for (const item of subjectiveItems) {
    if (item.maxScore <= 0) {
      throw new Error(`คะแนนเต็มข้ออัตนัยที่ ${item.itemNo} ต้องมากกว่า 0`);
    }
    subjectiveMaxScore += Number(item.maxScore);
  }

  const paper = await prisma.$transaction(async (tx) => {
    const createdPaper = await tx.examPaper.create({
      data: {
        subjectCode: data.subjectCode,
        subjectName: data.subjectName,
        academicYear: data.academicYear,
        term: data.term,
        gradeLevel: data.gradeLevel,
        title: data.title,
        templateId: template.id,
        totalItems,
        maxScore: data.maxScore,
        passScore: data.passScore,
        totalSubjectiveItems: subjectiveItems.length,
        subjectiveMaxScore,
        createdById: data.createdById
      }
    });

    if (subjectiveItems.length > 0) {
      await tx.examSubjectiveItem.createMany({
        data: subjectiveItems.map((item, idx) => ({
          examPaperId: createdPaper.id,
          itemNo: item.itemNo || (idx + 1),
          title: item.title,
          maxScore: item.maxScore,
          rubricDetail: item.rubricDetail || null
        }))
      });
    }

    return createdPaper;
  });

  safeRevalidatePath("/academic/exam");
  return paper;
}

/**
 * 2. Update ExamPaper metadata and subjective items
 */
export async function updateExamPaperAction(
  paperId: string,
  data: UpdateExamPaperInput,
  userContext: UserContext
) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId }
  });

  if (!paper) {
    throw new Error("ไม่พบชุดข้อสอบ");
  }

  const isAdmin = userContext.userRole === "ADMIN" || userContext.userRole === "SUPERADMIN";
  if (!isAdmin && paper.createdById !== userContext.userId) {
    throw new Error("ท่านไม่มีสิทธิ์แก้ไขชุดข้อสอบของผู้อื่น");
  }

  const subjectiveItems = data.subjectiveItems;
  let subjectiveMaxScore: number | undefined = undefined;
  if (subjectiveItems !== undefined) {
    subjectiveMaxScore = 0;
    for (const item of subjectiveItems) {
      if (item.maxScore <= 0) {
        throw new Error(`คะแนนเต็มข้ออัตนัยที่ ${item.itemNo} ต้องมากกว่า 0`);
      }
      subjectiveMaxScore += Number(item.maxScore);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const paperUpdateData: any = {};
    if (data.subjectCode !== undefined) paperUpdateData.subjectCode = data.subjectCode;
    if (data.subjectName !== undefined) paperUpdateData.subjectName = data.subjectName;
    if (data.academicYear !== undefined) paperUpdateData.academicYear = data.academicYear;
    if (data.term !== undefined) paperUpdateData.term = data.term;
    if (data.gradeLevel !== undefined) paperUpdateData.gradeLevel = data.gradeLevel;
    if (data.title !== undefined) paperUpdateData.title = data.title;
    if (data.maxScore !== undefined) paperUpdateData.maxScore = data.maxScore;
    if (data.passScore !== undefined) paperUpdateData.passScore = data.passScore;

    if (subjectiveItems !== undefined) {
      paperUpdateData.totalSubjectiveItems = subjectiveItems.length;
      paperUpdateData.subjectiveMaxScore = subjectiveMaxScore;

      // Replace subjective items
      await tx.examSubjectiveItem.deleteMany({
        where: { examPaperId: paperId }
      });

      if (subjectiveItems.length > 0) {
        await tx.examSubjectiveItem.createMany({
          data: subjectiveItems.map((item, idx) => ({
            examPaperId: paperId,
            itemNo: item.itemNo || (idx + 1),
            title: item.title,
            maxScore: item.maxScore,
            rubricDetail: item.rubricDetail || null
          }))
        });
      }
    }

    const res = await tx.examPaper.update({
      where: { id: paperId },
      data: paperUpdateData
    });

    return res;
  });

  safeRevalidatePath("/academic/exam");
  return updated;
}

/**
 * 3. Configure/Update Answer Key with strict DB integrity validation
 */
export async function configureAnswerKeyAction(data: ConfigureAnswerKeyInput) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: data.examPaperId }
  });

  if (!paper) {
    throw new Error("ไม่พบชุดข้อสอบที่ระบุ");
  }

  if (data.items.length !== paper.totalItems) {
    throw new Error(`จำนวนเฉลย (${data.items.length} ข้อ) ต้องตรงกับจำนวนข้อสอบทั้งหมด (${paper.totalItems} ข้อ)`);
  }

  const sortedItems = [...data.items].sort((a, b) => a.itemNo - b.itemNo);
  for (let idx = 0; idx < sortedItems.length; idx++) {
    const item = sortedItems[idx];
    const expectedNo = idx + 1;
    if (item.itemNo !== expectedNo) {
      throw new Error(`ข้อสอบต้องเรียงลำดับต่อเนื่อง 1 ถึง ${paper.totalItems} (พบข้อ ${item.itemNo} แทนที่ข้อ ${expectedNo})`);
    }
    if (!item.correctChoices || item.correctChoices.length === 0 || item.correctChoices.length > 5) {
      throw new Error(`ข้อ ${item.itemNo} ต้องมีตัวเลือกที่ถูกต้อง 1-5 ตัวเลือก`);
    }
    for (const c of item.correctChoices) {
      if (!["A", "B", "C", "D", "E"].includes(c)) {
        throw new Error(`ข้อ ${item.itemNo} ตัวเลือก ${c} ไม่ถูกต้อง (ต้องเป็น A, B, C, D หรือ E)`);
      }
    }
  }

  return await prisma.$transaction(async (tx) => {
    const answerKey = await tx.examAnswerKey.upsert({
      where: {
        examPaperId_versionCode: {
          examPaperId: data.examPaperId,
          versionCode: data.versionCode
        }
      },
      update: {},
      create: {
        examPaperId: data.examPaperId,
        versionCode: data.versionCode
      }
    });

    await tx.examAnswerKeyItem.deleteMany({
      where: { answerKeyId: answerKey.id }
    });

    await tx.examAnswerKeyItem.createMany({
      data: sortedItems.map(item => ({
        answerKeyId: answerKey.id,
        itemNo: item.itemNo,
        correctChoices: item.correctChoices,
        points: item.points || 1.0,
        penaltyPoints: item.penaltyPoints || 0.0
      }))
    });

    return answerKey;
  }, { maxWait: 10000, timeout: 20000 });
}

/**
 * 4. Update Answer Key with Version Snapshot (Decoupled Key Mutation)
 */
export async function updateAnswerKeyWithVersionAction(params: {
  examPaperId: string;
  versionCode: string;
  items: AnswerKeyItemInput[];
  changedById: string;
  reason?: string;
}) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: params.examPaperId }
  });

  if (!paper) {
    throw new Error("ไม่พบชุดข้อสอบ");
  }

  if (paper.createdById !== params.changedById) {
    const user = await prisma.user.findUnique({
      where: { id: params.changedById },
      select: { role: true }
    });
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
    if (!isAdmin) {
      throw new Error("ท่านไม่มีสิทธิ์แก้ไขเฉลยคำตอบของผู้อื่น");
    }
  }

  // 🛡️ Rev 8.3 Concurrency Guard: ห้ามแก้เฉลยซ้อนหากยังมี Re-grade Job ทำงานอยู่
  const activeJob = await prisma.examRegradeJob.findFirst({
    where: {
      examPaperId: params.examPaperId,
      status: { in: [RegradeJobStatus.PENDING, RegradeJobStatus.PROCESSING] }
    }
  });
  if (activeJob) {
    throw new Error("ไม่สามารถแก้ไขเฉลยได้ เนื่องจากกำลังอยู่ระหว่างการตรวจซ้ำ (Re-grade Job กำลังทำงาน) กรุณารอให้งานเสร็จสิ้นก่อน");
  }

  // 1. Configure the answer key
  await configureAnswerKeyAction({
    examPaperId: params.examPaperId,
    versionCode: params.versionCode,
    items: params.items
  });

  // 2. Create immutable Version Snapshot
  const latestVersion = await prisma.examAnswerKeyVersion.findFirst({
    where: { examPaperId: params.examPaperId },
    orderBy: { version: "desc" }
  });
  const nextVersion = (latestVersion?.version || 0) + 1;

  const versionSnapshot = await prisma.examAnswerKeyVersion.create({
    data: {
      examPaperId: params.examPaperId,
      version: nextVersion,
      keyPayload: params.items as any,
      totalItems: paper.totalItems,
      maxScore: paper.maxScore,
      changedById: params.changedById,
      reason: params.reason || `ปรับปรุงเฉลยเวอร์ชัน ${nextVersion}`
    }
  });

  // 3. Log Audit trail
  await prisma.examAuditLog.create({
    data: {
      examPaperIdSnapshot: params.examPaperId,
      action: "ANSWER_KEY_MUTATION",
      performedByUserId: params.changedById,
      details: {
        version: nextVersion,
        versionCode: params.versionCode,
        totalItems: paper.totalItems,
        reason: params.reason || null
      }
    }
  });

  // 4. Automatically create Regrade Job with rigid snapshot boundary tuple
  const regradeJob = await createRegradeJobAction(
    params.examPaperId,
    versionSnapshot.id,
    params.changedById
  );

  return {
    success: true,
    version: nextVersion,
    snapshotId: versionSnapshot.id,
    regradeJobId: regradeJob.id,
    affectedSubmissionsCount: regradeJob.totalSubmissions
  };
}

/**
 * 5.1 Create Regrade Job with Rigid Snapshot Boundary Tuple
 */
export async function createRegradeJobAction(
  examPaperId: string,
  targetKeyVersionId: string,
  userId?: string
) {
  // Concurrency Guard: ห้ามสร้าง Job ซ้ำถ้ามี Job ค้างอยู่
  const activeJob = await prisma.examRegradeJob.findFirst({
    where: {
      examPaperId,
      status: { in: [RegradeJobStatus.PENDING, RegradeJobStatus.PROCESSING] }
    }
  });

  if (activeJob) {
    throw new Error("AN_ACTIVE_REGRADE_JOB_IS_ALREADY_IN_PROGRESS");
  }

  // Freeze dataset boundary tuple (createdAt, id) ของ Submission ตัวสุดท้าย
  const latestSubmission = await prisma.examSubmission.findFirst({
    where: { examPaperId, isLatestAttempt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true }
  });

  const snapshotEndCreatedAt = latestSubmission?.createdAt ?? null;
  const snapshotEndId = latestSubmission?.id ?? null;

  let totalSubmissions = 0;
  if (snapshotEndCreatedAt && snapshotEndId) {
    totalSubmissions = await prisma.examSubmission.count({
      where: {
        examPaperId,
        isLatestAttempt: true,
        OR: [
          { createdAt: { lt: snapshotEndCreatedAt } },
          { createdAt: snapshotEndCreatedAt, id: { lte: snapshotEndId } }
        ]
      }
    });
  }

  const isFinishedImmediately = totalSubmissions === 0;

  return await prisma.examRegradeJob.create({
    data: {
      examPaperId,
      targetKeyVersionId,
      status: isFinishedImmediately ? RegradeJobStatus.COMPLETED : RegradeJobStatus.PENDING,
      totalSubmissions,
      snapshotEndCreatedAt,
      snapshotEndId,
      completedAt: isFinishedImmediately ? new Date() : null,
      createdById: userId
    }
  });
}

/**
 * 5.2 Process Regrade Job Chunk with Row-Level Fenced Writes & Deterministic Boundary Completion
 */
export async function processRegradeJobChunkAction(jobId: string, workerToken?: string) {
  const currentToken = workerToken || crypto.randomUUID();

  // ATOMIC CLAIM / LEASE RENEWAL PHASE
  const claimResult: any[] = await prisma.$queryRaw`
    UPDATE "ExamRegradeJob"
    SET status = 'PROCESSING'::"RegradeJobStatus",
        "workerToken" = ${currentToken},
        "leaseExpiresAt" = NOW() + INTERVAL '2 minutes',
        "startedAt" = COALESCE("startedAt", NOW())
    WHERE id = ${jobId}
      AND (
        status = 'PENDING'::"RegradeJobStatus" OR
        (status = 'PROCESSING'::"RegradeJobStatus" AND ("leaseExpiresAt" < NOW() OR "workerToken" = ${currentToken}))
      )
    RETURNING *;
  `;

  if (!claimResult || claimResult.length === 0) {
    return { success: false, claimed: false, reason: "JOB_LOCKED_BY_ANOTHER_WORKER_OR_LEASE_ACTIVE" };
  }

  const job = claimResult[0];

  if (job.totalSubmissions === 0 || !job.snapshotEndCreatedAt) {
    await prisma.examRegradeJob.update({
      where: { id: jobId },
      data: { status: RegradeJobStatus.COMPLETED, completedAt: new Date() }
    });
    return { success: true, completed: true, processedCount: 0, workerToken: currentToken };
  }

  // QUERY SUBMISSIONS WITH RIGID CLOSED SNAPSHOT TUPLE & MONOTONIC CURSOR
  const submissions: any[] = await prisma.$queryRaw`
    SELECT s.id, s."createdAt", s."studentId", s."rawScore", s."subjectiveScore", s."versionCode"
    FROM "ExamSubmission" s
    WHERE s."examPaperId" = ${job.examPaperId}
      AND s."isLatestAttempt" = true
      AND (
        (s."createdAt" < ${job.snapshotEndCreatedAt}::timestamp) OR
        (s."createdAt" = ${job.snapshotEndCreatedAt}::timestamp AND s.id <= ${job.snapshotEndId})
      )
      AND (
        ${job.cursorCreatedAt}::timestamp IS NULL OR
        (s."createdAt" > ${job.cursorCreatedAt}::timestamp) OR
        (s."createdAt" = ${job.cursorCreatedAt}::timestamp AND s.id > ${job.cursorId})
      )
    ORDER BY s."createdAt" ASC, s.id ASC
    LIMIT ${job.batchSize};
  `;

  const isFinished = submissions.length < job.batchSize;

  if (submissions.length === 0) {
    await prisma.examRegradeJob.update({
      where: { id: jobId },
      data: { status: RegradeJobStatus.COMPLETED, completedAt: new Date() }
    });
    return { success: true, completed: true, processedCount: 0, workerToken: currentToken };
  }

  const lastItem = submissions[submissions.length - 1];
  const newProcessedCount = job.processedSubmissions + submissions.length;

  // Retrieve Target Key Version & Paper for calculation
  const keyVersion = await prisma.examAnswerKeyVersion.findUnique({
    where: { id: job.targetKeyVersionId },
    include: {
      examPaper: {
        include: {
          answerKeys: {
            include: { items: true }
          }
        }
      }
    }
  });

  if (!keyVersion) {
    throw new Error("Target ExamAnswerKeyVersion not found");
  }

  const paper = keyVersion.examPaper;
  const targetVersionNumber = keyVersion.version;

  // Fetch leaf item submissions for batch
  const subIds = submissions.map((s: any) => s.id);
  const leafItems = await prisma.examItemSubmission.findMany({
    where: { submissionId: { in: subIds } }
  });
  const leafBySubId = new Map<string, typeof leafItems>();
  for (const item of leafItems) {
    const list = leafBySubId.get(item.submissionId) || [];
    list.push(item);
    leafBySubId.set(item.submissionId, list);
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const sub of submissions) {
        const answerKey = paper.answerKeys.find(k => k.versionCode === sub.versionCode);
        const keyMap = new Map<number, { correctChoices: string[]; points: number; penaltyPoints: number }>();
        if (answerKey) {
          for (const kItem of answerKey.items) {
            keyMap.set(kItem.itemNo, {
              correctChoices: kItem.correctChoices,
              points: Number(kItem.points),
              penaltyPoints: Number(kItem.penaltyPoints)
            });
          }
        }

        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalBlanks = 0;
        let totalMultiple = 0;
        let rawScore = 0;
        let penaltyScore = 0;

        const subLeaves = leafBySubId.get(sub.id) || [];
        const leafUpdates = [];

        for (const item of subLeaves) {
          const key = keyMap.get(item.itemNo);
          const choice = item.overrideChoice || item.effectiveChoice;
          let isCorrect = false;
          let scoreEarned = 0;
          let status = item.status;

          if (!choice) {
            status = ExamItemStatus.BLANK;
            totalBlanks++;
          } else if (key) {
            if (key.correctChoices.includes(choice)) {
              status = ExamItemStatus.CORRECT;
              scoreEarned = key.points;
              isCorrect = true;
              totalCorrect++;
              rawScore += key.points;
            } else {
              status = ExamItemStatus.INCORRECT;
              totalIncorrect++;
              penaltyScore += key.penaltyPoints;
            }
          }

          if (item.isOverridden) {
            status = ExamItemStatus.MANUALLY_OVERRIDDEN;
          }

          leafUpdates.push(
            tx.examItemSubmission.update({
              where: { id: item.id },
              data: {
                effectiveChoice: choice,
                isCorrect,
                scoreEarned,
                status
              }
            })
          );
        }
        await Promise.all(leafUpdates);

        const calculatedRaw = Math.min(Number(paper.maxScore), Math.max(0, rawScore - penaltyScore));
        const subjScore = Number(sub.subjectiveScore || 0);
        const totalMax = Number(paper.maxScore) + Number(paper.subjectiveMaxScore || 0);
        const netScore = Math.min(totalMax, Math.max(0, calculatedRaw + subjScore));

        // 🔴 FIX #1: Row-Level Fenced Write บน ExamSubmission แต่ละรายการ
        const fencedSubUpdate: any[] = await tx.$queryRaw`
          UPDATE "ExamSubmission" s
          SET "rawScore" = ${calculatedRaw},
              "netScore" = ${netScore},
              "totalCorrect" = ${totalCorrect},
              "totalIncorrect" = ${totalIncorrect},
              "totalBlanks" = ${totalBlanks},
              "totalMultiple" = ${totalMultiple},
              "gradingVersion" = ${targetVersionNumber},
              "gradingVersionId" = ${job.targetKeyVersionId},
              "updatedAt" = NOW()
          WHERE s.id = ${sub.id}
            AND EXISTS (
              SELECT 1 FROM "ExamRegradeJob" j
              WHERE j.id = ${jobId}
                AND j."workerToken" = ${currentToken}
                AND j."leaseExpiresAt" >= NOW()
            )
          RETURNING s.id;
        `;

        if (!fencedSubUpdate || fencedSubUpdate.length === 0) {
          throw new Error("SUBMISSION_FENCED_WRITE_FAILED_LEASE_EXPIRED");
        }
      }

      // Fenced Write ขั้นตอนสุดท้ายบน ExamRegradeJob
      const fencedJobUpdate: any[] = await tx.$queryRaw`
        UPDATE "ExamRegradeJob"
        SET "processedSubmissions" = ${newProcessedCount},
            "cursorCreatedAt" = ${lastItem.createdAt},
            "cursorId" = ${lastItem.id},
            "leaseExpiresAt" = NOW() + INTERVAL '2 minutes',
            "status" = CASE WHEN ${isFinished} THEN 'COMPLETED'::"RegradeJobStatus" ELSE 'PROCESSING'::"RegradeJobStatus" END,
            "completedAt" = CASE WHEN ${isFinished} THEN NOW() ELSE NULL END
        WHERE id = ${jobId} 
          AND "workerToken" = ${currentToken} 
          AND "leaseExpiresAt" >= NOW()
        RETURNING id;
      `;

      if (!fencedJobUpdate || fencedJobUpdate.length === 0) {
        throw new Error("JOB_FENCED_WRITE_FAILED_LEASE_EXPIRED");
      }
    }, { maxWait: 15000, timeout: 30000 });

    return {
      success: true,
      completed: isFinished,
      processedCount: submissions.length,
      workerToken: currentToken
    };
  } catch (error: any) {
    if (
      error.message === "SUBMISSION_FENCED_WRITE_FAILED_LEASE_EXPIRED" ||
      error.message === "JOB_FENCED_WRITE_FAILED_LEASE_EXPIRED"
    ) {
      return { success: false, claimed: false, reason: "WORKER_LEASE_EXPIRED_TRANSACTION_ROLLED_BACK" };
    }
    throw error;
  }
}

/**
 * 5.3 Backward-compatible Chunked Re-grade Action
 */
export async function regradeSubmissionsChunkAction(params: {
  examPaperId: string;
  version: number;
  batchSize?: number;
  offset?: number;
  performedByUserId: string;
}) {
  // Find or create active regrade job for this paper
  const keyVersion = await prisma.examAnswerKeyVersion.findFirst({
    where: { examPaperId: params.examPaperId, version: params.version }
  });

  if (!keyVersion) {
    throw new Error("ไม่พบเวอร์ชันเฉลยที่ระบุ");
  }

  let job = await prisma.examRegradeJob.findFirst({
    where: {
      examPaperId: params.examPaperId,
      targetKeyVersionId: keyVersion.id,
      status: { in: [RegradeJobStatus.PENDING, RegradeJobStatus.PROCESSING] }
    }
  });

  if (!job) {
    job = await createRegradeJobAction(params.examPaperId, keyVersion.id, params.performedByUserId);
  }

  const result = await processRegradeJobChunkAction(job.id);
  return {
    processedCount: result.processedCount || 0,
    hasMore: !result.completed,
    nextOffset: (params.offset || 0) + (result.processedCount || 0)
  };
}

/**
 * 6. Update Subjective Scores for a Submission (Strict Mathematical Bounds)
 */
export async function updateSubjectiveScoreAction(params: {
  submissionId: string;
  subjectiveScores: Record<string, number>;
  performedByUserId: string;
}) {
  const submission = await prisma.examSubmission.findUnique({
    where: { id: params.submissionId },
    include: {
      examPaper: {
        include: {
          subjectiveItems: true
        }
      }
    }
  });

  if (!submission) {
    throw new Error("ไม่พบผลการตรวจข้อสอบ");
  }

  const paper = submission.examPaper;
  const subjectiveItems = paper.subjectiveItems;

  let totalSubjective = 0;
  const validatedScores: Record<string, number> = {};

  for (const item of subjectiveItems) {
    const key = String(item.itemNo);
    const scoreVal = params.subjectiveScores[key] !== undefined ? Number(params.subjectiveScores[key]) : 0;
    const max = Number(item.maxScore);

    if (isNaN(scoreVal) || scoreVal < 0) {
      throw new Error(`คะแนนข้อที่ ${item.itemNo} ต้องไม่ติดลบ`);
    }
    if (scoreVal > max) {
      throw new Error(`คะแนนข้อที่ ${item.itemNo} (${scoreVal}) ต้องไม่เกินคะแนนเต็ม (${max})`);
    }

    validatedScores[key] = scoreVal;
    totalSubjective += scoreVal;
  }

  const maxSubjAllowed = Number(paper.subjectiveMaxScore || 0);
  if (totalSubjective > maxSubjAllowed) {
    throw new Error(`คะแนนอัตนัยรวม (${totalSubjective}) เกินคะแนนเต็มอัตนัยที่กำหนด (${maxSubjAllowed})`);
  }

  const raw = Number(submission.rawScore);
  const totalMax = Number(paper.maxScore) + maxSubjAllowed;
  const netScore = Math.min(totalMax, Math.max(0, raw + totalSubjective));

  const updated = await prisma.examSubmission.update({
    where: { id: params.submissionId },
    data: {
      subjectiveScore: totalSubjective,
      subjectiveScores: validatedScores,
      netScore
    }
  });

  await prisma.examAuditLog.create({
    data: {
      examPaperIdSnapshot: paper.id,
      submissionIdSnapshot: submission.id,
      action: "SUBJECTIVE_SCORE_UPDATE",
      performedByUserId: params.performedByUserId,
      details: {
        previousSubjectiveScore: Number(submission.subjectiveScore || 0),
        newSubjectiveScore: totalSubjective,
        previousNetScore: Number(submission.netScore),
        newNetScore: netScore,
        scores: validatedScores
      }
    }
  });

  return updated;
}

/**
 * 7. Soft Delete Exam Paper (via RecycleBinService)
 */
export async function softDeleteExamPaperAction(
  paperId: string,
  userContext: { userId: string; userRole: string },
  reason?: string
) {
  const result = await RecycleBinService.softDelete({
    type: "EXAM_PAPER",
    id: paperId,
    reason,
    user: userContext
  });

  safeRevalidatePath("/academic/exam");
  return result;
}

/**
 * 8. Restore Exam Paper (via RecycleBinService with originalTitle preservation)
 */
export async function restoreExamPaperAction(
  paperId: string,
  userContext: { userId: string; userRole: string }
) {
  const result = await RecycleBinService.restore({
    type: "EXAM_PAPER",
    id: paperId,
    user: userContext
  });

  safeRevalidatePath("/academic/exam");
  return result;
}

/**
 * 9. Query Exam Papers for Teacher / Admin Dashboard
 * 🛡️ Query-Level Answer Key Redaction: Admin query omits answerKeys completely.
 */
export async function listExamPapersAction(userContext?: UserContext) {
  const isAdmin = userContext?.userRole === "ADMIN" || userContext?.userRole === "SUPERADMIN";

  if (isAdmin) {
    // Admin query: Strictly OMIT answerKeys
    return await prisma.examPaper.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subjectCode: true,
        subjectName: true,
        academicYear: true,
        term: true,
        gradeLevel: true,
        title: true,
        totalItems: true,
        maxScore: true,
        passScore: true,
        totalSubjectiveItems: true,
        subjectiveMaxScore: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        template: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            printedSheets: true,
            submissions: true
          }
        }
      }
    });
  }

  // Teacher query: Scoped to self
  const teacherWhere: any = { isDeleted: false };
  if (userContext?.userId) {
    teacherWhere.createdById = userContext.userId;
  }

  return await prisma.examPaper.findMany({
    where: teacherWhere,
    orderBy: { createdAt: "desc" },
    include: {
      template: true,
      subjectiveItems: {
        orderBy: { itemNo: "asc" }
      },
      answerKeys: {
        select: {
          id: true,
          versionCode: true,
          _count: { select: { items: true } }
        }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: {
          printedSheets: true,
          submissions: true
        }
      }
    }
  });
}

/**
 * 10. Query single Exam Paper Details
 * 🛡️ Security Check: If requester is not creator, answerKeys are omitted.
 */
export async function getExamPaperDetailsAction(paperId: string, userContext?: UserContext) {
  const base = await prisma.examPaper.findUnique({
    where: { id: paperId },
    select: { id: true, createdById: true }
  });
  if (!base) return null;

  const isOwner = userContext ? userContext.userId === base.createdById : true;

  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: {
      template: true,
      subjectiveItems: {
        orderBy: { itemNo: "asc" }
      },
      keyVersions: isOwner ? {
        orderBy: { version: "desc" },
        take: 5
      } : false,
      answerKeys: isOwner ? {
        include: { items: { orderBy: { itemNo: "asc" } } }
      } : false,
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      submissions: {
        where: { isLatestAttempt: true },
        orderBy: [{ classroom: "asc" }, { seatNo: "asc" }, { studentId: "asc" }],
        take: 50,
      },
      regradeJobs: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      _count: {
        select: { printedSheets: true, submissions: true }
      }
    }
  });

  if (!paper) return null;

  return {
    ...paper,
    answerKeys: (paper as any).answerKeys || [],
    keyVersions: (paper as any).keyVersions || [],
    regradeJobs: (paper as any).regradeJobs || []
  };
}

/**
 * 11. Query single Submission for Teacher Review Studio
 */
export async function getSubmissionDetailsAction(submissionId: string, userContext?: UserContext) {
  const submission = await prisma.examSubmission.findUnique({
    where: { id: submissionId },
    include: {
      examPaper: {
        include: {
          template: true,
          subjectiveItems: { orderBy: { itemNo: "asc" } },
          answerKeys: {
            include: { items: { orderBy: { itemNo: "asc" } } }
          }
        }
      },
      itemSubmissions: {
        orderBy: { itemNo: "asc" }
      },
      scannedByUser: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!submission) return null;

  if (userContext && userContext.userId !== submission.examPaper.createdById) {
    return {
      ...submission,
      examPaper: {
        ...submission.examPaper,
        answerKeys: []
      }
    };
  }

  return submission;
}

/**
 * 12. Ingest Exam Submission
 */
export async function ingestExamSubmissionAction(input: IngestSubmissionInput) {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${input.examPaperId} || ':' || ${input.studentId}, 0));
    `;

    const existing = await tx.examSubmission.findUnique({
      where: { clientScanId: input.clientScanId },
      include: { itemSubmissions: true }
    });
    if (existing) {
      return existing;
    }

    const attemptNo = input.attemptNo || 1;

    await tx.examSubmission.updateMany({
      where: {
        examPaperId: input.examPaperId,
        studentId: input.studentId,
        isLatestAttempt: true
      },
      data: { isLatestAttempt: false }
    });

    const totalConf = input.items.reduce((acc, curr) => acc + (curr.confidenceScore || 0), 0);
    const confidenceAvg = input.items.length > 0 ? totalConf / input.items.length : 1.0;
    const hasAnomalies = input.items.some(i => i.confidenceScore < 0.65 || i.detectedChoices.length > 1);

    const latestKeyVersion = await tx.examAnswerKeyVersion.findFirst({
      where: { examPaperId: input.examPaperId },
      orderBy: { version: "desc" }
    });

    const submission = await tx.examSubmission.create({
      data: {
        clientScanId: input.clientScanId,
        examPaperId: input.examPaperId,
        studentId: input.studentId,
        studentName: input.studentName,
        classroom: input.classroom,
        seatNo: input.seatNo,
        versionCode: input.versionCode || "01",
        attemptNo,
        isLatestAttempt: true,
        rawScore: 0,
        subjectiveScore: 0,
        netScore: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalBlanks: 0,
        totalMultiple: 0,
        gradingVersion: latestKeyVersion?.version || 1,
        gradingVersionId: latestKeyVersion?.id || null,
        confidenceAvg,
        hasAnomalies,
        isVerifiedByTeacher: false,
        scannedImageKey: input.scannedImageKey,
        syncStatus: SubmissionSyncStatus.SYNCED,
        scannedByUserId: input.scannedByUserId
      }
    });

    const answerKey = await tx.examAnswerKey.findFirst({
      where: {
        examPaperId: input.examPaperId,
        versionCode: input.versionCode || "01"
      },
      include: { items: true }
    });

    const keyMap = new Map<number, { correctChoices: string[]; points: number; penaltyPoints: number }>();
    if (answerKey) {
      for (const kItem of answerKey.items) {
        keyMap.set(kItem.itemNo, {
          correctChoices: kItem.correctChoices,
          points: Number(kItem.points),
          penaltyPoints: Number(kItem.penaltyPoints)
        });
      }
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalBlanks = 0;
    let totalMultiple = 0;
    let rawScore = 0;
    let penaltyScore = 0;

    const itemCreations = input.items.map(item => {
      const key = keyMap.get(item.itemNo);
      let status: ExamItemStatus = ExamItemStatus.INCORRECT;
      let scoreEarned = 0;
      let isCorrect = false;

      if (!item.detectedChoices || item.detectedChoices.length === 0) {
        status = ExamItemStatus.BLANK;
        totalBlanks++;
      } else if (item.detectedChoices.length > 1) {
        status = ExamItemStatus.MULTIPLE_MARKS;
        totalMultiple++;
      } else if (key) {
        const choice = item.detectedChoices[0];
        if (key.correctChoices.includes(choice)) {
          status = ExamItemStatus.CORRECT;
          scoreEarned = key.points;
          isCorrect = true;
          totalCorrect++;
          rawScore += key.points;
        } else {
          status = ExamItemStatus.INCORRECT;
          totalIncorrect++;
          penaltyScore += key.penaltyPoints;
        }
      }

      if (item.confidenceScore < 0.65 && status !== ExamItemStatus.MULTIPLE_MARKS) {
        status = ExamItemStatus.FLAGGED_FOR_REVIEW;
      }

      return {
        submissionId: submission.id,
        itemNo: item.itemNo,
        detectedChoices: item.detectedChoices,
        fillRatios: item.fillRatios,
        confidenceScore: item.confidenceScore,
        effectiveChoice: item.detectedChoices.length === 1 ? item.detectedChoices[0] : null,
        isCorrect,
        scoreEarned,
        status
      };
    });

    await tx.examItemSubmission.createMany({
      data: itemCreations
    });

    const calculatedRaw = Math.max(0, rawScore - penaltyScore);
    const netScore = calculatedRaw;

    const updated = await tx.examSubmission.update({
      where: { id: submission.id },
      data: {
        rawScore: calculatedRaw,
        netScore,
        totalCorrect,
        totalIncorrect,
        totalBlanks,
        totalMultiple
      },
      include: { itemSubmissions: true }
    });

    await tx.examAuditLog.create({
      data: {
        examPaperIdSnapshot: input.examPaperId,
        submissionIdSnapshot: submission.id,
        action: "SCAN_INGEST",
        performedByUserId: input.scannedByUserId,
        details: {
          clientScanId: input.clientScanId,
          studentId: input.studentId,
          netScore,
          totalCorrect,
          confidenceAvg
        }
      }
    });

    return updated;
  }, { maxWait: 10000, timeout: 20000 });
}

/**
 * 13. Recalculate Submission Scores from Leaf Items
 */
export async function recalculateSubmissionScoreAction(submissionId: string, performedByUserId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT id FROM "ExamSubmission" WHERE id = ${submissionId} FOR UPDATE;
    `;

    const submission = await tx.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        itemSubmissions: true,
        examPaper: {
          include: {
            answerKeys: {
              include: { items: true }
            }
          }
        }
      }
    });

    if (!submission) {
      throw new Error("ไม่พบรายการผลการตรวจ");
    }

    const answerKey = submission.examPaper.answerKeys.find(k => k.versionCode === submission.versionCode);
    const keyMap = new Map<number, { correctChoices: string[]; points: number; penaltyPoints: number }>();
    if (answerKey) {
      for (const kItem of answerKey.items) {
        keyMap.set(kItem.itemNo, {
          correctChoices: kItem.correctChoices,
          points: Number(kItem.points),
          penaltyPoints: Number(kItem.penaltyPoints)
        });
      }
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalBlanks = 0;
    let totalMultiple = 0;
    let rawScore = 0;
    let penaltyScore = 0;

    const itemUpdates = [];
    for (const item of submission.itemSubmissions) {
      const key = keyMap.get(item.itemNo);
      const choice = item.overrideChoice || item.effectiveChoice;
      let isCorrect = false;
      let scoreEarned = 0;
      let status = item.status;

      if (!choice) {
        status = ExamItemStatus.BLANK;
        totalBlanks++;
      } else if (key) {
        if (key.correctChoices.includes(choice)) {
          status = ExamItemStatus.CORRECT;
          scoreEarned = key.points;
          isCorrect = true;
          totalCorrect++;
          rawScore += key.points;
        } else {
          status = ExamItemStatus.INCORRECT;
          totalIncorrect++;
          penaltyScore += key.penaltyPoints;
        }
      }

      if (item.isOverridden) {
        status = ExamItemStatus.MANUALLY_OVERRIDDEN;
      }

      itemUpdates.push(
        tx.examItemSubmission.update({
          where: { id: item.id },
          data: {
            effectiveChoice: choice,
            isCorrect,
            scoreEarned,
            status
          }
        })
      );
    }
    await Promise.all(itemUpdates);

    const calculatedRaw = Math.min(Number(submission.examPaper.maxScore), Math.max(0, rawScore - penaltyScore));
    const subjScore = Number(submission.subjectiveScore || 0);
    const totalMax = Number(submission.examPaper.maxScore) + Number(submission.examPaper.subjectiveMaxScore || 0);
    const netScore = Math.min(totalMax, Math.max(0, calculatedRaw + subjScore));

    const updated = await tx.examSubmission.update({
      where: { id: submissionId },
      data: {
        rawScore: calculatedRaw,
        netScore,
        totalCorrect,
        totalIncorrect,
        totalBlanks,
        totalMultiple,
        gradingVersion: { increment: 1 }
      },
      include: { itemSubmissions: true }
    });

    await tx.examAuditLog.create({
      data: {
        examPaperIdSnapshot: submission.examPaperId,
        submissionIdSnapshot: submissionId,
        action: "RECALCULATE_SCORES",
        performedByUserId,
        details: {
          previousNetScore: Number(submission.netScore),
          newNetScore: netScore,
          newGradingVersion: updated.gradingVersion
        }
      }
    });

    return updated;
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * 14. Manual Override of an Item Answer by Teacher
 */
export async function updateItemManualOverrideAction(params: {
  submissionId: string;
  itemNo: number;
  overrideChoice: string | null;
  performedByUserId: string;
}) {
  const item = await prisma.examItemSubmission.findUnique({
    where: {
      submissionId_itemNo: {
        submissionId: params.submissionId,
        itemNo: params.itemNo
      }
    }
  });

  if (!item) {
    throw new Error(`ไม่พบข้อสอบที่ ${params.itemNo} ในใบคำตอบนี้`);
  }

  const oldChoice = item.overrideChoice || item.effectiveChoice;
  const isOverridden = params.overrideChoice !== null;

  await prisma.examItemSubmission.update({
    where: { id: item.id },
    data: {
      overrideChoice: params.overrideChoice,
      isOverridden,
      status: isOverridden ? ExamItemStatus.MANUALLY_OVERRIDDEN : item.status
    }
  });

  await prisma.examAuditLog.create({
    data: {
      examPaperIdSnapshot: (await prisma.examSubmission.findUnique({ where: { id: params.submissionId }, select: { examPaperId: true } }))?.examPaperId || "",
      submissionIdSnapshot: params.submissionId,
      action: "MANUAL_OVERRIDE",
      performedByUserId: params.performedByUserId,
      details: {
        itemNo: params.itemNo,
        oldChoice,
        newChoice: params.overrideChoice,
        isOverridden
      }
    }
  });

  return await recalculateSubmissionScoreAction(params.submissionId, params.performedByUserId);
}

/**
 * 15. Generate Printed Sheets (Pre-slugged or Generic Blank)
 */
export async function generatePrintedSheetsAction(params: {
  examPaperId: string;
  students: {
    studentId: string;
    studentName?: string;
    classroom?: string;
    seatNo?: number;
  }[];
}) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: params.examPaperId }
  });

  if (!paper) {
    throw new Error("ไม่พบชุดข้อสอบที่ระบุ");
  }

  const generated = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const s of params.students) {
      const sheetToken = "ckp_" + crypto.randomBytes(10).toString("hex");

      const sheet = await tx.examPrintedSheet.upsert({
        where: {
          examPaperId_studentId_attemptNo: {
            examPaperId: params.examPaperId,
            studentId: s.studentId,
            attemptNo: 1
          }
        },
        update: {
          studentName: s.studentName,
          classroom: s.classroom,
          seatNo: s.seatNo
        },
        create: {
          sheetToken,
          examPaperId: params.examPaperId,
          studentId: s.studentId,
          studentName: s.studentName,
          classroom: s.classroom,
          seatNo: s.seatNo,
          attemptNo: 1
        }
      });
      results.push(sheet);
    }
    return results;
  }, { maxWait: 10000, timeout: 20000 });

  return generated;
}

/**
 * 16. Item Difficulty & Discrimination Analysis
 */
export async function calculateExamItemAnalysisAction(examPaperId: string) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: examPaperId }
  });

  if (!paper) {
    throw new Error("ไม่พบชุดข้อสอบ");
  }

  const submissions = await prisma.examSubmission.findMany({
    where: {
      examPaperId,
      isLatestAttempt: true
    },
    include: {
      itemSubmissions: true
    },
    orderBy: { netScore: "desc" }
  });

  const N = submissions.length;
  if (N === 0) {
    return {
      examPaperId,
      totalStudents: 0,
      meanScore: 0,
      variance: 0,
      kr20: 0,
      itemStats: [],
      message: "ยังไม่มีผลการตรวจสำหรับชุดข้อสอบนี้"
    };
  }

  const groupSize = Math.max(1, Math.round(N * 0.27));
  const highGroup = submissions.slice(0, groupSize);
  const lowGroup = submissions.slice(Math.max(0, N - groupSize));

  const totalScores = submissions.map(s => Number(s.netScore));
  const sumScores = totalScores.reduce((a, b) => a + b, 0);
  const meanScore = sumScores / N;
  const variance = totalScores.reduce((acc, curr) => acc + Math.pow(curr - meanScore, 2), 0) / N;

  const totalItems = paper.totalItems;
  const itemStats = [];
  let sumPq = 0;

  for (let itemNo = 1; itemNo <= totalItems; itemNo++) {
    const totalCorrectAll = submissions.filter(s =>
      s.itemSubmissions.some(i => i.itemNo === itemNo && i.isCorrect)
    ).length;

    const p = totalCorrectAll / N;
    const q = 1 - p;
    sumPq += (p * q);

    const highCorrect = highGroup.filter(s =>
      s.itemSubmissions.some(i => i.itemNo === itemNo && i.isCorrect)
    ).length;
    const lowCorrect = lowGroup.filter(s =>
      s.itemSubmissions.some(i => i.itemNo === itemNo && i.isCorrect)
    ).length;

    const r = (highCorrect - lowCorrect) / groupSize;

    let difficultyRating = "ยากพอเหมาะ";
    if (p > 0.8) difficultyRating = "ง่ายเกินไป";
    else if (p < 0.2) difficultyRating = "ยากเกินไป";

    let discriminationRating = "ดีมาก";
    if (r < 0.2) discriminationRating = "จำแนกไม่ได้ (ปรับปรุง/ตัดทิ้ง)";
    else if (r < 0.3) discriminationRating = "พอใช้";
    else if (r < 0.4) discriminationRating = "ดี";

    itemStats.push({
      itemNo,
      difficultyIndex: Number(p.toFixed(3)),
      difficultyRating,
      discriminationIndex: Number(r.toFixed(3)),
      discriminationRating,
      correctCount: totalCorrectAll
    });
  }

  let kr20 = 0;
  if (totalItems > 1 && variance > 0) {
    kr20 = (totalItems / (totalItems - 1)) * (1.0 - sumPq / variance);
  }

  return {
    examPaperId,
    totalStudents: N,
    meanScore: Number(meanScore.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    kr20: Number(kr20.toFixed(3)),
    reliabilityStatus: kr20 >= 0.70 ? "ผ่านเกณฑ์มาตรฐานความเชื่อมั่น" : "ควรปรับปรุงข้อสอบ",
    itemStats,
    disclaimer: N < 30 ? "คำเตือน: จำนวนตัวอย่างน้อยกว่า 30 แผ่น ควรประเมินผลอย่างระมัดระวัง" : null
  };
}

export const getExamItemAnalysisAction = calculateExamItemAnalysisAction;
