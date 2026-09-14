"use server";

import { prisma } from "@/lib/db";
function safeRevalidatePath(path: string) {
  try {
    // Dynamic import/require for Next.js runtime
    const { revalidatePath } = require("next/cache");
    revalidatePath(path);
  } catch {
    // No-op during isolated unit testing
  }
}
import crypto from "crypto";
import { ExamItemStatus, SubmissionSyncStatus } from "@prisma/client";
import { ensureStandardTemplatesAction } from "@/lib/services/omrTemplateService";

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

/**
 * 1. Create or ensure an ExamPaper
 */
export async function createExamPaperAction(data: CreateExamPaperInput) {
  // Ensure default templates exist
  await ensureStandardTemplatesAction();

  const templateCode = data.templateCode || (data.totalItems && data.totalItems <= 20 ? "KP-OMR-A4-20" : "KP-OMR-A4-50");
  const template = await prisma.examTemplate.findFirst({
    where: { code: templateCode, isDeprecated: false },
    orderBy: { version: "desc" }
  });

  if (!template) {
    throw new Error(`ไม่พบแม่แบบกระดาษคำตอบรหัส ${templateCode}`);
  }

  const paper = await prisma.examPaper.create({
    data: {
      subjectCode: data.subjectCode,
      subjectName: data.subjectName,
      academicYear: data.academicYear,
      term: data.term,
      gradeLevel: data.gradeLevel,
      title: data.title,
      templateId: template.id,
      totalItems: data.totalItems || (templateCode === "KP-OMR-A4-20" ? 20 : 50),
      maxScore: data.maxScore,
      passScore: data.passScore,
      createdById: data.createdById
    }
  });

  safeRevalidatePath("/academic/exam");
  return paper;
}

/**
 * 2. Configure Answer Key for an Exam Paper with strict DB integrity validation
 */
export async function configureAnswerKeyAction(data: ConfigureAnswerKeyInput) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: data.examPaperId }
  });

  if (!paper) {
    throw new Error("ไม่พบชุดข้อสอบที่ระบุ");
  }

  // Validate item bounds and completeness
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
    // 1. Upsert parent answer key
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

    // 2. Clear old items
    await tx.examAnswerKeyItem.deleteMany({
      where: { answerKeyId: answerKey.id }
    });

    // 3. Create items
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
 * 3. Generate Printed Sheets (Pre-slugged or Generic Blank) with Zero-PII Tokens
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
      // Generate compact, unguessable opaque CUID2 token: "ckp_" + 20 random hex chars
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
 * 4. Ingest Exam Submission with 64-bit Advisory Lock & Atomic Score Recalculation
 */
