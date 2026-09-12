import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  STATUS_TO_TONE_MAP,
  STATUS_THAI_LABELS,
  resolveStatusTone,
  resolveStatusLabel,
  _resetWarnedStatuses,
  TONE_CLASSES,
  TONE_DOT_CLASSES,
  SUBSYSTEM_ACCENTS,
  PRIMARY_ACTION_BUTTON_CLASSES,
  CARD_CLASSES,
} from '../../../src/components/shared-ui/school-ops/tokens.ts';

test('Design System Tokens - resolveStatusTone maps all canonical statuses correctly', () => {
  // Information / Scheduled
  assert.equal(resolveStatusTone('SCHEDULED'), 'info');
  assert.equal(resolveStatusTone('NOT_STARTED'), 'info');
  assert.equal(resolveStatusTone('IN_PROGRESS'), 'info');
  assert.equal(resolveStatusTone('UPCOMING'), 'info');
  assert.equal(resolveStatusTone('DRAFT'), 'neutral');

  // Waiting / Review
  assert.equal(resolveStatusTone('PENDING'), 'warning');
  assert.equal(resolveStatusTone('PENDING_HEAD'), 'warning');
  assert.equal(resolveStatusTone('PENDING_DIRECTOR'), 'warning');
  assert.equal(resolveStatusTone('WAITING_TEACHER_ACK'), 'warning');
  assert.equal(resolveStatusTone('WAITING_DIRECTOR_SIGN'), 'warning');
  assert.equal(resolveStatusTone('SUBMITTED'), 'warning');
  assert.equal(resolveStatusTone('PARTIAL'), 'warning');

  // Success / Approved / Completed
  assert.equal(resolveStatusTone('APPROVED'), 'success');
  assert.equal(resolveStatusTone('COMPLETED'), 'success');
  assert.equal(resolveStatusTone('ACTIVE'), 'success');
  assert.equal(resolveStatusTone('TEACHER_ACKNOWLEDGED'), 'success');
  assert.equal(resolveStatusTone('VALID'), 'success');
  assert.equal(resolveStatusTone('AVAILABLE'), 'success');
  assert.equal(resolveStatusTone('DONE'), 'success');
  assert.equal(resolveStatusTone('RECEIVED'), 'success');

  // Danger / Terminated
  assert.equal(resolveStatusTone('REJECTED'), 'danger');
  assert.equal(resolveStatusTone('CANCELLED'), 'danger');
  assert.equal(resolveStatusTone('CLOSED'), 'danger');
  assert.equal(resolveStatusTone('REVERSED'), 'danger');
  assert.equal(resolveStatusTone('REVOKED'), 'danger');
  assert.equal(resolveStatusTone('UNDER_MAINTENANCE'), 'danger');
  assert.equal(resolveStatusTone('RETIRED'), 'danger');
  assert.equal(resolveStatusTone('FAILED'), 'danger');
});

test('Design System Tokens - resolveStatusTone handles case normalization and whitespace', () => {
  assert.equal(resolveStatusTone('  approved  '), 'success');
  assert.equal(resolveStatusTone('Pending'), 'warning');
  assert.equal(resolveStatusTone('waiting_teacher_ack'), 'warning');
  assert.equal(resolveStatusTone('vAliD'), 'success');
  assert.equal(resolveStatusTone('cancelled'), 'danger');
});

test('Design System Tokens - resolveStatusTone safely falls back to neutral on unknown/null/empty', () => {
  assert.equal(resolveStatusTone(null), 'neutral');
  assert.equal(resolveStatusTone(undefined), 'neutral');
  assert.equal(resolveStatusTone(''), 'neutral');
  assert.equal(resolveStatusTone('   '), 'neutral');
  assert.equal(resolveStatusTone('TOTALLY_UNKNOWN_STATUS_XYZ'), 'neutral');
});

test('Design System Tokens - resolveStatusTone deduplicates console.warn for unknown statuses', () => {
  _resetWarnedStatuses();
  const originalWarn = console.warn;
  let warnCount = 0;
  console.warn = () => { warnCount++; };

  try {
    // Repeated calls with same unknown status
    resolveStatusTone('UNKNOWN_REPEATED_STATE');
    resolveStatusTone('UNKNOWN_REPEATED_STATE');
    resolveStatusTone('unknown_repeated_state');

    assert.equal(warnCount, 1, 'Should log warning only once for the same unknown status');

    // Call with a different unknown status
    resolveStatusTone('ANOTHER_UNKNOWN_STATE');
    assert.equal(warnCount, 2, 'Should log warning once for a new unknown status');
  } finally {
    console.warn = originalWarn;
    _resetWarnedStatuses();
  }
});

