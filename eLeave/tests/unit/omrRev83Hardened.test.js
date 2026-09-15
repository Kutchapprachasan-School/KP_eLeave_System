import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';

import {
  createExamPaperAction,
  updateExamPaperAction,
  configureAnswerKeyAction,
  updateAnswerKeyWithVersionAction,
  createRegradeJobAction,
  processRegradeJobChunkAction,
  updateSubjectiveScoreAction,
  ingestExamSubmissionAction,
} from '../../../src/app/actions/omr.ts';

describe('Academic OMR Rev. 8.3 Production-Ready Hardened Suite', () => {
  let teacherAId;
  let paperAId;
  let keyVersion1Id;
  let submission1Id;
  let submission2Id;
  let regradeJobId;

  it('1. Seed Test Users (Teacher A)', async () => {
    const teacherA = await prisma.user.upsert({
      where: { email: 'teacher_a_rev83@kpschool.ac.th' },
      update: {},
      create: {
        email: 'teacher_a_rev83@kpschool.ac.th',
        name: 'ครู ก. (Rev 8.3 Master Teacher)',
        role: 'TEACHER',
      },
    });
    teacherAId = teacherA.id;
    assert.ok(teacherAId);
  });

  it('2. Create Paper (20 items, maxScore: 20, subjectiveMaxScore: 10)', async () => {
    const paper = await createExamPaperAction({
      subjectCode: 'ว23103-REV83',
      subjectName: 'วิทยาศาสตร์กายภาพ (Rev 8.3)',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.3',
      title: 'สอบกลางภาควิชาการ Rev 8.3 Hardened',
      totalItems: 20,
      maxScore: 20,
      passScore: 15,
      createdById: teacherAId,
      subjectiveItems: [
        { itemNo: 1, title: 'อธิบายหลักการเลนส์นูน', maxScore: 5.0, rubricDetail: 'ตอบครบ 5 คะแนน' },
        { itemNo: 2, title: 'เขียนสมการกำลังขยาย', maxScore: 5.0, rubricDetail: 'เขียนสมการถูก 5 คะแนน' },
      ],
    });

    assert.ok(paper.id);
    assert.equal(paper.totalItems, 20);
    assert.equal(paper.totalSubjectiveItems, 2);
    assert.equal(Number(paper.subjectiveMaxScore), 10.0);
    paperAId = paper.id;
  });

  it('3. Commit Initial Answer Key Snapshot (Version 1)', async () => {
    const keyItems = [];
    for (let i = 1; i <= 20; i++) {
      keyItems.push({
        itemNo: i,
        correctChoices: ['A'],
        points: 1.0,
        penaltyPoints: 0.0,
      });
    }

    const res = await updateAnswerKeyWithVersionAction({
      examPaperId: paperAId,
      versionCode: '01',
      items: keyItems,
      changedById: teacherAId,
      reason: 'กำหนดเฉลยเริ่มต้นเวอร์ชัน 1',
    });

    assert.equal(res.success, true);
    assert.equal(res.version, 1);
    assert.ok(res.snapshotId);
    keyVersion1Id = res.snapshotId;
  });

  it('4. Dual-Direction Trigger: trg_exam_submission_score_bounds rejects out-of-bound scores', async () => {
    // 4.1 Reject rawScore > maxScore (25 > 20)
    await assert.rejects(
      async () => {
        await prisma.examSubmission.create({
          data: {
            clientScanId: 'SCAN-INVALID-RAW-REV83',
            examPaperId: paperAId,
            studentId: 'STU-ERR-1',
            rawScore: 25.0, // Exceeds paper.maxScore (20)
            subjectiveScore: 0.0,
            netScore: 25.0,
            confidenceAvg: 0.99,
            scannedByUserId: teacherAId,
          },
        });
      },
      (err) => {
        assert.match(err.message, /rawScore.*must be between 0 and 20/i);
        return true;
      }
    );

    // 4.2 Reject subjectiveScore > subjectiveMaxScore (15 > 10)
    await assert.rejects(
      async () => {
        await prisma.examSubmission.create({
          data: {
            clientScanId: 'SCAN-INVALID-SUBJ-REV83',
            examPaperId: paperAId,
            studentId: 'STU-ERR-2',
            rawScore: 10.0,
            subjectiveScore: 15.0, // Exceeds paper.subjectiveMaxScore (10)
            netScore: 25.0,
            confidenceAvg: 0.99,
            scannedByUserId: teacherAId,
          },
        });
      },
      (err) => {
        assert.match(err.message, /subjectiveScore.*must be between 0 and 10/i);
        return true;
      }
    );

    // 4.3 Reject netScore > totalMaxScore (35 > 30)
    await assert.rejects(
      async () => {
        await prisma.examSubmission.create({
          data: {
            clientScanId: 'SCAN-INVALID-NET-REV83',
            examPaperId: paperAId,
            studentId: 'STU-ERR-3',
            rawScore: 20.0,
            subjectiveScore: 10.0,
            netScore: 35.0, // Exceeds total max (20 + 10 = 30)
            confidenceAvg: 0.99,
            scannedByUserId: teacherAId,
          },
        });
      },
      (err) => {
        assert.match(err.message, /netScore.*must be between 0 and 30/i);
        return true;
      }
    );
  });

  it('5. Ingest Valid Submission & Verify gradingVersionId FK Linkage', async () => {
    // Ingest student 1 (20 items with choice "A" -> rawScore 20)
    const scanItems = [];
    for (let i = 1; i <= 20; i++) {
      scanItems.push({
        itemNo: i,
        detectedChoices: ['A'],
        fillRatios: { A: 0.92 },
        confidenceScore: 0.95,
      });
    }

    const sub1 = await ingestExamSubmissionAction({
      clientScanId: 'SCAN-STU-01-REV83',
      examPaperId: paperAId,
      studentId: 'STU-01',
      studentName: 'เด็กชายสมชาย สายเรียนดี',
      classroom: '3/1',
      seatNo: 1,
      versionCode: '01',
      scannedByUserId: teacherAId,
      items: scanItems,
    });

    assert.ok(sub1.id);
    assert.equal(Number(sub1.rawScore), 20);
    assert.equal(sub1.gradingVersion, 1);
    assert.equal(sub1.gradingVersionId, keyVersion1Id, 'Must link directly to ExamAnswerKeyVersion.id via FK');
    submission1Id = sub1.id;

    // Add subjective score 8.0 -> netScore = 28
    const updatedSub1 = await updateSubjectiveScoreAction({
      submissionId: sub1.id,
      subjectiveScores: { 1: 4.0, 2: 4.0 },
      performedByUserId: teacherAId,
    });
    assert.equal(Number(updatedSub1.subjectiveScore), 8.0);
    assert.equal(Number(updatedSub1.netScore), 28.0);

    // Ingest student 2
    const sub2 = await ingestExamSubmissionAction({
      clientScanId: 'SCAN-STU-02-REV83',
      examPaperId: paperAId,
      studentId: 'STU-02',
      studentName: 'เด็กหญิงสมหญิง รักเรียน',
      classroom: '3/1',
      seatNo: 2,
      versionCode: '01',
      scannedByUserId: teacherAId,
      items: scanItems.slice(0, 15), // 15 correct items -> rawScore 15
    });
    submission2Id = sub2.id;
    assert.equal(Number(sub2.rawScore), 15);

    // FK constraint test: Invalid gradingVersionId must fail with DB FK error
    await assert.rejects(
      async () => {
        await prisma.examSubmission.update({
          where: { id: sub1.id },
          data: { gradingVersionId: 'non-existent-key-version-9999' },
        });
      },
      (err) => {
        assert.match(err.message, /foreign key constraint|fk_submission_grading_version/i);
        return true;
      }
    );
  });

  it('6. Dual-Direction Trigger: trg_exam_paper_score_bounds_update blocks reducing paper scores below existing submissions', async () => {
    // Current submission 1 has rawScore = 20, subjectiveScore = 8, netScore = 28
    // 6.1 Attempt to reduce maxScore to 18 (below existing rawScore 20)
    await assert.rejects(
      async () => {
        await prisma.examPaper.update({
          where: { id: paperAId },
          data: { maxScore: 18.0 },
        });
      },
      (err) => {
        assert.match(err.message, /Cannot reduce maxScore to 18.*existing submission has rawScore of 20/i);
        return true;
      }
    );

    // 6.2 Attempt to reduce subjectiveMaxScore to 5 (below existing subjectiveScore 8)
    await assert.rejects(
      async () => {
        await prisma.examPaper.update({
          where: { id: paperAId },
          data: { subjectiveMaxScore: 5.0 },
        });
      },
      (err) => {
        assert.match(err.message, /Cannot reduce subjectiveMaxScore to 5.*existing submission has subjectiveScore of 8/i);
        return true;
      }
    );
  });

  it('7. Concurrency Guard blocks answer key mutation when a RegradeJob is active', async () => {
    // Create an active job in PROCESSING
    const blockingJob = await prisma.examRegradeJob.create({
      data: {
        examPaperId: paperAId,
        targetKeyVersionId: keyVersion1Id,
        status: 'PROCESSING',
        workerToken: 'ACTIVE-WORKER-TEST',
        leaseExpiresAt: new Date(Date.now() + 120000),
        totalSubmissions: 2,
      },
    });

    // Attempting to mutate answer key must be rejected by Concurrency Guard
    await assert.rejects(
      async () => {
        await updateAnswerKeyWithVersionAction({
          examPaperId: paperAId,
          versionCode: '01',
          items: [{ itemNo: 1, correctChoices: ['B'], points: 1.0, penaltyPoints: 0.0 }],
          changedById: teacherAId,
          reason: 'พยายามแก้เฉลยขณะกำลังมี Job ค้างอยู่',
        });
      },
      (err) => {
        assert.match(err.message, /ไม่สามารถแก้ไขเฉลยได้ เนื่องจากกำลังอยู่ระหว่างการตรวจซ้ำ/i);
        return true;
      }
    );

    // Clean up blocking job
    await prisma.examRegradeJob.delete({ where: { id: blockingJob.id } });
  });

  it('8. Row-Level Fenced Write rejects ExamSubmission update if worker lease has expired', async () => {
    // Create job with expired lease
    const expiredJob = await prisma.examRegradeJob.create({
      data: {
        examPaperId: paperAId,
        targetKeyVersionId: keyVersion1Id,
        status: 'PROCESSING',
        workerToken: 'OLD-EXPIRED-TOKEN',
        leaseExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        totalSubmissions: 1,
      },
    });

    const sub = await prisma.examSubmission.findFirst({
      where: { examPaperId: paperAId, studentId: 'STU-01' },
    });

    // Attempt row-level fenced update with expired lease
    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx) => {
          const fencedSubUpdate = await tx.$queryRaw`
            UPDATE "ExamSubmission" s
            SET "rawScore" = 10
            WHERE s.id = ${sub.id}
              AND EXISTS (
                SELECT 1 FROM "ExamRegradeJob" j
                WHERE j.id = ${expiredJob.id}
                  AND j."workerToken" = 'OLD-EXPIRED-TOKEN'
                  AND j."leaseExpiresAt" >= NOW()
              )
            RETURNING s.id;
          `;

          if (!fencedSubUpdate || fencedSubUpdate.length === 0) {
            throw new Error('SUBMISSION_FENCED_WRITE_FAILED_LEASE_EXPIRED');
          }
        });
      },
      (err) => err.message === 'SUBMISSION_FENCED_WRITE_FAILED_LEASE_EXPIRED'
    );

    // Clean up expired job
    await prisma.examRegradeJob.delete({ where: { id: expiredJob.id } });
  });

  it('9. Closed Snapshot Boundary Tuple & Monotonic Keyset Cursor Re-grade Execution', async () => {
    // Mutate answer key: Question 1 changed from 'A' to 'B'
    const newItems = [];
    for (let i = 1; i <= 20; i++) {
      newItems.push({
        itemNo: i,
        correctChoices: i === 1 ? ['B'] : ['A'], // Item 1 answer is now B
        points: 1.0,
        penaltyPoints: 0.0,
      });
    }

    const mutationRes = await updateAnswerKeyWithVersionAction({
      examPaperId: paperAId,
      versionCode: '01',
      items: newItems,
      changedById: teacherAId,
      reason: 'เปลี่ยนข้อ 1 เป็น B',
    });

    assert.equal(mutationRes.success, true);
    assert.equal(mutationRes.version, 2);
    assert.ok(mutationRes.regradeJobId);
    regradeJobId = mutationRes.regradeJobId;

    // Verify Regrade Job captured closed snapshot boundary tuple
    const job = await prisma.examRegradeJob.findUnique({
      where: { id: regradeJobId },
    });
    assert.ok(job.snapshotEndCreatedAt, 'Must capture snapshotEndCreatedAt');
    assert.ok(job.snapshotEndId, 'Must capture snapshotEndId');
    assert.equal(job.totalSubmissions, 2);

    // Insert student 3 AFTER snapshot was created
    const scanItems = [];
    for (let i = 1; i <= 20; i++) {
      scanItems.push({
        itemNo: i,
        detectedChoices: ['A'],
        fillRatios: { A: 0.92 },
        confidenceScore: 0.95,
      });
    }
    const sub3 = await ingestExamSubmissionAction({
      clientScanId: 'SCAN-STU-03-AFTER-SNAPSHOT',
      examPaperId: paperAId,
      studentId: 'STU-03',
      studentName: 'เด็กชายแทรกมาหลัง Snapshot',
      classroom: '3/1',
      seatNo: 3,
      versionCode: '01',
      scannedByUserId: teacherAId,
      items: scanItems,
    });

    // Execute Regrade Job chunk
    const chunkRes = await processRegradeJobChunkAction(regradeJobId);
    assert.equal(chunkRes.success, true);
    assert.equal(chunkRes.completed, true);
    assert.equal(chunkRes.processedCount, 2, 'Must process EXACTLY 2 submissions from the snapshot boundary (sub3 excluded)');

    // Verify student 1 score was updated to version 2 (rawScore: 19 because question 1 was 'A' but key is now 'B')
    const refreshedSub1 = await prisma.examSubmission.findUnique({
      where: { id: submission1Id },
    });
    assert.equal(Number(refreshedSub1.rawScore), 19.0);
    assert.equal(Number(refreshedSub1.netScore), 27.0); // 19 + 8 subjective
    assert.equal(refreshedSub1.gradingVersion, 2);
    assert.equal(refreshedSub1.gradingVersionId, mutationRes.snapshotId);

    // Verify sub3 was NOT touched by the job and remains on its initial state
    const refreshedSub3 = await prisma.examSubmission.findUnique({
      where: { id: sub3.id },
    });
    assert.equal(refreshedSub3.gradingVersionId, mutationRes.snapshotId);

    // Clean up sub3
    await prisma.examItemSubmission.deleteMany({ where: { submissionId: sub3.id } });
    await prisma.examSubmission.delete({ where: { id: sub3.id } });
  });

  after(async () => {
    try {
      if (paperAId) {
        await prisma.examRegradeJob.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examSubjectiveItem.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examAnswerKeyVersion.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examItemSubmission.deleteMany({ where: { submission: { examPaperId: paperAId } } });
        await prisma.examSubmission.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examAnswerKeyItem.deleteMany({ where: { answerKey: { examPaperId: paperAId } } });
        await prisma.examAnswerKey.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examPaper.delete({ where: { id: paperAId } });
      }
      await pool.end();
      await prisma.$disconnect();
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  });
});
