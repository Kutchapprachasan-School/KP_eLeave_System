import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';

import {
  createExamPaperAction,
  updateExamPaperAction,
  configureAnswerKeyAction,
  updateAnswerKeyWithVersionAction,
  regradeSubmissionsChunkAction,
  updateSubjectiveScoreAction,
  softDeleteExamPaperAction,
  restoreExamPaperAction,
  listExamPapersAction,
  getExamPaperDetailsAction,
  ingestExamSubmissionAction,
} from '../../../src/app/actions/omr.ts';

describe('Academic OMR Rev. 8.2 Production-Ready Hardened Suite', () => {
  let teacherAId;
  let teacherBId;
  let adminId;
  let paperAId;
  let paperASubmissionId;

  it('1. Seed Test Users (Teacher A, Teacher B, Admin)', async () => {
    const teacherA = await prisma.user.upsert({
      where: { email: 'teacher_a_omr@kpschool.ac.th' },
      update: {},
      create: {
        email: 'teacher_a_omr@kpschool.ac.th',
        name: 'ครู ก. (เจ้าของวิชา)',
        role: 'TEACHER',
      },
    });
    teacherAId = teacherA.id;

    const teacherB = await prisma.user.upsert({
      where: { email: 'teacher_b_omr@kpschool.ac.th' },
      update: {},
      create: {
        email: 'teacher_b_omr@kpschool.ac.th',
        name: 'ครู ข. (ครูท่านอื่น)',
        role: 'TEACHER',
      },
    });
    teacherBId = teacherB.id;

    const admin = await prisma.user.upsert({
      where: { email: 'admin_omr_rev82@kpschool.ac.th' },
      update: {},
      create: {
        email: 'admin_omr_rev82@kpschool.ac.th',
        name: 'ผู้ดูแลระบบ OMR',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    assert.ok(teacherAId);
    assert.ok(teacherBId);
    assert.ok(adminId);
  });

  it('2. Create Flexible Item Count Paper (22 items) + Section 2 Normalized Subjective Items', async () => {
    const paper = await createExamPaperAction({
      subjectCode: 'ว23102-REV82',
      subjectName: 'วิทยาศาสตร์กายภาพ 3',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.3',
      title: 'สอบเก็บคะแนนหน่วยที่ 1 (22 ข้อ + อัตนัย 2 ข้อ)',
      totalItems: 22,
      maxScore: 22,
      passScore: 15,
      createdById: teacherAId,
      subjectiveItems: [
        { itemNo: 1, title: 'อธิบายกฎการสะท้อนของแสง', maxScore: 5.0, rubricDetail: 'อธิบายครบ 5 คะแนน' },
        { itemNo: 2, title: 'คำนวณดรรชนีหักเหของตัวกลาง', maxScore: 5.0, rubricDetail: 'แสดงวิธีทำถูกต้อง 5 คะแนน' },
      ],
    });

    assert.ok(paper.id);
    assert.equal(paper.totalItems, 22);
    assert.equal(paper.totalSubjectiveItems, 2);
    assert.equal(Number(paper.subjectiveMaxScore), 10.0);
    paperAId = paper.id;

    // Verify Relational Table ExamSubjectiveItem
    const subjItems = await prisma.examSubjectiveItem.findMany({
      where: { examPaperId: paperAId },
      orderBy: { itemNo: 'asc' },
    });
    assert.equal(subjItems.length, 2);
    assert.equal(Number(subjItems[0].maxScore), 5.0);
    assert.equal(Number(subjItems[1].maxScore), 5.0);
  });

  it('3. Commit Initial Answer Key Snapshot (Version 1)', async () => {
    const keyItems = [];
    const choices = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 22; i++) {
      keyItems.push({
        itemNo: i,
        correctChoices: [choices[(i - 1) % 4]],
        points: 1.0,
        penaltyPoints: 0.0,
      });
    }

    const res = await updateAnswerKeyWithVersionAction({
      examPaperId: paperAId,
      versionCode: '01',
      items: keyItems,
      changedById: teacherAId,
      reason: 'สร้างเฉลยเวอร์ชัน 1',
    });

    assert.equal(res.success, true);
    assert.equal(res.version, 1);

    // Verify ExamAnswerKeyVersion record
    const ver = await prisma.examAnswerKeyVersion.findFirst({
      where: { examPaperId: paperAId, version: 1 },
    });
    assert.ok(ver);
    assert.equal(ver.totalItems, 22);
  });

  it('4. Security Invariant: Zero Admin Code Path for Answer Keys & Teacher Isolation', async () => {
    // A. Admin queries list of papers
    const adminList = await listExamPapersAction({ userId: adminId, userRole: 'ADMIN' });
    const targetInAdmin = adminList.find((p) => p.id === paperAId);
    assert.ok(targetInAdmin, 'Admin should see paper metadata');
    assert.equal(targetInAdmin.answerKeys, undefined, 'Admin payload MUST NOT contain answerKeys');

    // B. Teacher B (non-owner) requests paper details
    const nonOwnerDetails = await getExamPaperDetailsAction(paperAId, {
      userId: teacherBId,
      userRole: 'TEACHER',
    });
    assert.ok(nonOwnerDetails);
    assert.deepEqual(nonOwnerDetails.answerKeys, [], 'Non-owner teacher MUST NOT see answerKeys');

    // C. Teacher A (owner) requests paper details
    const ownerDetails = await getExamPaperDetailsAction(paperAId, {
      userId: teacherAId,
      userRole: 'TEACHER',
    });
    assert.ok(ownerDetails);
    assert.ok(ownerDetails.answerKeys.length > 0, 'Owner teacher MUST receive answerKeys');
    assert.equal(ownerDetails.answerKeys[0].items.length, 22);
  });

  it('5. Ingest Exam Submission and Test Subjective Scoring with DB Invariants', async () => {
    const scanId = `scan_rev82_student_01_${Date.now()}`;
    const items = [];
    const choices = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 22; i++) {
      items.push({
        itemNo: i,
        detectedChoices: [choices[(i - 1) % 4]], // All 22 correct
        fillRatios: { A: 0.95 },
        confidenceScore: 0.98,
      });
    }

    const sub = await ingestExamSubmissionAction({
      clientScanId: scanId,
      examPaperId: paperAId,
      studentId: '55501',
      studentName: 'สมชาย รักเรียน',
      classroom: 'ม.3/1',
      seatNo: 1,
      versionCode: '01',
      scannedByUserId: teacherAId,
      items,
    });

    assert.ok(sub.id);
    assert.equal(Number(sub.rawScore), 22);
    assert.equal(Number(sub.subjectiveScore), 0);
    assert.equal(Number(sub.netScore), 22);
    paperASubmissionId = sub.id;

    // Test Valid Subjective Scoring (Item 1: 4.5, Item 2: 4.0) -> Total Subj = 8.5, Net = 30.5
    const updatedSub = await updateSubjectiveScoreAction({
      submissionId: paperASubmissionId,
      subjectiveScores: { '1': 4.5, '2': 4.0 },
      performedByUserId: teacherAId,
    });

    assert.equal(Number(updatedSub.subjectiveScore), 8.5);
    assert.equal(Number(updatedSub.netScore), 30.5);

    // Test Subjective Score Bounds: score > maxScore (Item 1 has maxScore 5, trying 6.0) -> MUST FAIL
    await assert.rejects(
      async () => {
        await updateSubjectiveScoreAction({
          submissionId: paperASubmissionId,
          subjectiveScores: { '1': 6.0, '2': 4.0 },
          performedByUserId: teacherAId,
        });
      },
      /ต้องไม่เกินคะแนนเต็ม/
    );

    // Test Negative Subjective Score -> MUST FAIL
    await assert.rejects(
      async () => {
        await updateSubjectiveScoreAction({
          submissionId: paperASubmissionId,
          subjectiveScores: { '1': -1.0, '2': 4.0 },
          performedByUserId: teacherAId,
        });
      },
      /ต้องไม่ติดลบ/
    );
  });

  it('6. Key Mutation Snapshot & Decoupled Chunked Re-grade Pipeline', async () => {
    // Teacher A modifies answer key: Change item 1 from A to B (so student will get 21 raw score instead of 22)
    const modifiedKeyItems = [];
    const choices = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 22; i++) {
      modifiedKeyItems.push({
        itemNo: i,
        correctChoices: i === 1 ? ['B'] : [choices[(i - 1) % 4]],
        points: 1.0,
        penaltyPoints: 0.0,
      });
    }

    const versionRes = await updateAnswerKeyWithVersionAction({
      examPaperId: paperAId,
      versionCode: '01',
      items: modifiedKeyItems,
      changedById: teacherAId,
      reason: 'แก้ไขเฉลยข้อ 1 เป็น B',
    });

    assert.equal(versionRes.success, true);
    assert.equal(versionRes.version, 2);
    assert.equal(versionRes.affectedSubmissionsCount, 1);

    // Run Chunked Re-grade
    const regradeRes = await regradeSubmissionsChunkAction({
      examPaperId: paperAId,
      version: 2,
      batchSize: 50,
      offset: 0,
      performedByUserId: teacherAId,
    });

    assert.equal(regradeRes.processedCount, 1);
    assert.equal(regradeRes.hasMore, false);

    // Verify submission score was updated: rawScore 21 + subjectiveScore 8.5 = 29.5, gradingVersion = 2
    const checkSub = await prisma.examSubmission.findUnique({
      where: { id: paperASubmissionId },
    });
    assert.equal(Number(checkSub.rawScore), 21);
    assert.equal(Number(checkSub.subjectiveScore), 8.5);
    assert.equal(Number(checkSub.netScore), 29.5);
    assert.equal(checkSub.gradingVersion, 2);
  });

  it('7. Recycle Bin Soft-Delete & Restore with Deterministic Conflict Policy and originalTitle Tracking', async () => {
    // A. Soft delete paperA
    const deleteRes = await softDeleteExamPaperAction(
      paperAId,
      { userId: teacherAId, userRole: 'TEACHER' },
      'ทดสอบลบลงถังขยะ'
    );
    assert.equal(deleteRes.success, true);

    const deletedPaper = await prisma.examPaper.findUnique({ where: { id: paperAId } });
    assert.equal(deletedPaper.isDeleted, true);

    // B. Create a new active paper with EXACT same title and subjectCode
    const conflictingPaper = await createExamPaperAction({
      subjectCode: 'ว23102-REV82',
      subjectName: 'วิทยาศาสตร์กายภาพ 3',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.3',
      title: 'สอบเก็บคะแนนหน่วยที่ 1 (22 ข้อ + อัตนัย 2 ข้อ)', // Exact same title
      totalItems: 22,
      maxScore: 22,
      passScore: 15,
      createdById: teacherAId,
    });
    assert.ok(conflictingPaper.id);

    // C. Restore the first paper -> Conflict Policy should auto-rename with suffix and log originalTitle
    const restoreRes = await restoreExamPaperAction(paperAId, {
      userId: teacherAId,
      userRole: 'TEACHER',
    });
    assert.equal(restoreRes.success, true);

    const restoredPaper = await prisma.examPaper.findUnique({ where: { id: paperAId } });
    assert.equal(restoredPaper.isDeleted, false);
    assert.ok(restoredPaper.title.includes('(กู้คืนเมื่อ'), 'Restored paper must be auto-renamed to prevent conflict');

    // Verify ExamAuditLog recorded originalTitle
    const audit = await prisma.examAuditLog.findFirst({
      where: {
        examPaperIdSnapshot: paperAId,
        action: 'PAPER_RESTORED_CONFLICT_RENAMED',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(audit);
    assert.equal(audit.details.originalTitle, 'สอบเก็บคะแนนหน่วยที่ 1 (22 ข้อ + อัตนัย 2 ข้อ)');

    // Cleanup conflict paper
    await prisma.examPaper.delete({ where: { id: conflictingPaper.id } });
  });

  after(async () => {
    // Cleanup created test records
    try {
      if (paperAId) {
        await prisma.examSubjectiveItem.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examAnswerKeyVersion.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examItemSubmission.deleteMany({ where: { submission: { examPaperId: paperAId } } });
        await prisma.examSubmission.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examAnswerKeyItem.deleteMany({ where: { answerKey: { examPaperId: paperAId } } });
        await prisma.examAnswerKey.deleteMany({ where: { examPaperId: paperAId } });
        await prisma.examPaper.delete({ where: { id: paperAId } });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  });
});