test('Design System Tokens - resolveStatusLabel provides Thai translations and fallbacks', () => {
  assert.equal(resolveStatusLabel('APPROVED'), 'อนุมัติแล้ว');
  assert.equal(resolveStatusLabel('PENDING'), 'รอการอนุมัติ');
  assert.equal(resolveStatusLabel('COMPLETED'), 'เสร็จสิ้นสมบูรณ์');
  assert.equal(resolveStatusLabel('VALID'), 'รับรองความถูกต้องแล้ว');
  assert.equal(resolveStatusLabel('AVAILABLE'), 'พร้อมให้บริการ');
  assert.equal(resolveStatusLabel('UNDER_MAINTENANCE'), 'แจ้งซ่อมบำรุง');

  // Fallback for null/undefined/unknown
  assert.equal(resolveStatusLabel(null), '-');
  assert.equal(resolveStatusLabel(undefined, 'ระบุไม่ได้'), 'ระบุไม่ได้');
  assert.equal(resolveStatusLabel('CUSTOM_FOO'), 'CUSTOM_FOO');
  assert.equal(resolveStatusLabel('CUSTOM_FOO', 'กำหนดเอง'), 'กำหนดเอง');
});

test('Design System Tokens - All 5 semantic tones have full CSS class mappings', () => {
  const tones = ['info', 'warning', 'success', 'danger', 'neutral'];
  for (const tone of tones) {
    assert.ok(TONE_CLASSES[tone], `TONE_CLASSES should exist for tone: ${tone}`);
    assert.ok(TONE_CLASSES[tone].includes('bg-'), `TONE_CLASSES for ${tone} should have bg-`);
    assert.ok(TONE_CLASSES[tone].includes('text-'), `TONE_CLASSES for ${tone} should have text-`);
    assert.ok(TONE_CLASSES[tone].includes('border-'), `TONE_CLASSES for ${tone} should have border-`);

    assert.ok(TONE_DOT_CLASSES[tone], `TONE_DOT_CLASSES should exist for tone: ${tone}`);
    assert.ok(TONE_DOT_CLASSES[tone].includes('bg-'), `TONE_DOT_CLASSES for ${tone} should have bg-`);
  }
});

test('Design System Tokens - Subsystem accents are properly configured and isolated', () => {
  const subsystems = ['budget', 'facility_room', 'facility_vehicle', 'supervision', 'certificate'];
  for (const sub of subsystems) {
    const accent = SUBSYSTEM_ACCENTS[sub];
    assert.ok(accent, `SUBSYSTEM_ACCENTS should have entry for ${sub}`);
    assert.ok(accent.name, `Accent ${sub} should have localized Thai name`);
    assert.ok(accent.iconBadge, `Accent ${sub} should have iconBadge class`);
    assert.ok(accent.text, `Accent ${sub} should have text class`);
    assert.ok(accent.border, `Accent ${sub} should have border class`);
    assert.ok(accent.bgSoft, `Accent ${sub} should have bgSoft class`);
  }

  // Budget should be emerald
  assert.ok(SUBSYSTEM_ACCENTS.budget.iconBadge.includes('emerald'));
  // Facility room should be teal
  assert.ok(SUBSYSTEM_ACCENTS.facility_room.iconBadge.includes('teal'));
  // Facility vehicle should be amber
  assert.ok(SUBSYSTEM_ACCENTS.facility_vehicle.iconBadge.includes('amber'));
  // Supervision should be indigo
  assert.ok(SUBSYSTEM_ACCENTS.supervision.iconBadge.includes('indigo'));
  // Certificate should be amber
  assert.ok(SUBSYSTEM_ACCENTS.certificate.iconBadge.includes('amber'));

  // Primary action button is strictly Unified Indigo
  assert.ok(PRIMARY_ACTION_BUTTON_CLASSES.includes('bg-indigo-600'), 'Primary button must be Unified Indigo');
});

test('Design System Primitives - all required primitive component files exist', () => {
  const baseDir = path.resolve(process.cwd(), 'src/components/shared-ui/school-ops');
  
  const expectedFiles = [
    'tokens.ts',
    'StatusPillBadge.tsx',
    'SubsystemHeader.tsx',
    'ExecutiveStatCard.tsx',
    'UnifiedModal.tsx',
    'MatrixPrimitives.tsx',
    'index.ts',
  ];

  for (const file of expectedFiles) {
    const fullPath = path.join(baseDir, file);
    assert.ok(fs.existsSync(fullPath), `Primitive file ${file} should exist in ${baseDir}`);
  }
});

