import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../src/lib/db.ts';
import {
  generate20ItemGridMetadata,
  generate50ItemGridMetadata,
  generate75ItemGridMetadata,
  generate100ItemGridMetadata,
  getTemplateGridForItems
} from '../../../src/lib/omr/omrTemplateGeometry.ts';
import {
  ensureStandardTemplatesAction
} from '../../../src/lib/services/omrTemplateService.ts';
import {
  createExamPaperAction
} from '../../../src/app/actions/omr.ts';
import { decodeQuestionBlocks } from '../../../src/lib/omr/omrEngine.ts';

describe('Tiered OMR Answer Sheet Architecture Suite (20, 50, 75, 100 Items)', () => {
  let testTeacherId;
  const createdPaperIds = [];

  it('1. Seed Test Teacher', async () => {
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher_tiered_omr@kpschool.ac.th' },
      update: {},
      create: {
        email: 'teacher_tiered_omr@kpschool.ac.th',
        name: 'ครูทดสอบ ระบบกระดาษคำตอบ 4 รูปแบบ',
        role: 'TEACHER'
      }
    });
    testTeacherId = teacher.id;
    assert.ok(testTeacherId);
  });

  it('2. Verify Geometry Bounds & Bubble Integrity for all 4 Tiers', () => {
    const tiers = [
      { name: 'Tier 1 (20 Items)', grid: generate20ItemGridMetadata(), expectedCount: 20 },
      { name: 'Tier 2 (50 Items)', grid: generate50ItemGridMetadata(), expectedCount: 50 },
      { name: 'Tier 3 (75 Items)', grid: generate75ItemGridMetadata(), expectedCount: 75 },
      { name: 'Tier 4 (100 Items)', grid: generate100ItemGridMetadata(), expectedCount: 100 },
    ];

    for (const t of tiers) {
      assert.equal(t.grid.questionBlocks.length, t.expectedCount, `${t.name} questionBlocks count mismatch`);

      // Verify Fiducial Markers
      assert.ok(t.grid.fiducialMarkers.topLeft.u >= 0 && t.grid.fiducialMarkers.topLeft.u <= 0.2);
      assert.ok(t.grid.fiducialMarkers.topRight.u >= 0.8 && t.grid.fiducialMarkers.topRight.u <= 1.0);
      assert.ok(t.grid.fiducialMarkers.bottomLeft.v >= 0.8 && t.grid.fiducialMarkers.bottomLeft.v <= 1.0);
      assert.ok(t.grid.fiducialMarkers.bottomRight.v >= 0.8 && t.grid.fiducialMarkers.bottomRight.v <= 1.0);

      // Verify Student ID Grid (5 digits, 10 bubbles each = 50 total bubbles)
      assert.equal(t.grid.studentIdGrid.digitsCount, 5);
      assert.equal(t.grid.studentIdGrid.digits.length, 50);
      for (const b of t.grid.studentIdGrid.digits) {
        assert.ok(b.u > 0.0 && b.u < 1.0);
        assert.ok(b.v > 0.0 && b.v < 1.0);
        assert.ok(b.radius > 0);
      }

      // Verify Questions and Bubbles (A, B, C, D)
      for (const q of t.grid.questionBlocks) {
        assert.equal(q.bubbles.length, 4);
        for (const b of q.bubbles) {
          assert.ok(b.u > 0.05 && b.u < 0.95, `${t.name} item ${q.itemNo} bubble u out of bounds: ${b.u}`);
          assert.ok(b.v > 0.25 && b.v < 0.95, `${t.name} item ${q.itemNo} bubble v out of bounds: ${b.v}`);
          assert.ok(b.radius > 0.003 && b.radius < 0.02, `${t.name} item ${q.itemNo} bubble radius invalid`);
        }
      }
    }
  });

  it('3. Verify getTemplateGridForItems helper maps dynamically across boundaries', () => {
    assert.equal(getTemplateGridForItems(1).questionBlocks.length, 20);
    assert.equal(getTemplateGridForItems(15).questionBlocks.length, 20);
    assert.equal(getTemplateGridForItems(20).questionBlocks.length, 20);

    assert.equal(getTemplateGridForItems(21).questionBlocks.length, 50);
    assert.equal(getTemplateGridForItems(35).questionBlocks.length, 50);
    assert.equal(getTemplateGridForItems(50).questionBlocks.length, 50);

    assert.equal(getTemplateGridForItems(51).questionBlocks.length, 75);
    assert.equal(getTemplateGridForItems(60).questionBlocks.length, 75);
    assert.equal(getTemplateGridForItems(75).questionBlocks.length, 75);

    assert.equal(getTemplateGridForItems(76).questionBlocks.length, 100);
    assert.equal(getTemplateGridForItems(90).questionBlocks.length, 100);
    assert.equal(getTemplateGridForItems(100).questionBlocks.length, 100);
  });

  it('4. ensureStandardTemplatesAction populates all 4 templates in the database', async () => {
    const templates = await ensureStandardTemplatesAction();
    const codes = templates.map((t) => t.code);

    assert.ok(codes.includes('KP-OMR-A4-20'), 'KP-OMR-A4-20 must exist');
    assert.ok(codes.includes('KP-OMR-A4-50'), 'KP-OMR-A4-50 must exist');
    assert.ok(codes.includes('KP-OMR-A4-75'), 'KP-OMR-A4-75 must exist');
    assert.ok(codes.includes('KP-OMR-A4-100'), 'KP-OMR-A4-100 must exist');
  });

  it('5. createExamPaperAction automatically resolves the correct Tier Template', async () => {
    // 5.1 Test Tier 1 (18 items) -> KP-OMR-A4-20
    const paper1 = await createExamPaperAction({
      subjectCode: 'ว10001',
      subjectName: 'วิทยาศาสตร์พื้นฐาน Tier 1',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.1',
      title: 'สอบเก็บคะแนน 18 ข้อ',
      totalItems: 18,
      maxScore: 18,
      passScore: 9,
      createdById: testTeacherId
    });
    createdPaperIds.push(paper1.id);
    const loadedPaper1 = await prisma.examPaper.findUnique({
      where: { id: paper1.id },
      include: { template: true }
    });
    assert.equal(loadedPaper1.template.code, 'KP-OMR-A4-20');
    assert.equal(loadedPaper1.template.sheetType, 'SHEET_20_ITEMS');

    // 5.2 Test Tier 2 (40 items) -> KP-OMR-A4-50
    const paper2 = await createExamPaperAction({
      subjectCode: 'ค20002',
      subjectName: 'คณิตศาสตร์พื้นฐาน Tier 2',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.2',
      title: 'สอบกลางภาค 40 ข้อ',
      totalItems: 40,
      maxScore: 40,
      passScore: 20,
      createdById: testTeacherId
    });
    createdPaperIds.push(paper2.id);
    const loadedPaper2 = await prisma.examPaper.findUnique({
      where: { id: paper2.id },
      include: { template: true }
    });
    assert.equal(loadedPaper2.template.code, 'KP-OMR-A4-50');
    assert.equal(loadedPaper2.template.sheetType, 'SHEET_50_ITEMS');

    // 5.3 Test Tier 3 (65 items) -> KP-OMR-A4-75
    const paper3 = await createExamPaperAction({
      subjectCode: 'อ30003',
      subjectName: 'ภาษาอังกฤษหลัก Tier 3',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.3',
      title: 'สอบปลายภาค 65 ข้อ',
      totalItems: 65,
      maxScore: 65,
      passScore: 32.5,
      createdById: testTeacherId
    });
    createdPaperIds.push(paper3.id);
    const loadedPaper3 = await prisma.examPaper.findUnique({
      where: { id: paper3.id },
      include: { template: true }
    });
    assert.equal(loadedPaper3.template.code, 'KP-OMR-A4-75');
    assert.equal(loadedPaper3.template.sheetType, 'SHEET_75_ITEMS');

    // 5.4 Test Tier 4 (90 items) -> KP-OMR-A4-100
    const paper4 = await createExamPaperAction({
      subjectCode: 'ท40004',
      subjectName: 'ภาษาไทยมาตรฐาน Tier 4',
      academicYear: 2569,
      term: 1,
      gradeLevel: 'ม.4',
      title: 'แบบทดสอบรวม 90 ข้อ',
      totalItems: 90,
      maxScore: 90,
      passScore: 45,
      createdById: testTeacherId
    });
    createdPaperIds.push(paper4.id);
    const loadedPaper4 = await prisma.examPaper.findUnique({
      where: { id: paper4.id },
      include: { template: true }
    });
    assert.equal(loadedPaper4.template.code, 'KP-OMR-A4-100');
    assert.equal(loadedPaper4.template.sheetType, 'SHEET_100_ITEMS');
  });

  it('6. CV Pipeline decodes synthetic image against Tier 3 (75 items) and Tier 1 (20 items) templates', () => {
    const grid75 = generate75ItemGridMetadata();
    const width = 800;
    const height = 1131;
    // White background paper
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(240);

    const calibration = {
      lPaper: 240,
      lMarker: 20,
      contrastRange: 220,
      fillThreshold: 140
    };

    // Fill Item 1 choice 'B' and Item 75 choice 'D'
    const item1 = grid75.questionBlocks[0];
    const bChoice = item1.bubbles.find(b => b.choice === 'B');
    const cx1 = Math.floor(bChoice.u * width);
    const cy1 = Math.floor(bChoice.v * height);
    const r1 = Math.floor(bChoice.radius * width);

    for (let dy = -r1; dy <= r1; dy++) {
      for (let dx = -r1; dx <= r1; dx++) {
        if (dx * dx + dy * dy <= r1 * r1) {
          const idx = ((cy1 + dy) * width + (cx1 + dx)) * 4;
          data[idx] = 30; // Dark 2B pencil
          data[idx + 1] = 30;
          data[idx + 2] = 30;
        }
      }
    }

    const item75 = grid75.questionBlocks[74];
    const dChoice = item75.bubbles.find(b => b.choice === 'D');
    const cx75 = Math.floor(dChoice.u * width);
    const cy75 = Math.floor(dChoice.v * height);
    const r75 = Math.floor(dChoice.radius * width);

    for (let dy = -r75; dy <= r75; dy++) {
      for (let dx = -r75; dx <= r75; dx++) {
        if (dx * dx + dy * dy <= r75 * r75) {
          const idx = ((cy75 + dy) * width + (cx75 + dx)) * 4;
          data[idx] = 30; // Dark 2B pencil
          data[idx + 1] = 30;
          data[idx + 2] = 30;
        }
      }
    }

    const decoded75 = decodeQuestionBlocks(
      { width, height, data },
      grid75.questionBlocks,
      calibration
    );

    assert.equal(decoded75.length, 75);
    // Item 1 should have detected choice 'B'
    assert.deepEqual(decoded75[0].detectedChoices, ['B']);
    // Item 75 should have detected choice 'D'
    assert.deepEqual(decoded75[74].detectedChoices, ['D']);
    // Item 2 should be blank (unfilled)
    assert.deepEqual(decoded75[1].detectedChoices, []);

    // Also verify Tier 1 (20 items)
    const grid20 = generate20ItemGridMetadata();
    const item20 = grid20.questionBlocks[19]; // Item 20
    const cChoice = item20.bubbles.find(b => b.choice === 'C');
    const cx20 = Math.floor(cChoice.u * width);
    const cy20 = Math.floor(cChoice.v * height);
    const r20 = Math.floor(cChoice.radius * width);

    for (let dy = -r20; dy <= r20; dy++) {
      for (let dx = -r20; dx <= r20; dx++) {
        if (dx * dx + dy * dy <= r20 * r20) {
          const idx = ((cy20 + dy) * width + (cx20 + dx)) * 4;
          data[idx] = 30; // Dark 2B pencil
          data[idx + 1] = 30;
          data[idx + 2] = 30;
        }
      }
    }

    const decoded20 = decodeQuestionBlocks(
      { width, height, data },
      grid20.questionBlocks,
      calibration
    );

    assert.equal(decoded20.length, 20);
    assert.deepEqual(decoded20[19].detectedChoices, ['C']);
  });

  after(async () => {
    // Clean up created papers
    for (const id of createdPaperIds) {
      await prisma.examPaper.delete({ where: { id } }).catch(() => {});
    }
  });
});