export async function ingestExamSubmissionAction(input: IngestSubmissionInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Probabilistic 64-bit Advisory Lock via hashtextextended
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${input.examPaperId} || ':' || ${input.studentId}, 0));
    `;

    // 2. Idempotency Check: Return existing submission if clientScanId already synced
    const existing = await tx.examSubmission.findUnique({
      where: { clientScanId: input.clientScanId },
      include: { itemSubmissions: true }
    });
    if (existing) {
      return existing;
    }

    const attemptNo = input.attemptNo || 1;

    // 3. Unset previous latest attempt for this student
    await tx.examSubmission.updateMany({
      where: {
        examPaperId: input.examPaperId,
        studentId: input.studentId,
        isLatestAttempt: true
      },
      data: { isLatestAttempt: false }
    });

    // 4. Calculate overall confidence average
    const totalConf = input.items.reduce((acc, curr) => acc + (curr.confidenceScore || 0), 0);
    const confidenceAvg = input.items.length > 0 ? totalConf / input.items.length : 1.0;
    const hasAnomalies = input.items.some(i => i.confidenceScore < 0.65 || i.detectedChoices.length > 1);

    // 5. Create ExamSubmission container
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
        netScore: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalBlanks: 0,
        totalMultiple: 0,
        gradingVersion: 1,
        confidenceAvg,
        hasAnomalies,
        isVerifiedByTeacher: false,
        scannedImageKey: input.scannedImageKey,
        syncStatus: SubmissionSyncStatus.SYNCED,
        scannedByUserId: input.scannedByUserId
      }
    });

    // 6. Fetch Answer Key for scoring
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

    // 7. Create ExamItemSubmission leaf rows & compute item-level status
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

    // 8. Update Derived Materialized Cache on ExamSubmission
    const netScore = Math.max(0, rawScore - penaltyScore);
    const updated = await tx.examSubmission.update({
      where: { id: submission.id },
      data: {
        rawScore,
        netScore,
        totalCorrect,
        totalIncorrect,
        totalBlanks,
        totalMultiple
      },
      include: { itemSubmissions: true }
    });

    // 9. Append Audit Log
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
 * 5. Recalculate Submission Scores from Leaf Items
 */
export async function recalculateSubmissionScoreAction(submissionId: string, performedByUserId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Acquire Row Lock
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

      await tx.examItemSubmission.update({
        where: { id: item.id },
        data: {
          effectiveChoice: choice,
          isCorrect,
          scoreEarned,
          status
        }
      });
    }

    const netScore = Math.max(0, rawScore - penaltyScore);

    const updated = await tx.examSubmission.update({
      where: { id: submissionId },
      data: {
        rawScore,
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
  }, { maxWait: 10000, timeout: 20000 });
}

/**
 * 6. Academic Item Analysis (Difficulty p, Discrimination r, Reliability KR-20)
 */
export async function getExamItemAnalysisAction(examPaperId: string) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: examPaperId },
    include: {
      submissions: {
        where: { isLatestAttempt: true },
        include: { itemSubmissions: true }
      }
    }
  });

  if (!paper) {
    throw new Error("ไม่พบข้อมูลการสอบที่ระบุ");
  }

  const submissions = paper.submissions;
  const N = submissions.length;

  if (N === 0) {
    return {
      examPaperId,
      totalStudents: 0,
      itemStats: [],
      meanScore: 0,
      variance: 0,
      kr20: 0,
      disclaimer: "ยังไม่มีข้อมูลกระดาษคำตอบที่สแกนในระบบ"
    };
  }

  // Sort submissions by netScore descending
  const sortedSubmissions = [...submissions].sort(
    (a, b) => Number(b.netScore) - Number(a.netScore)
  );

  const scores = sortedSubmissions.map(s => Number(s.netScore));
  const meanScore = scores.reduce((a, b) => a + b, 0) / N;
  const variance = scores.reduce((a, b) => a + Math.pow(b - meanScore, 2), 0) / (N > 1 ? N - 1 : 1);

  // 27% High and Low group sizing
  const groupRatio = N >= 30 ? 0.27 : 0.50;
  const groupSize = Math.max(1, Math.round(groupRatio * N));
  const highGroup = sortedSubmissions.slice(0, groupSize);
  const lowGroup = sortedSubmissions.slice(N - groupSize);

  const totalItems = paper.totalItems;
  const itemStats = [];
  let sumPq = 0;

  for (let itemNo = 1; itemNo <= totalItems; itemNo++) {
    // Count correct answers in high group (R_H) and low group (R_L)
    const rH = highGroup.filter(sub => {
      const item = sub.itemSubmissions.find(i => i.itemNo === itemNo);
      return item && item.isCorrect;
    }).length;

    const rL = lowGroup.filter(sub => {
      const item = sub.itemSubmissions.find(i => i.itemNo === itemNo);
      return item && item.isCorrect;
    }).length;

    // Difficulty Index: p = (R_H + R_L) / (N_H + N_L)
    const p = (rH + rL) / (2 * groupSize);
    // Discrimination Index: r = (R_H - R_L) / N_H
    const r = (rH - rL) / groupSize;

    const q = 1.0 - p;
    sumPq += p * q;

    // Qualitative interpretations according to OBEC standards
    let difficultyRating = "พอเหมาะ";
    if (p >= 0.8) difficultyRating = "ง่ายเกินไป";
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
      correctCount: submissions.filter(s => s.itemSubmissions.some(i => i.itemNo === itemNo && i.isCorrect)).length
    });
  }

  // Reliability: KR-20 formula
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

/**
 * 7. Query Exam Papers for Teacher Dashboard
 */
export async function listExamPapersAction() {
  return await prisma.examPaper.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      template: true,
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
 * 8. Query single Exam Paper Details with answer keys and recent submissions
 */
export async function getExamPaperDetailsAction(paperId: string) {
  return await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: {
      template: true,
      answerKeys: {
        include: { items: { orderBy: { itemNo: "asc" } } }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      submissions: {
        where: { isLatestAttempt: true },
        orderBy: [{ classroom: "asc" }, { seatNo: "asc" }, { studentId: "asc" }],
        include: {
          itemSubmissions: { orderBy: { itemNo: "asc" } }
        }
      },
      _count: {
        select: { printedSheets: true, submissions: true }
      }
    }
  });
}

/**
 * 9. Query single Submission for Teacher Review Studio
 */
export async function getSubmissionDetailsAction(submissionId: string) {
  return await prisma.examSubmission.findUnique({
    where: { id: submissionId },
    include: {
      examPaper: {
        include: {
          template: true,
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
}

/**
 * 10. Manual Override of an Item Answer by Teacher
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

  // Log Audit trail
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

  // Recalculate submission scores
  return await recalculateSubmissionScoreAction(params.submissionId, params.performedByUserId);
}

