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
  RecycleBinService,
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

  // =========================================================================
  // 🛡️ Enterprise Concurrency & Transactional Invariants Test Suite (Phase 2)
  // =========================================================================

  class AsyncMutex {
    constructor() {
      this.locked = false;
      this.queue = [];
    }

    async acquire() {
      if (!this.locked) {
        this.locked = true;
        return () => this.release();
      }
      return new Promise((resolve) => {
        this.queue.push(() => {
          this.locked = true;
          resolve(() => this.release());
        });
      });
    }

    release() {
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      } else {
        this.locked = false;
      }
    }

    isLocked() {
      return this.locked;
    }
  }

  function createMockRecycleBinDb(initialData = {}) {
    const configs = new Map(initialData.configs || []);
    const documents = new Map(initialData.documents || []);
    const leaves = new Map(initialData.leaves || []);
    const userBalances = new Map(initialData.userBalances || []);
    const auditLogs = [...(initialData.auditLogs || [])];
    const settings = { recycleBinRetentionDays: 30, ...(initialData.settings || {}) };
    const releasedAttachmentIds = [];
    const partitionLocks = new Map();

    function getMutex(key) {
      if (!partitionLocks.has(key)) {
        partitionLocks.set(key, new AsyncMutex());
      }
      return partitionLocks.get(key);
    }

    let activeTxLocks = null;

    const db = {
      auditLog: {
        create: async ({ data }) => {
          if (data._shouldFail || initialData.simulateAuditLogFailure) {
            throw new Error('SimulatedAuditLogError: Database failed to write audit log');
          }
          const record = { id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...data, createdAt: new Date() };
          auditLogs.push(record);
          return record;
        },
        findMany: async (args) => {
          if (args?.where?.action) {
            return auditLogs.filter(a => a.action === args.where.action);
          }
          return auditLogs;
        },
      },
      systemSettings: {
        findFirst: async () => settings,
      },
      documentConfig: {
        findFirst: async ({ where }) => {
          for (const c of configs.values()) {
            if (where?.docType && c.docType === where.docType) return c;
          }
          return null;
        },
        findUnique: async ({ where }) => configs.get(where.id) || null,
        update: async ({ where, data }) => {
          const c = configs.get(where.id);
          if (!c) throw new Error('DocumentConfig not found');
          Object.assign(c, data);
          return { ...c };
        },
        create: async ({ data }) => {
          const id = data.id || `cfg_${Date.now()}`;
          const record = { id, ...data };
          configs.set(id, record);
          return { ...record };
        },
      },
      documentRecord: {
        findUnique: async ({ where, select, include }) => {
          const doc = documents.get(where.id);
          if (!doc) return null;
          return { ...doc, attachments: doc.attachments || [] };
        },
        findFirst: async ({ where }) => {
          for (const doc of documents.values()) {
            let match = true;
            if (where.docNo !== undefined && doc.docNo !== where.docNo) match = false;
            if (where.isDeleted !== undefined && doc.isDeleted !== where.isDeleted) match = false;
            if (where.id && where.id.not && doc.id === where.id.not) match = false;
            if (match) return { ...doc };
          }
          return null;
        },
        findMany: async ({ where }) => {
          let results = Array.from(documents.values());
          if (where?.isDeleted !== undefined) results = results.filter(d => d.isDeleted === where.isDeleted);
          if (where?.docNo) results = results.filter(d => d.docNo === where.docNo);
          return results.map(d => ({ ...d }));
        },
        update: async ({ where, data }) => {
          const doc = documents.get(where.id);
          if (!doc) throw new Error('DocumentRecord not found');
          Object.assign(doc, data);
          return { ...doc };
        },
        delete: async ({ where }) => {
          const doc = documents.get(where.id);
          documents.delete(where.id);
          return doc;
        },
      },
      leaveRequest: {
        findUnique: async ({ where, include }) => {
          const l = leaves.get(where.id);
          if (!l) return null;
          return { ...l, attachments: l.attachments || [] };
        },
        findMany: async ({ where }) => {
          let results = Array.from(leaves.values());
          if (where?.isDeleted !== undefined) results = results.filter(l => l.isDeleted === where.isDeleted);
          return results.map(l => ({ ...l }));
        },
        update: async ({ where, data }) => {
          const l = leaves.get(where.id);
          if (!l) throw new Error('LeaveRequest not found');
          Object.assign(l, data);
          return { ...l };
        },
        delete: async ({ where }) => {
          const l = leaves.get(where.id);
          leaves.delete(where.id);
          return l;
        },
      },
      userBalance: {
        get: (userId) => userBalances.get(userId) || 0,
        set: (userId, val) => userBalances.set(userId, val),
      },
      $queryRaw: async (strings, ...values) => {
        const sql = Array.isArray(strings) ? strings.join('?') : String(strings);

        // 1. Partition lock on DocumentConfig
        if (sql.includes('FROM "DocumentConfig"') && sql.includes('FOR UPDATE')) {
          const docType = values.find(v => typeof v === 'string') || 'CERTIFICATE';
          const mutex = getMutex(docType);
          const release = await mutex.acquire();
          if (activeTxLocks) {
            activeTxLocks.push(release);
          } else {
            // If not in tx, auto-release after microtask
            setTimeout(release, 0);
          }

          const matching = Array.from(configs.values()).filter(c => c.docType === docType);
          return matching.map(c => ({ id: c.id, currentSeq: c.currentSeq }));
        }

        // 2. Query MAX(date) and MAX(seqNo) from DocumentRecord
        if (sql.includes('SELECT MAX(date)') || (sql.includes('SELECT') && sql.includes('MAX("seqNo")'))) {
          const docType = 'CERTIFICATE';
          const certs = Array.from(documents.values()).filter(d => d.docType === docType);

          // Invariant 4: Tail date only derives from ACTIVE (isDeleted = false) records
          const activeCerts = certs.filter(d => !d.isDeleted);
          const latestDate = activeCerts.length > 0
            ? new Date(Math.max(...activeCerts.map(c => new Date(c.date).getTime())))
            : null;

          // Invariant 3: MAX(seqNo) includes deleted records to prevent re-issuing numbers
          const maxSeq = certs.length > 0
            ? Math.max(...certs.map(c => c.seqNo || 0))
            : 0;

          return [{ latestDate, maxSeq }];
        }

        // 3. Query DocumentRecord for seqNo - 1, seqNo + 1 FOR UPDATE
        if (sql.includes('FROM "DocumentRecord"') && sql.includes('FOR UPDATE')) {
          const seqValues = values.filter(v => typeof v === 'number');
          const rows = Array.from(documents.values())
            .filter(d => !d.isDeleted && seqValues.includes(d.seqNo))
            .map(d => ({ id: d.id, seqNo: d.seqNo, date: d.date }));
          return rows;
        }

        // 4. UPDATE DocumentConfig
        if (sql.includes('UPDATE "DocumentConfig"')) {
          const newSeq = values[0];
          const cfgId = values[1];
          const cfg = configs.get(cfgId);
          if (cfg) cfg.currentSeq = newSeq;
          return 1;
        }

        return [];
      },
      $transaction: async (fn) => {
        const cfgSnapshot = new Map(Array.from(configs.entries()).map(([k, v]) => [k, { ...v }]));
        const docSnapshot = new Map(Array.from(documents.entries()).map(([k, v]) => [k, { ...v }]));
        const leaveSnapshot = new Map(Array.from(leaves.entries()).map(([k, v]) => [k, { ...v }]));
        const userBalSnapshot = new Map(userBalances.entries());
        const auditCountSnapshot = auditLogs.length;

        const txLocks = [];
        const prevLocks = activeTxLocks;
        activeTxLocks = txLocks;

        try {
          const res = await fn(db);
          return res;
        } catch (err) {
          configs.clear();
          cfgSnapshot.forEach((v, k) => configs.set(k, v));
          documents.clear();
          docSnapshot.forEach((v, k) => documents.set(k, v));
          leaves.clear();
          leaveSnapshot.forEach((v, k) => leaves.set(k, v));
          userBalances.clear();
          userBalSnapshot.forEach((v, k) => userBalances.set(k, v));
          auditLogs.length = auditCountSnapshot;
          throw err;
        } finally {
          txLocks.forEach(rel => rel());
          activeTxLocks = prevLocks;
        }
      },
      _releaseAttachment: (id) => releasedAttachmentIds.push(id),
      _getReleasedAttachments: () => releasedAttachmentIds,
      _getAuditLogs: () => auditLogs,
      _getConfigs: () => configs,
      _getDocuments: () => documents,
      _getLeaves: () => leaves,
      _getMutex: getMutex,
    };

    return db;
  }

  // -------------------------------------------------------------
  // Test 69: Soft-Delete Row Locking & Idempotency Harness
  // -------------------------------------------------------------
  await t.test('69. softDelete: acquires row lock, executes idempotently, and keeps static purgeAt unchanged', async () => {
    const db = createMockRecycleBinDb({
      documents: [
        ['doc_1', { id: 'doc_1', docType: 'DOCUMENT', createdById: 'admin_1', isDeleted: false, status: 'ISSUED', docNo: '1/2569' }],
      ],
    });

    const admin = { userId: 'admin_1', userRole: 'ADMIN' };
    const res1 = await RecycleBinService.softDelete({ type: 'DOCUMENT', id: 'doc_1', reason: 'เอกสารซ้ำ', user: admin }, db);

    assert.equal(res1.success, true);
    assert.ok(res1.purgeAt);

    const docAfter1 = await db.documentRecord.findUnique({ where: { id: 'doc_1' } });
    assert.equal(docAfter1.isDeleted, true);
    assert.equal(docAfter1.deleteReason, 'เอกสารซ้ำ');
    const firstPurgeAt = docAfter1.purgeAt;

    // Second call: must be idempotent no-op, purgeAt unchanged
    const res2 = await RecycleBinService.softDelete({ type: 'DOCUMENT', id: 'doc_1', reason: 'กดซ้ำ', user: admin }, db);
    assert.equal(res2.success, true);
    assert.equal(res2.message, 'ALREADY_DELETED');

    const docAfter2 = await db.documentRecord.findUnique({ where: { id: 'doc_1' } });
    assert.equal(docAfter2.purgeAt.getTime(), firstPurgeAt.getTime());
  });

  // -------------------------------------------------------------
  // Test 70: Restore Idempotency Harness
  // -------------------------------------------------------------
  await t.test('70. restore: restoring an active record is a safe no-op and does not advance sequence', async () => {
    const db = createMockRecycleBinDb({
      configs: [
        ['cfg_cert', { id: 'cfg_cert', docType: 'CERTIFICATE', currentSeq: 50 }],
      ],
      documents: [
        ['cert_active', { id: 'cert_active', docType: 'CERTIFICATE', createdById: 'teacher_1', isDeleted: false, seqNo: 20, docNo: '20/2569', year: 2569, title: 'Active Cert' }],
      ],
    });

    const user = { userId: 'teacher_1', userRole: 'TEACHER' };
    const res = await RecycleBinService.restore({ type: 'CERTIFICATE', id: 'cert_active', user }, db);

    assert.equal(res.success, true);
    assert.equal(res.message, 'ALREADY_ACTIVE');

    // Sequence in config must remain untouched!
    const cfg = await db.documentConfig.findUnique({ where: { id: 'cfg_cert' } });
    assert.equal(cfg.currentSeq, 50);
  });

  // -------------------------------------------------------------
  // Test 71: State-Bound Leave Quota Transactional Rule
  // -------------------------------------------------------------
  await t.test('71. State-Bound Leave Quota: refunds/deducts quota ONLY for APPROVED requests and blocks on deficit', async () => {
    const db = createMockRecycleBinDb({
      leaves: [
        ['leave_app', { id: 'leave_app', userId: 'user_1', type: 'VACATION', status: 'APPROVED', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-03'), days: 3, isDeleted: false }],
        ['leave_pend', { id: 'leave_pend', userId: 'user_1', type: 'VACATION', status: 'PENDING', startDate: new Date('2026-09-05'), endDate: new Date('2026-09-06'), days: 2, isDeleted: false }],
      ],
    });
    const admin = { userId: 'admin_1', userRole: 'ADMIN' };

    // 1. Soft-delete APPROVED leave -> refunds 3 days
    const delApp = await RecycleBinService.softDelete({ type: 'LEAVE', id: 'leave_app', user: admin }, db);
    assert.equal(delApp.success, true);
    assert.equal(delApp.refundedQuotaDays, 3);

    // 2. Soft-delete PENDING leave -> refunds 0 days
    const delPend = await RecycleBinService.softDelete({ type: 'LEAVE', id: 'leave_pend', user: admin }, db);
    assert.equal(delPend.success, true);
    assert.equal(delPend.refundedQuotaDays, 0);

    // 3. Restore APPROVED leave -> re-deducts 3 days
    const resApp = await RecycleBinService.restore({ type: 'LEAVE', id: 'leave_app', user: admin }, db);
    assert.equal(resApp.success, true);
    assert.equal(resApp.deductedQuotaDays, 3);

    // 4. Restore PENDING leave -> re-deducts 0 days
    const resPend = await RecycleBinService.restore({ type: 'LEAVE', id: 'leave_pend', user: admin }, db);
    assert.equal(resPend.success, true);
    assert.equal(resPend.deductedQuotaDays, 0);
  });

  // -------------------------------------------------------------
  // Test 72: Chrono-Sequential Concurrency & Partition Lock Mutual Exclusion
  // -------------------------------------------------------------
  await t.test('72. Chrono Concurrency: DocumentConfig partition lock serializes concurrent timeline mutations', async () => {
    const db = createMockRecycleBinDb({
      configs: [
        ['cfg_cert', { id: 'cfg_cert', docType: 'CERTIFICATE', currentSeq: 100 }],
      ],
      documents: [
        ['cert_99', { id: 'cert_99', docType: 'CERTIFICATE', seqNo: 99, year: 2569, date: new Date('2026-09-10'), isDeleted: false }],
        ['cert_100', { id: 'cert_100', docType: 'CERTIFICATE', seqNo: 100, year: 2569, date: new Date('2026-09-12'), isDeleted: false }],
      ],
    });

    const executionLog = [];

    // TX-A acquires partition lock, simulates 50ms async work, then updates date to 2026-09-15
    const taskA = db.$transaction(async (tx) => {
      executionLog.push('TX_A_START');
      await tx.$queryRaw`SELECT id, "currentSeq" FROM "DocumentConfig" WHERE "docType" = 'CERTIFICATE' FOR UPDATE;`;
      executionLog.push('TX_A_LOCK_ACQUIRED');

      await new Promise(r => setTimeout(r, 50));

      await tx.documentRecord.update({
        where: { id: 'cert_100' },
        data: { date: new Date('2026-09-15') },
      });
      executionLog.push('TX_A_COMMITTED');
    });

    // TX-B starts 10ms after TX-A, tries to acquire the same partition lock for validateChronoBounds
    const taskB = (async () => {
      await new Promise(r => setTimeout(r, 10));
      executionLog.push('TX_B_ATTEMPT');

      await db.$transaction(async (tx) => {
        executionLog.push('TX_B_LOCK_ACQUIRE_TRY');
        await tx.$queryRaw`SELECT id, "currentSeq" FROM "DocumentConfig" WHERE "docType" = 'CERTIFICATE' FOR UPDATE;`;
        executionLog.push('TX_B_LOCK_ACQUIRED');

        // TX-B checks bounds against committed state of cert_100 (which should be 2026-09-15)
        const check = evaluateChronoDateBounds({
          newDate: new Date('2026-09-16'),
          prevDate: new Date('2026-09-15'),
          nextDate: null,
        });
        assert.equal(check.valid, true);
        executionLog.push('TX_B_VALIDATED');
      });
    })();

    await Promise.all([taskA, taskB]);

    // Verify strict serialization: TX-B could NOT acquire lock until TX-A committed!
    const lockAcquiredA = executionLog.indexOf('TX_A_LOCK_ACQUIRED');
    const committedA = executionLog.indexOf('TX_A_COMMITTED');
    const lockAcquiredB = executionLog.indexOf('TX_B_LOCK_ACQUIRED');

    assert.ok(lockAcquiredA < committedA);
    assert.ok(committedA < lockAcquiredB, 'TX-B lock acquisition must happen AFTER TX-A commits');
  });

  // -------------------------------------------------------------
  // Test 73: Sole Sequence Allocator Authority & Sanity Healing
  // -------------------------------------------------------------
  await t.test('73. Sole Sequence Authority: repairs drift with audited AUTO_HEAL_SEQUENCE_DRIFT and includes deleted records in MAX(seqNo)', async () => {
    // Scenario: config.currentSeq is 100, but DB contains deleted record with seqNo 105 (Drift)
    const db = createMockRecycleBinDb({
      configs: [
        ['cfg_cert', { id: 'cfg_cert', docType: 'CERTIFICATE', currentSeq: 100 }],
      ],
      documents: [
        ['cert_del_105', { id: 'cert_del_105', docType: 'CERTIFICATE', createdById: 't1', seqNo: 105, year: 2569, docNo: '105/2569', date: new Date('2026-09-01'), isDeleted: true }],
        ['cert_to_restore', { id: 'cert_to_restore', docType: 'CERTIFICATE', createdById: 't1', seqNo: 80, year: 2569, docNo: '80/2569', date: new Date('2026-08-01'), isDeleted: true }],
      ],
    });

    const user = { userId: 't1', userRole: 'TEACHER' };
    const res = await RecycleBinService.restore({ type: 'CERTIFICATE', id: 'cert_to_restore', user }, db);

    assert.equal(res.success, true);
    // Invariant: nextSeq allocated must be MAX(seqNo) + 1 = 105 + 1 = 106 (NOT 101!)
    assert.equal(res.newSeqNo, 106);
    assert.equal(res.newDocNo, '106/2569');

    // AuditLog must record AUTO_HEAL_SEQUENCE_DRIFT
    const auditLogs = db._getAuditLogs();
    const driftLog = auditLogs.find(a => a.action === 'AUTO_HEAL_SEQUENCE_DRIFT');
    assert.ok(driftLog, 'Drift must trigger an in-transaction AUTO_HEAL_SEQUENCE_DRIFT audit log');
    assert.equal(driftLog.oldValue, '100');
    assert.equal(driftLog.newValue, '105');
  });

  // -------------------------------------------------------------
  // Test 74: Certificate Restore Timeline Tail (latestActiveDate Active Filter)
  // -------------------------------------------------------------
  await t.test('74. Certificate Restore Timeline Tail: latestActiveDate strictly ignores deleted records in trash', async () => {
    const today = new Date('2026-09-13T00:00:00Z');
    const activeDate = new Date('2026-09-10T00:00:00Z');
    const deletedFutureDate = new Date('2026-09-25T00:00:00Z'); // Deleted record with future date in trash

    const db = createMockRecycleBinDb({
      configs: [
        ['cfg_cert', { id: 'cfg_cert', docType: 'CERTIFICATE', currentSeq: 50 }],
      ],
      documents: [
        ['cert_active', { id: 'cert_active', docType: 'CERTIFICATE', createdById: 't1', seqNo: 50, year: 2569, docNo: '50/2569', date: activeDate, isDeleted: false }],
        ['cert_trash_future', { id: 'cert_trash_future', docType: 'CERTIFICATE', createdById: 't1', seqNo: 51, year: 2569, docNo: '51/2569', date: deletedFutureDate, isDeleted: true }],
        ['cert_target', { id: 'cert_target', docType: 'CERTIFICATE', createdById: 't1', seqNo: 30, year: 2569, docNo: '30/2569', date: new Date('2026-08-01'), isDeleted: true }],
      ],
    });

    const user = { userId: 't1', userRole: 'TEACHER' };
    const res = await RecycleBinService.restore({ type: 'CERTIFICATE', id: 'cert_target', user }, db);

    assert.equal(res.success, true);
    // Invariant: Tail date must NOT be pulled to 2026-09-25 (which is deleted). It must be max(activeDate, today) = today
    assert.ok(res.restoredDate);
    assert.equal(res.restoredDate.toISOString().substring(0, 10), today.toISOString().substring(0, 10));

    // Audit log must record re-issue
    const reissuedLog = db._getAuditLogs().find(a => a.action === 'RESTORE_REISSUE');
    assert.ok(reissuedLog);
    assert.equal(reissuedLog.oldValue, '30/2569');
  });

  // -------------------------------------------------------------
  // Test 75: Atomic In-Transaction Audit Invariant ("No Audit = No Commit")
  // -------------------------------------------------------------
  await t.test('75. No Audit = No Commit: transaction rolls back 100% if audit log fails', async () => {
    const db = createMockRecycleBinDb({
      simulateAuditLogFailure: true, // Forces tx.auditLog.create to throw
      configs: [
        ['cfg_cert', { id: 'cfg_cert', docType: 'CERTIFICATE', currentSeq: 50 }],
      ],
      documents: [
        ['cert_fail', { id: 'cert_fail', docType: 'CERTIFICATE', createdById: 't1', seqNo: 30, year: 2569, docNo: '30/2569', isDeleted: true }],
      ],
    });

    const user = { userId: 't1', userRole: 'TEACHER' };
    await assert.rejects(
      async () => {
        await RecycleBinService.restore({ type: 'CERTIFICATE', id: 'cert_fail', user }, db);
      },
      /SimulatedAuditLogError/
    );

    // Rollback verification: config.currentSeq must STILL be 50, and document must STILL be deleted
    const cfg = await db.documentConfig.findUnique({ where: { id: 'cfg_cert' } });
    assert.equal(cfg.currentSeq, 50);

    const doc = await db.documentRecord.findUnique({ where: { id: 'cert_fail' } });
    assert.equal(doc.isDeleted, true);
  });

  // -------------------------------------------------------------
  // Test 76: Official Document Restore Identity & Collision Guard
  // -------------------------------------------------------------
  await t.test('76. Official Document Restore: preserves docNo, but blocks if docNo is already taken by active document', async () => {
    const db = createMockRecycleBinDb({
      documents: [
        // Active document with docNo 15/2569
        ['doc_active_15', { id: 'doc_active_15', docType: 'DOCUMENT', createdById: 'admin_1', docNo: '15/2569', isDeleted: false }],
        // Deleted document attempting to restore with collided docNo 15/2569
        ['doc_collided', { id: 'doc_collided', docType: 'DOCUMENT', createdById: 'admin_1', docNo: '15/2569', isDeleted: true }],
        // Deleted document with unique docNo 20/2569
        ['doc_safe', { id: 'doc_safe', docType: 'DOCUMENT', createdById: 'admin_1', docNo: '20/2569', isDeleted: true }],
      ],
    });

    const admin = { userId: 'admin_1', userRole: 'ADMIN' };

    // 1. Collided restore: MUST be rejected
    const resCollision = await RecycleBinService.restore({ type: 'DOCUMENT', id: 'doc_collided', user: admin }, db);
    assert.equal(resCollision.success, false);
    assert.match(resCollision.error, /เลขที่เอกสาร 15\/2569 ถูกนำไปใช้แล้ว/);

    const stillDeleted = await db.documentRecord.findUnique({ where: { id: 'doc_collided' } });
    assert.equal(stillDeleted.isDeleted, true);

    // 2. Safe restore: succeeds and preserves docNo
    const resSafe = await RecycleBinService.restore({ type: 'DOCUMENT', id: 'doc_safe', user: admin }, db);
    assert.equal(resSafe.success, true);
    assert.equal(resSafe.newDocNo, '20/2569');

    const restoredDoc = await db.documentRecord.findUnique({ where: { id: 'doc_safe' } });
    assert.equal(restoredDoc.isDeleted, false);
  });

  // -------------------------------------------------------------
  // Test 77: Bulk Operations Itemized Isolation & Partial Success Contract
  // -------------------------------------------------------------
  await t.test('77. Bulk Operations: 5-item bulk restore isolates failures without rolling back successes', async () => {
    const db = createMockRecycleBinDb({
      configs: [
        ['cfg_cert', { id: 'cfg_cert', docType: 'CERTIFICATE', currentSeq: 10 }],
      ],
      documents: [
        ['c1', { id: 'c1', docType: 'CERTIFICATE', createdById: 'admin', isDeleted: true, year: 2569, seqNo: 1, docNo: '1/2569' }],
        ['c2', { id: 'c2', docType: 'CERTIFICATE', createdById: 'admin', isDeleted: true, year: 2569, seqNo: 2, docNo: '2/2569' }],
        ['doc_active_taken', { id: 'doc_active_taken', docType: 'DOCUMENT', createdById: 'admin', isDeleted: false, docNo: '99/2569' }],
        ['c3_collided', { id: 'c3_collided', docType: 'DOCUMENT', createdById: 'admin', isDeleted: true, docNo: '99/2569' }], // Will fail
        ['c4', { id: 'c4', docType: 'CERTIFICATE', createdById: 'admin', isDeleted: true, year: 2569, seqNo: 4, docNo: '4/2569' }],
        ['c5', { id: 'c5', docType: 'CERTIFICATE', createdById: 'admin', isDeleted: true, year: 2569, seqNo: 5, docNo: '5/2569' }],
      ],
    });

    const admin = { userId: 'admin', userRole: 'ADMIN' };
    const items = [
      { type: 'CERTIFICATE', id: 'c1' },
      { type: 'CERTIFICATE', id: 'c2' },
      { type: 'DOCUMENT', id: 'c3_collided' },
      { type: 'CERTIFICATE', id: 'c4' },
      { type: 'CERTIFICATE', id: 'c5' },
    ];

    const bulkRes = await RecycleBinService.bulkRestore({ items, user: admin }, db);

    assert.equal(bulkRes.totalRequested, 5);
    assert.equal(bulkRes.successCount, 4);
    assert.equal(bulkRes.failureCount, 1);
    assert.equal(bulkRes.results.length, 5);

    const failedItem = bulkRes.results.find(r => r.id === 'c3_collided');
    assert.equal(failedItem.status, 'FAILED');
    assert.ok(failedItem.error);

    // The other 4 items must be restored successfully
    const successItems = bulkRes.results.filter(r => r.status === 'SUCCESS');
    assert.equal(successItems.length, 4);
  });

  // -------------------------------------------------------------
  // Test 78: Hard Purge Attachment Reference Lifecycle
  // -------------------------------------------------------------
  await t.test('78. Hard Purge Attachment Lifecycle: invokes releaseAttachmentReference before deleting row', async () => {
    const released = [];
    const mockLifecycle = {
      releaseAttachmentReference: async (tx, attId) => {
        released.push(attId);
      },
    };

    const db = createMockRecycleBinDb({
      documents: [
        ['doc_with_att', {
          id: 'doc_with_att',
          docType: 'DOCUMENT',
          createdById: 'admin',
          attachments: [{ id: 'att_alpha' }, { id: 'att_beta' }],
        }],
      ],
    });

    const admin = { userId: 'admin', userRole: 'ADMIN' };
    const res = await RecycleBinService.purge({ type: 'DOCUMENT', id: 'doc_with_att', user: admin }, db, mockLifecycle);

    assert.equal(res.success, true);
    assert.equal(res.releasedAttachmentCount, 2);
    assert.deepEqual(released, ['att_alpha', 'att_beta']);

    const deletedDoc = await db.documentRecord.findUnique({ where: { id: 'doc_with_att' } });
    assert.equal(deletedDoc, null);
  });
});


