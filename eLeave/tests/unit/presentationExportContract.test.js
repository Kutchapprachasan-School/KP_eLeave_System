import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCanonicalReportColumns,
  generateCanonicalCsv,
  buildExportViewModel,
} from '../../../src/lib/report-export.ts';

const mockCanonicalReport = {
  fiscalYear: 2568,
  cycle: 'cycle1',
  cycleLabelTh: 'รอบที่ 1 (ต.ค. - มี.ค.) ปีงบประมาณ 2568',
  canonicalTypes: [
    { type: 'SICK', name: 'ลาป่วย' },
    { type: 'PERSONAL', name: 'ลากิจส่วนตัว' },
    { type: 'VACATION', name: 'ลาพักผ่อน' },
  ],
  staffCount: 3,
  users: [
    {
      userId: 'u-1',
      userName: 'นายสมศักดิ์ รักเรียน',
      position: 'ผู้อำนวยการ',
      level: 'เชี่ยวชาญ',
      subjectGroup: 'ผู้อำนวยการโรงเรียน',
      byType: {
        SICK: { times: 1, days: 2 },
        PERSONAL: { times: 0, days: 0 },
        VACATION: { times: 0, days: 0 },
      },
      totalTimes: 1,
      totalDays: 2,
    },
    {
      userId: 'u-2',
      userName: 'นางสาวใจดี มีสุข',
      position: 'ครู',
      level: 'ชำนาญการพิเศษ',
      subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
      byType: {
        SICK: { times: 0, days: 0 },
        PERSONAL: { times: 1, days: 1 },
        VACATION: { times: 0, days: 0 },
      },
      totalTimes: 1,
      totalDays: 1,
    },
    {
      userId: 'u-3',
      userName: 'นายครูใหม่ ไฟแรง',
      position: 'ครูผู้ช่วย',
      level: null,
      subjectGroup: 'คณิตศาสตร์',
      byType: {
        SICK: { times: 0, days: 0 },
        PERSONAL: { times: 0, days: 0 },
        VACATION: { times: 0, days: 0 },
      },
      totalTimes: 0,
      totalDays: 0,
    },
  ],
};

describe('Presentation Export Contract & Column Parity', () => {
  const visibleTypes = [
    { type: 'SICK', name: 'ลาป่วย' },
    { type: 'PERSONAL', name: 'ลากิจส่วนตัว' },
  ];

  test('getCanonicalReportColumns respects showLevelColumn: true', () => {
    const cols = getCanonicalReportColumns({
      showLevelColumn: true,
      visibleTypes,
      groupByGroup: true,
    });

    const levelCol = cols.find(c => c.key === 'level');
    assert.ok(levelCol, 'Expected level column to be present');
    assert.equal(levelCol.header, 'วิทยฐานะ');
    assert.equal(cols.length, 8);
  });

  test('getCanonicalReportColumns respects showLevelColumn: false', () => {
    const cols = getCanonicalReportColumns({
      showLevelColumn: false,
      visibleTypes,
      groupByGroup: true,
    });

    const levelCol = cols.find(c => c.key === 'level');
    assert.equal(levelCol, undefined, 'Expected level column to be excluded');
    assert.equal(cols.length, 7);
  });

  test('getCanonicalReportColumns respects groupByGroup: false', () => {
    const cols = getCanonicalReportColumns({
      showLevelColumn: true,
      visibleTypes,
      groupByGroup: false,
    });

    const subjectGroupCol = cols.find(c => c.key === 'subjectGroup');
    assert.ok(subjectGroupCol, 'Expected subjectGroup column when groupByGroup is false');
    assert.equal(cols.length, 9);
  });

  test('generateCanonicalCsv includes UTF-8 BOM and correct columns with showLevelColumn: true', () => {
    const viewModel = buildExportViewModel(mockCanonicalReport, {
      scope: 'all',
      groupByGroup: true,
      hideUnusedTypes: true,
    });

    const csv = generateCanonicalCsv(viewModel, {
      showLevelColumn: true,
      groupByGroup: true,
    });

    assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Thai Excel compatibility');

    const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
    assert.ok(lines.length >= 4, 'Expected header + 3 data rows + total row');

    const header = lines[0].split(',');
    assert.ok(header.includes('"วิทยฐานะ"') || header.includes('วิทยฐานะ'), 'Header must contain วิทยฐานะ');

    // Contains all expected academic standing strings
    assert.ok(csv.includes('เชี่ยวชาญ'));
    assert.ok(csv.includes('ชำนาญการพิเศษ'));
  });

  test('generateCanonicalCsv completely omits academic standing when showLevelColumn: false', () => {
    const viewModel = buildExportViewModel(mockCanonicalReport, {
      scope: 'all',
      groupByGroup: true,
      hideUnusedTypes: true,
    });

    const csvWithLevel = generateCanonicalCsv(viewModel, {
      showLevelColumn: true,
      groupByGroup: true,
    });
    const csvWithoutLevel = generateCanonicalCsv(viewModel, {
      showLevelColumn: false,
      groupByGroup: true,
    });

    const headerWith = csvWithLevel.replace('\uFEFF', '').split('\r\n')[0].split(',');
    const headerWithout = csvWithoutLevel.replace('\uFEFF', '').split('\r\n')[0].split(',');

    assert.equal(headerWithout.length, headerWith.length - 1, 'Column count must decrease by exactly 1');
    assert.ok(!headerWithout.includes('วิทยฐานะ') && !headerWithout.includes('"วิทยฐานะ"'));
    assert.ok(!csvWithoutLevel.includes('เชี่ยวชาญ'));
    assert.ok(!csvWithoutLevel.includes('ชำนาญการพิเศษ'));
  });

  test('Data Immutability Contract: presentation functions do NOT mutate DTO or ViewModel', () => {
    const viewModel = buildExportViewModel(mockCanonicalReport, {
      scope: 'all',
      groupByGroup: true,
      hideUnusedTypes: true,
    });

    const directorRow = viewModel.displayRows.find(r => r.userId === 'u-1');
    const teacherRow = viewModel.displayRows.find(r => r.userId === 'u-2');
    const assistantRow = viewModel.displayRows.find(r => r.userId === 'u-3');

    assert.equal(directorRow.level, 'เชี่ยวชาญ');
    assert.equal(teacherRow.level, 'ชำนาญการพิเศษ');
    assert.equal(assistantRow.level, null);

    // Call with showLevelColumn: false
    generateCanonicalCsv(viewModel, { showLevelColumn: false, groupByGroup: true });
    getCanonicalReportColumns({ showLevelColumn: false, visibleTypes, groupByGroup: true });

    // Ensure raw fields inside displayRows remain 100% intact
    assert.equal(directorRow.level, 'เชี่ยวชาญ');
    assert.equal(teacherRow.level, 'ชำนาญการพิเศษ');
    assert.equal(assistantRow.level, null);
    assert.equal(mockCanonicalReport.users[0].level, 'เชี่ยวชาญ');
    assert.equal(mockCanonicalReport.users[1].level, 'ชำนาญการพิเศษ');
    assert.equal(mockCanonicalReport.users[2].level, null);
  });
});
