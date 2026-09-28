import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  generate100ItemGridMetadata,
  resolvePaperChoiceCount,
} from "../../../src/lib/services/omrTemplateService.ts";

const rootDir = process.cwd();
const historyViewPath = path.join(
  rootDir,
  "src/app/(app)/facility/_components/FacilityHistoryView.tsx"
);
const reportsPagePath = path.join(
  rootDir,
  "src/app/(app)/general/facility/reports/page.tsx"
);
const omrCreatePagePath = path.join(
  rootDir,
  "src/app/(app)/academic/exam/omr/create/page.tsx"
);

test("FacilityHistoryView: collapses status filters into a <select> dropdown", () => {
  const content = fs.readFileSync(historyViewPath, "utf8");

  assert.match(
    content,
    /<select[\s\S]*?value=\{statusFilter\}[\s\S]*?onChange=/,
    "FacilityHistoryView should render a <select> dropdown for statusFilter"
  );

  assert.match(content, /<option value="ALL">.*ทั้งหมด.*<\/option>/);
  assert.match(content, /<option value="PENDING">.*รอพิจารณา.*<\/option>/);
  assert.match(content, /<option value="APPROVED">.*อนุมัติแล้ว.*<\/option>/);
  assert.match(content, /<option value="CANCELLED">.*ยกเลิก \/ ปฏิเสธ.*<\/option>/);
});

test("FacilityReportsPage: collapses มิติเวลา into a <select> dropdown and arranges filter layout cleanly", () => {
  const content = fs.readFileSync(reportsPagePath, "utf8");

  assert.match(
    content,
    /<select[\s\S]*?value=\{dimension\}[\s\S]*?onChange=/,
    "FacilityReportsPage should render a <select> dropdown for dimension (มิติเวลา)"
  );

  assert.match(content, /<option value="MONTHLY">.*รายเดือน.*<\/option>/);
  assert.match(content, /<option value="WEEKLY">.*รายสัปดาห์.*<\/option>/);
  assert.match(content, /<option value="FISCAL_YEAR">.*ปีงบประมาณ.*<\/option>/);
  assert.match(content, /<option value="ACADEMIC_YEAR">.*ปีการศึกษา.*<\/option>/);
  assert.match(content, /<option value="CALENDAR_YEAR">.*ปีปฏิทิน.*<\/option>/);

  assert.doesNotMatch(content, /พิมพ์รายงานราชการ \(Print\)/);
  assert.doesNotMatch(content, /อนุมัติแล้ว \(Approved\)/);
  assert.doesNotMatch(content, /ใช้งานจริง \(In Use\)/);
  assert.doesNotMatch(content, /เสร็จสมบูรณ์ \(Done\)/);
  assert.doesNotMatch(content, /ชั่วโมงรวม \(Hours\)/);
  assert.doesNotMatch(content, /ยกเลิกหลังอนุมัติ \(No-Show\)/);
});

test("OMR Template & Create Page: supports 4, 5, and 6 choices (ก–ฉ) and pure Thai UI", () => {
  const meta4 = generate100ItemGridMetadata(4);
  const meta5 = generate100ItemGridMetadata(5);
  const meta6 = generate100ItemGridMetadata(6);

  assert.equal(Object.keys(meta4.questionBlocks[0].bubbles).length, 4);
  assert.equal(Object.keys(meta5.questionBlocks[0].bubbles).length, 5);
  assert.equal(Object.keys(meta6.questionBlocks[0].bubbles).length, 6);
  assert.equal(resolvePaperChoiceCount({ template: { code: "KP-OMR-A4-100-6C" } }), 6);
  assert.equal(resolvePaperChoiceCount({ template: { code: "KP-OMR-A4-100-5C" } }), 5);
  assert.equal(resolvePaperChoiceCount({ template: { code: "KP-OMR-A4-100" } }), 4);

  const createContent = fs.readFileSync(omrCreatePagePath, "utf8");
  assert.match(createContent, /6 ตัวเลือก/);
  assert.match(createContent, /ก–ฉ \(พิเศษ\)/);
  assert.match(createContent, /โหมดเลือกหลายคำตอบ \(ฟรีเครดิต\)/);
});
