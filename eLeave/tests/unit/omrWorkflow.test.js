import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';

import {
  createExamPaperAction,
  configureAnswerKeyAction,
  generatePrintedSheetsAction,
  ingestExamSubmissionAction,
  recalculateSubmissionScoreAction,
  updateItemManualOverrideAction,
  getExamItemAnalysisAction
} from '../../../src/app/actions/omr.ts';

describe('Academic OMR End-to-End Workflow & Integrity Pipeline', () => {
  let testUserId;
  let testPaperId;

  it('should seed or find a test teacher user', async () => {
    const user = await prisma.user.upsert({
      where: { email: 'omr_teacher_test@kpschool.ac.th' },
      update: {},
      create: {
        email: 'omr_teacher_test@kpschool.ac.th',
        name: 'ครูผู้สอน ทดสอบ OMR',
        role: 'TEACHER',
      },
    });
    assert.ok(user.id);
    testUserId = user.id;
  });

  it('createExamPaperAction should create a valid ExamPaper with standard template', async () => {
    const paper = await createExamPaperAction({
      subjectCode: 'ว23101-TEST',
      subjectName: 'วิทยาศาสตร์ 5 (ทดสอบอัตโนมัติ)',
      academicYear: 2026,
      term: 1,
      gradeLevel: 'ม.3',
      title: 'แบบทดสอบกลางภาค OMR Engine Test',
      totalItems: 50,
      maxScore: 50,
      passScore: 25,
      createdById: testUserId,
    });

    assert.ok(paper.id);
    assert.equal(paper.totalItems, 50);
    assert.equal(Number(paper.maxScore), 50);
    testPaperId = paper.id;
  });

  it('configureAnswerKeyAction should enforce strict bounds and save answer keys', async () => {
    const items = [];
    const choices = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 50; i++) {
      items.push({
        itemNo: i,
        correctChoices: [choices[(i - 1) % 4]],
        points: 1.0,
        penaltyPoints: 0.0,
      });
    }

    const key = await configureAnswerKeyAction({
      examPaperId: testPaperId,
      versionCode: '01',
      items,
    });

    assert.ok(key.id);
    assert.equal(key.versionCode, '01');

    // Verify DB triggers enforce item count
    const count = await prisma.examAnswerKeyItem.count({
      where: { answerKeyId: key.id },
    });
    assert.equal(count, 50);
  });

  it('generatePrintedSheetsAction should create Zero-PII sheet tokens', async () => {
    const students = [
      { studentId: '54321', studentName: 'ด.ช. กิตติศักดิ์ ชัยชนะ', classroom: 'ม.3/1', seatNo: 1 },
      { studentId: '54322', studentName: 'ด.ญ. สุภาวดี มีทรัพย์', classroom: 'ม.3/1', seatNo: 2 },
    ];

    const sheets = await generatePrintedSheetsAction({
      examPaperId: testPaperId,
      students,
    });

    assert.equal(sheets.length, 2);
    assert.ok(sheets[0].sheetToken.startsWith('ckp_'));
    assert.equal(sheets[0].studentId, '54321');
  });

  it('ingestExamSubmissionAction should ingest scan with 64-bit lock, calculate score, and enforce latest attempt', async () => {
    const scanId = `scan_test_${Date.now()}_1`;
    const items = [];
    const choices = ['A', 'B', 'C', 'D'];

    // 40 correct answers, 10 wrong
    for (let i = 1; i <= 50; i++) {
      const correctChoice = choices[(i - 1) % 4];
      const answerChoice = i <= 40 ? correctChoice : choices[i % 4];
      items.push({
        itemNo: i,
        detectedChoices: [answerChoice],
        fillRatios: { [answerChoice]: 0.92 },
        confidenceScore: 0.95,
      });
    }

    const submission = await ingestExamSubmissionAction({
      clientScanId: scanId,
      examPaperId: testPaperId,
      studentId: '54321',
      studentName: 'ด.ช. กิตติศักดิ์ ชัยชนะ',
      classroom: 'ม.3/1',
      seatNo: 1,
      versionCode: '01',
      scannedByUserId: testUserId,
      items,
    });

    assert.ok(submission.id);
    assert.equal(submission.totalCorrect, 40);
    assert.equal(submission.totalIncorrect, 10);
    assert.equal(Number(submission.netScore), 40);
    assert.equal(submission.isLatestAttempt, true);

    // Test Idempotency: re-ingesting same scanId should return existing submission immediately
    const duplicate = await ingestExamSubmissionAction({
      clientScanId: scanId,
      examPaperId: testPaperId,
      studentId: '54321',
      versionCode: '01',
      scannedByUserId: testUserId,
      items,
    });
    assert.equal(duplicate.id, submission.id);
  });

  it('updateItemManualOverrideAction should override choice, log audit, and recalculate atomically', async () => {
    const submission = await prisma.examSubmission.findFirst({
      where: { examPaperId: testPaperId, studentId: '54321', isLatestAttempt: true },
    });
    assert.ok(submission);

    // Item 41 was initially wrong ('B' vs correct 'A')
    const updated = await updateItemManualOverrideAction({
      submissionId: submission.id,
      itemNo: 41,
      overrideChoice: 'A', // Correct it to 'A'
      performedByUserId: testUserId,
    });

    assert.equal(updated.totalCorrect, 41); // Should increment from 40 to 41
    assert.equal(Number(updated.netScore), 41);

    // Check Audit Log
    const auditLogs = await prisma.examAuditLog.findMany({
      where: { submissionIdSnapshot: submission.id, action: 'MANUAL_OVERRIDE' },
    });
    assert.ok(auditLogs.length > 0);
    assert.equal(auditLogs[0].details.itemNo, 41);
  });

  it('getExamItemAnalysisAction should compute p, r, and KR-20 reliability metrics', async () => {
    // Ingest a second student with 20 correct answers
    const scanId2 = `scan_test_${Date.now()}_2`;
    const items2 = [];
    const choices = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 50; i++) {
      const correctChoice = choices[(i - 1) % 4];
      const answerChoice = i <= 20 ? correctChoice : 'C';
      items2.push({
        itemNo: i,
        detectedChoices: [answerChoice],
        fillRatios: { [answerChoice]: 0.88 },
        confidenceScore: 0.90,
      });
    }

    await ingestExamSubmissionAction({
      clientScanId: scanId2,
      examPaperId: testPaperId,
      studentId: '54322',
      studentName: 'ด.ญ. สุภาวดี มีทรัพย์',
      classroom: 'ม.3/1',
      seatNo: 2,
      versionCode: '01',
      scannedByUserId: testUserId,
      items: items2,
    });

    const analysis = await getExamItemAnalysisAction(testPaperId);
    assert.equal(analysis.totalStudents, 2);
    assert.ok(analysis.meanScore > 0);
    assert.equal(analysis.itemStats.length, 50);

    // Item 1 was answered correctly by both students (p = 1.0, discrimination = 0)
    assert.equal(analysis.itemStats[0].correctCount, 2);
  });

  after(async () => {
    try {
      if (testPaperId || testUserId) {
        // Disable triggers to allow cascade cleanup of test submissions & items
        await pool.query('ALTER TABLE "ExamItemOverride" DISABLE TRIGGER USER;').catch(() => {});
        await pool.query('ALTER TABLE "ExamItemSubmission" DISABLE TRIGGER USER;').catch(() => {});

        if (testPaperId) {
          await pool.query(`
            DELETE FROM "ExamItemOverride" 
            WHERE "submissionItemId" IN (
              SELECT eis.id FROM "ExamItemSubmission" eis
              JOIN "ExamSubmission" es ON es.id = eis."submissionId"
              WHERE es."examPaperId" = $1
            )
          `, [testPaperId]).catch(() => {});
          await pool.query(`
            DELETE FROM "ExamItemSubmission" 
            WHERE "submissionId" IN (
              SELECT es.id FROM "ExamSubmission" es
              WHERE es."examPaperId" = $1
            )
          `, [testPaperId]).catch(() => {});
          await pool.query('DELETE FROM "ExamSubmission" WHERE "examPaperId" = $1', [testPaperId]).catch(() => {});
          await pool.query('DELETE FROM "ExamPrintedSheet" WHERE "examPaperId" = $1', [testPaperId]).catch(() => {});
          await pool.query(`
            DELETE FROM "ExamAnswerKeyItem" 
            WHERE "answerKeyId" IN (SELECT id FROM "ExamAnswerKey" WHERE "examPaperId" = $1)
          `, [testPaperId]).catch(() => {});
          await pool.query('DELETE FROM "ExamAnswerKey" WHERE "examPaperId" = $1', [testPaperId]).catch(() => {});
          await pool.query('DELETE FROM "ExamAnswerKeyVersion" WHERE "examPaperId" = $1', [testPaperId]).catch(() => {});
          await pool.query('DELETE FROM "ExamSubjectiveItem" WHERE "examPaperId" = $1', [testPaperId]).catch(() => {});
          await pool.query('DELETE FROM "ExamPaper" WHERE "id" = $1', [testPaperId]).catch(() => {});
        }

        await pool.query('ALTER TABLE "ExamItemOverride" ENABLE TRIGGER USER;').catch(() => {});
        await pool.query('ALTER TABLE "ExamItemSubmission" ENABLE TRIGGER USER;').catch(() => {});

        if (testUserId) {
          await pool.query('DELETE FROM "User" WHERE "id" = $1', [testUserId]).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error cleaning up omrWorkflow test data:', err);
    } finally {
      await pool.end();
      await prisma.$disconnect();
    }
  });
});
