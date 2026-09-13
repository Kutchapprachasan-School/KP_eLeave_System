import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FontRegistry,
  UNIVERSAL_TEST_GLYPHS,
} from '../../../src/app/(app)/document/_components/designer/font-registry.ts';
import {
  ensureFontsLoaded,
} from '../../../src/app/(app)/document/_components/designer/font-loader.ts';
import {
  FONT_MANIFEST,
  SUPPORTED_FONTS,
} from '../../../src/app/(app)/document/_components/designer/font-manifest.ts';
import {
  calculateStaticPurgeDate,
  calculateDaysRemaining,
  computeRestoreDate,
  evaluateChronoDateBounds,
  evaluateRecycleBinPermission,
} from '../../../src/services/recycle-bin/recycle-bin.service.ts';

test('Recycle Bin, Chrono Guard & Verified Font Studio Invariants Suite', async (t) => {
  // -------------------------------------------------------------
  // Test 54: FontRegistry State Machine & Definition Lookup (Phase 1)
  // -------------------------------------------------------------
  await t.test('54. FontRegistry State Machine: looks up definitions, tracks status cache, and handles custom fonts', () => {
    FontRegistry.resetCache();

    // 1. Initial lookup from manifest returns IDLE entry with definition
    const sarabun = FontRegistry.getFont('Sarabun');
    assert.equal(sarabun.family, 'Sarabun');
    assert.equal(sarabun.status, 'IDLE');
    assert.ok(sarabun.definition);
    assert.equal(sarabun.definition.category, 'formal');

    // 2. Custom font registration
    const customFont = {
      family: 'MyCustomFont',
      attachmentId: 'att_f_123',
      storageKey: 'fonts/my-font.woff2',
      format: 'woff2',
    };
    FontRegistry.registerCustomFont(customFont);

    const retrievedCustom = FontRegistry.getFont('MyCustomFont');
    assert.equal(retrievedCustom.family, 'MyCustomFont');
    assert.equal(retrievedCustom.status, 'IDLE');
    assert.equal(retrievedCustom.definition.attachmentId, 'att_f_123');
  });

  // -------------------------------------------------------------
  // Test 55: FontRegistry Promise Deduplication & Universal Loading (Phase 1)
  // -------------------------------------------------------------
  await t.test('55. FontRegistry Promise Deduplication: concurrent loads share single promise and transition to READY', async () => {
    FontRegistry.resetCache();

    // Start two concurrent loads for Cinzel (English serif)
    const p1 = FontRegistry.loadFont('Cinzel');
    const p2 = FontRegistry.loadFont('Cinzel');

    // Both promises must be the exact same in-flight reference (Deduplication)
    assert.equal(p1, p2);

    const res1 = await p1;
    const res2 = await p2;
    assert.equal(res1, true);
    assert.equal(res2, true);

    const cinzelEntry = FontRegistry.getFont('Cinzel');
    assert.equal(cinzelEntry.status, 'READY');
    assert.ok(cinzelEntry.loadedAt);
  });

  // -------------------------------------------------------------
  // Test 56: Verified Canvas Font Metric Check (Offscreen Canvas Gate)
  // -------------------------------------------------------------
  await t.test('56. ensureCanvasFontReady: verifies context font readiness before drawing', async () => {
    FontRegistry.resetCache();

    const mockCtx = {
      font: '',
      measureText: (text) => ({ width: text.length * 10 }),
    };

    const ready = await FontRegistry.ensureCanvasFontReady(mockCtx, 'Noto Sans JP', 'bold');
    assert.equal(ready, true);
  });

  // -------------------------------------------------------------
  // Test 57: Template Font Batch Verification
  // -------------------------------------------------------------
  await t.test('57. ensureTemplateFontsReady: verifies all template fonts across languages', async () => {
    FontRegistry.resetCache();

    const templateFamilies = ['Sarabun', 'Playfair Display', 'Noto Sans JP', 'Noto Serif SC'];
    const result = await FontRegistry.ensureTemplateFontsReady(templateFamilies);

    assert.equal(result.allReady, true);
    assert.equal(result.failed.length, 0);

    for (const fam of templateFamilies) {
      assert.equal(FontRegistry.getFont(fam).status, 'READY');
    }
  });

  // -------------------------------------------------------------
  // Test 58: font-loader.ts universal delegation
  // -------------------------------------------------------------
  await t.test('58. ensureFontsLoaded: delegates to FontRegistry and preloads all supported fonts', async () => {
    const loadedSet = await ensureFontsLoaded();
    assert.ok(loadedSet.verifiedAt > 0);

    for (const f of SUPPORTED_FONTS) {
      assert.equal(loadedSet.fontsLoaded[f], true, `Font ${f} must be marked loaded`);
    }
  });

  // -------------------------------------------------------------
  // Test 59: Calculate static purge date and days remaining
  // -------------------------------------------------------------
  await t.test('59. calculateStaticPurgeDate: fixes static purge date and computes accurate remaining days', () => {
    const fixedNow = new Date('2026-09-12T10:00:00.000Z');
    const purge30 = calculateStaticPurgeDate(fixedNow, 30);

    // Exactly 30 days later in milliseconds (30 * 86,400,000 ms)
    assert.equal(purge30.getTime() - fixedNow.getTime(), 30 * 24 * 60 * 60 * 1000);

    // Days remaining calculations
    const remainingDay0 = calculateDaysRemaining(purge30, fixedNow);
    assert.equal(remainingDay0, 30);

    const nowAfter10Days = new Date(fixedNow.getTime() + 10 * 24 * 60 * 60 * 1000);
    const remainingDay10 = calculateDaysRemaining(purge30, nowAfter10Days);
    assert.equal(remainingDay10, 20);

    const nowAfter35Days = new Date(fixedNow.getTime() + 35 * 24 * 60 * 60 * 1000);
    const remainingExpired = calculateDaysRemaining(purge30, nowAfter35Days);
    assert.equal(remainingExpired, 0); // Floor at 0, no negative numbers!
  });

  // -------------------------------------------------------------
  // Test 60: Soft-Delete Idempotency Simulation
  // -------------------------------------------------------------
  await t.test('60. Soft-Delete Idempotency: repeated delete calls are no-ops and keep original purgeAt unchanged', () => {
    const record = {
      id: 'doc_1',
      isDeleted: false,
      deletedAt: null,
      purgeAt: null,
    };

    function simulateSoftDelete(rec, now, retentionDays) {
      if (rec.isDeleted) {
        return { success: true, count: 0, message: 'ALREADY_DELETED', record: rec };
      }
      rec.isDeleted = true;
      rec.deletedAt = now;
      rec.purgeAt = calculateStaticPurgeDate(now, retentionDays);
      return { success: true, count: 1, record: rec };
    }

    const t1 = new Date('2026-09-12T10:00:00Z');
    const res1 = simulateSoftDelete(record, t1, 30);
    assert.equal(res1.count, 1);
    assert.equal(res1.record.isDeleted, true);
    assert.equal(res1.record.purgeAt.toISOString(), '2026-10-12T10:00:00.000Z');

    // Second call 5 days later with different retention setting (e.g. 60 days)
    const t2 = new Date('2026-09-17T10:00:00Z');
    const res2 = simulateSoftDelete(record, t2, 60);
    assert.equal(res2.count, 0);
    assert.equal(res2.message, 'ALREADY_DELETED');
    // purgeAt MUST NOT be recomputed or changed!
    assert.equal(res2.record.purgeAt.toISOString(), '2026-10-12T10:00:00.000Z');
  });

  // -------------------------------------------------------------
  // Test 61: Restore Idempotency Simulation
  // -------------------------------------------------------------
  await t.test('61. Restore Idempotency: restoring an already active record is a safe no-op', () => {
    const activeDoc = {
      id: 'doc_active',
      isDeleted: false,
      seqNo: 5,
      docNo: '5/2569',
    };

    function simulateRestore(rec) {
      if (!rec.isDeleted) {
        return { success: true, count: 0, message: 'ALREADY_ACTIVE' };
      }
      rec.isDeleted = false;
      return { success: true, count: 1 };
    }

    const res = simulateRestore(activeDoc);
    assert.equal(res.count, 0);
    assert.equal(res.message, 'ALREADY_ACTIVE');
    assert.equal(activeDoc.seqNo, 5); // Sequence untouched!
  });

  // -------------------------------------------------------------
  // Test 62: State-Bound Leave Quota Rule
  // -------------------------------------------------------------
  await t.test('62. State-Bound Leave Quota: refunds/deducts quota ONLY for APPROVED requests', () => {
    function handleLeaveSoftDelete(leave) {
      if (leave.status === 'APPROVED') {
        return { refundQuota: true, days: leave.days };
      }
      return { refundQuota: false, days: 0 };
    }

    function handleLeaveRestore(leave) {
      if (leave.status === 'APPROVED') {
        return { deductQuota: true, days: leave.days };
      }
      return { deductQuota: false, days: 0 };
    }

    // A. Approved leave: must refund on delete and re-deduct on restore
    const approvedLeave = { id: 'l_1', status: 'APPROVED', days: 3 };
    assert.deepEqual(handleLeaveSoftDelete(approvedLeave), { refundQuota: true, days: 3 });
    assert.deepEqual(handleLeaveRestore(approvedLeave), { deductQuota: true, days: 3 });

    // B. Pending leave: zero quota modification
    const pendingLeave = { id: 'l_2', status: 'PENDING', days: 2 };
    assert.deepEqual(handleLeaveSoftDelete(pendingLeave), { refundQuota: false, days: 0 });
    assert.deepEqual(handleLeaveRestore(pendingLeave), { deductQuota: false, days: 0 });

    // C. Rejected leave: zero quota modification
    const rejectedLeave = { id: 'l_3', status: 'REJECTED', days: 4 };
    assert.deepEqual(handleLeaveSoftDelete(rejectedLeave), { refundQuota: false, days: 0 });
    assert.deepEqual(handleLeaveRestore(rejectedLeave), { deductQuota: false, days: 0 });
  });

  // -------------------------------------------------------------
  // Test 63: Chrono-Sequential Bounded Modification
  // -------------------------------------------------------------
  await t.test('63. evaluateChronoDateBounds: enforces prevDate <= newDate <= nextDate', () => {
    const prevDate = new Date('2026-09-10T00:00:00Z');
    const nextDate = new Date('2026-09-20T00:00:00Z');

    // 1. Valid date in range [10 Sep, 20 Sep]
    const validMid = evaluateChronoDateBounds({
      newDate: new Date('2026-09-15T00:00:00Z'),
      prevDate,
      nextDate,
    });
    assert.equal(validMid.valid, true);

    // 2. Exact boundary match is valid
    const boundaryPrev = evaluateChronoDateBounds({
      newDate: new Date('2026-09-10T00:00:00Z'),
      prevDate,
      nextDate,
    });
    assert.equal(boundaryPrev.valid, true);

    const boundaryNext = evaluateChronoDateBounds({
      newDate: new Date('2026-09-20T00:00:00Z'),
      prevDate,
      nextDate,
    });
    assert.equal(boundaryNext.valid, true);

    // 3. Backdated before prevDate is rejected
    const invalidPast = evaluateChronoDateBounds({
      newDate: new Date('2026-09-09T00:00:00Z'),
      prevDate,
      nextDate,
    });
    assert.equal(invalidPast.valid, false);
    assert.ok(invalidPast.error?.includes('ต้องไม่ย้อนหลังกว่าลำดับก่อนหน้า'));

    // 4. Future after nextDate is rejected
    const invalidFuture = evaluateChronoDateBounds({
      newDate: new Date('2026-09-21T00:00:00Z'),
      prevDate,
      nextDate,
    });
    assert.equal(invalidFuture.valid, false);
    assert.ok(invalidFuture.error?.includes('ต้องไม่ล้ำหน้ากว่าลำดับถัดไป'));
  });

  // -------------------------------------------------------------
  // Test 64: Certificate Restore Timeline Reassignment
  // -------------------------------------------------------------
  await t.test('64. computeRestoreDate: dynamically assigns max(latestActiveBatchDate, today)', () => {
    const today = new Date('2026-09-12T08:00:00Z');

    // Scenario A: Latest batch date is in the past (e.g. 5 Sep) -> RestoreDate becomes today
    const pastBatchDate = new Date('2026-09-05T08:00:00Z');
    const resA = computeRestoreDate(pastBatchDate, today);
    assert.equal(resA.getTime(), today.getTime());

    // Scenario B: Latest batch date is in the future (e.g. 18 Sep) -> RestoreDate must NOT go backwards!
    const futureBatchDate = new Date('2026-09-18T08:00:00Z');
    const resB = computeRestoreDate(futureBatchDate, today);
    assert.equal(resB.getTime(), futureBatchDate.getTime());

    // Scenario C: No active batches exist -> defaults to today
    const resC = computeRestoreDate(null, today);
    assert.equal(resC.getTime(), today.getTime());
  });

  // -------------------------------------------------------------
  // Test 65: RBAC Matrix Enforcement
  // -------------------------------------------------------------
  await t.test('65. evaluateRecycleBinPermission: enforces strict permissions across all 3 modules', () => {
    const adminUser = { userId: 'u_admin', userRole: 'ADMIN' };
    const hrUser = { userId: 'u_hr', userRole: 'HR' };
    const teacherA = { userId: 'u_teacherA', userRole: 'TEACHER' };
    const teacherB = { userId: 'u_teacherB', userRole: 'TEACHER' };

    // 1. Official Documents (DOCUMENT): strictly Admin only
    assert.equal(evaluateRecycleBinPermission('DELETE', 'DOCUMENT', adminUser).allowed, true);
    assert.equal(evaluateRecycleBinPermission('DELETE', 'DOCUMENT', hrUser).allowed, false);
    assert.equal(evaluateRecycleBinPermission('DELETE', 'DOCUMENT', teacherA).allowed, false);

    // 2. Leave Requests (LEAVE): Admin & HR only
    assert.equal(evaluateRecycleBinPermission('DELETE', 'LEAVE', adminUser).allowed, true);
    assert.equal(evaluateRecycleBinPermission('DELETE', 'LEAVE', hrUser).allowed, true);
    assert.equal(evaluateRecycleBinPermission('DELETE', 'LEAVE', teacherA).allowed, false);

    // 3. Certificates (CERTIFICATE):
    // Self-service for creator
    assert.equal(evaluateRecycleBinPermission('DELETE', 'CERTIFICATE', teacherA, 'u_teacherA').allowed, true);
    // Non-owner teacher blocked
    assert.equal(evaluateRecycleBinPermission('DELETE', 'CERTIFICATE', teacherB, 'u_teacherA').allowed, false);
    // Admin allowed
    assert.equal(evaluateRecycleBinPermission('DELETE', 'CERTIFICATE', adminUser, 'u_teacherA').allowed, true);

    // Hard Purge: strictly Admin only
    assert.equal(evaluateRecycleBinPermission('PURGE', 'CERTIFICATE', adminUser, 'u_teacherA').allowed, true);
    assert.equal(evaluateRecycleBinPermission('PURGE', 'CERTIFICATE', teacherA, 'u_teacherA').allowed, false);
  });

  // -------------------------------------------------------------
  // Test 66: Hard Purge Attachment Reference Lifecycle Simulation
  // -------------------------------------------------------------
  await t.test('66. Hard Purge Attachment Lifecycle: releases all attachment references before row deletion', () => {
    const releasedAttachmentIds = [];

    function simulatePurge(record) {
      if (record.attachments && record.attachments.length > 0) {
        for (const att of record.attachments) {
          releasedAttachmentIds.push(att.id);
        }
      }
      return { success: true, count: 1 };
    }

    const docWithAttachments = {
      id: 'doc_with_files',
      attachments: [{ id: 'att_1' }, { id: 'att_2' }, { id: 'att_3' }],
    };

    const res = simulatePurge(docWithAttachments);
    assert.equal(res.success, true);
    assert.deepEqual(releasedAttachmentIds, ['att_1', 'att_2', 'att_3']);
  });

  // -------------------------------------------------------------
  // Test 67: Retention Setting Boundary Validation
  // -------------------------------------------------------------
  await t.test('67. Retention Days Validation: enforces 7 to 90 days range bounds', () => {
    function validateRetentionDays(days) {
      if (typeof days !== 'number' || isNaN(days)) return { valid: false, error: 'Invalid number' };
      if (days < 7 || days > 90) return { valid: false, error: 'Range must be between 7 and 90 days' };
      return { valid: true };
    }

    assert.equal(validateRetentionDays(7).valid, true);
    assert.equal(validateRetentionDays(30).valid, true);
    assert.equal(validateRetentionDays(90).valid, true);
    assert.equal(validateRetentionDays(6).valid, false);
    assert.equal(validateRetentionDays(91).valid, false);
    assert.equal(validateRetentionDays(0).valid, false);
    assert.equal(validateRetentionDays(-5).valid, false);
  });

  // -------------------------------------------------------------
  // Test 68: Recycle Bin Days Remaining Alert Threshold
  // -------------------------------------------------------------
  await t.test('68. calculateDaysRemaining Alert Threshold: identifies items expiring soon (<= 7 days)', () => {
    const baseNow = new Date('2026-09-13T00:00:00Z');

    // Item 1: 5 days remaining -> Expiring Soon (alert = true)
    const purgeDate5 = new Date('2026-09-18T00:00:00Z');
    const days5 = calculateDaysRemaining(purgeDate5, baseNow);
    assert.equal(days5, 5);
    assert.ok(days5 <= 7);

    // Item 2: 25 days remaining -> Normal (alert = false)
    const purgeDate25 = new Date('2026-10-08T00:00:00Z');
    const days25 = calculateDaysRemaining(purgeDate25, baseNow);
    assert.equal(days25, 25);
    assert.ok(days25 > 7);

    // Item 3: Expired yesterday -> 0 days remaining
    const expiredPurgeDate = new Date('2026-09-12T00:00:00Z');
    const daysExpired = calculateDaysRemaining(expiredPurgeDate, baseNow);
    assert.equal(daysExpired, 0);
  });
});

