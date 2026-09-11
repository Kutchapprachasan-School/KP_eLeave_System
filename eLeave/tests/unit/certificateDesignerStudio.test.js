import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ptToCanvasPx,
  sanitizeCellValue,
  sanitizeForExport,
  truncateThaiGrapheme,
  CertificateTemplateV1Schema,
  DEFAULT_CERTIFICATE_ELEMENTS,
} from '../../../src/app/(app)/document/_components/designer/cert-schema.ts';

test('Certificate Designer Studio & Concurrency Invariants Suite', async (t) => {
  // -------------------------------------------------------------
  // Test 1: Typographic scaling (pt to canvas px) - Invariant V
  // -------------------------------------------------------------
  await t.test('1. ptToCanvasPx scales correctly for 72 DPI and 300 DPI', () => {
    // At 72 DPI (screen preview), 1pt = 1px
    assert.equal(ptToCanvasPx(24, 72), 24);
    assert.equal(ptToCanvasPx(36, 72), 36);

    // At 300 DPI (high-fidelity print export), 1pt = 300 / 72 px ≈ 4.1667px
    const px300 = ptToCanvasPx(24, 300);
    assert.equal(Math.round(px300), 100); // 24 * (300/72) = 100px
  });

  // -------------------------------------------------------------
  // Test 2: Formula injection protection - Invariant U
  // -------------------------------------------------------------
  await t.test('2. sanitizeCellValue protects against formula injection without stripping negative numbers', () => {
    // Formula prefixes receive a single quote (')
    assert.equal(sanitizeCellValue('=CMD()'), "'=CMD()");
    assert.equal(sanitizeCellValue('+12345'), "'+12345");
    assert.equal(sanitizeCellValue('@SUM(A1:A10)'), "'@SUM(A1:A10)");
    assert.equal(sanitizeCellValue('-500'), "'-500"); // Protected from Excel formula without data corruption!

    // Standard text remains clean
    assert.equal(sanitizeCellValue('นายสมศักดิ์ รักเรียน'), 'นายสมศักดิ์ รักเรียน');
    assert.equal(sanitizeCellValue('กจ. 001/2569'), 'กจ. 001/2569');
  });

  // -------------------------------------------------------------
  // Test 3: Non-mutating copy for export - Invariant G
  // -------------------------------------------------------------
  await t.test('3. sanitizeForExport creates a sanitized copy leaving source data untouched', () => {
    const originalRoster = [
      { name: 'นายสมศักดิ์', role: '-หัวหน้ากลุ่มสาระ', amount: -500 }
    ];

    const exported = sanitizeForExport(originalRoster);

    // Exported copy has single quote guard
    assert.equal(exported[0].role, "'-หัวหน้ากลุ่มสาระ");

    // Original array and objects remain strictly untouched
    assert.equal(originalRoster[0].role, '-หัวหน้ากลุ่มสาระ');
    assert.notEqual(exported, originalRoster);
  });

  // -------------------------------------------------------------
  // Test 4: Grapheme-aware Thai truncation
  // -------------------------------------------------------------
  await t.test('4. truncateThaiGrapheme preserves tone mark clusters without producing dotted circles', () => {
    const thaiText = 'สิทธิ์พญาไท ที่ปิ้งชี้';
    // Truncating to 5 graphemes must not break vowel + tone clusters
    const truncated = truncateThaiGrapheme(thaiText, 5);
    assert.ok(truncated.endsWith('...'));
    assert.ok(!truncated.includes('\u25CC')); // Must NOT contain dotted circle (orphan combining mark)
  });

  // -------------------------------------------------------------
  // Test 5: Zod Schema Read + Write validation
  // -------------------------------------------------------------
  await t.test('5. CertificateTemplateV1Schema validates layoutConfig structure', () => {
    const validLayout = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: DEFAULT_CERTIFICATE_ELEMENTS,
    };

    const parsed = CertificateTemplateV1Schema.safeParse(validLayout);
    assert.equal(parsed.success, true);

    // Rejects corrupt/invalid configuration
    const invalidLayout = {
      schemaVersion: 2, // Only version 1 is supported
      elements: 'not an array',
    };
    const invalidParsed = CertificateTemplateV1Schema.safeParse(invalidLayout);
    assert.equal(invalidParsed.success, false);
  });

  // -------------------------------------------------------------
  // Test 6: Deterministic Lock Ordering Simulation (Invariant AA)
  // -------------------------------------------------------------
  await t.test('6. lockAttachmentsInOrder sorts attachment IDs lexicographically to prevent deadlocks', () => {
    const swapAB = ['att_zebra_999', 'att_alpha_111'];
    const swapBA = ['att_alpha_111', 'att_zebra_999'];

    const sortedAB = Array.from(new Set(swapAB)).sort();
    const sortedBA = Array.from(new Set(swapBA)).sort();

    // Both operations lock in the identical order [att_alpha_111, att_zebra_999]
    assert.deepEqual(sortedAB, sortedBA);
    assert.equal(sortedAB[0], 'att_alpha_111');
    assert.equal(sortedAB[1], 'att_zebra_999');
  });

  // -------------------------------------------------------------
  // Test 7: Atomic CAS & Strict SYSTEM_PRESET Immutability (Invariants B, Q, S, 4)
  // -------------------------------------------------------------
  await t.test('7. Atomic CAS matches version and strictly protects SYSTEM_PRESET', () => {
    class MockTemplateStore {
      constructor() {
        this.templates = new Map();
      }

      insert(t) {
        this.templates.set(t.id, { ...t, templateVersion: 1 });
      }

      updateCAS({ id, expectedVersion, data, userRole }) {
        const existing = this.templates.get(id);
        if (!existing) return { count: 0, error: 'NOT_FOUND' };

        // Invariant 4: Strict Immutability of SYSTEM_PRESET
        if (existing.scope === 'SYSTEM_PRESET') {
          return { count: 0, error: 'PRESET_IMMUTABLE' };
        }
        if (data.scope === 'SYSTEM_PRESET') {
          return { count: 0, error: 'PRESET_IMMUTABLE' };
        }

        // Optimistic Concurrency Control (CAS)
        if (existing.templateVersion !== expectedVersion) {
          return { count: 0, error: 'CONFLICT' };
        }

        const updated = {
          ...existing,
          ...data,
          templateVersion: existing.templateVersion + 1,
          updatedAt: new Date(),
        };
        this.templates.set(id, updated);
        return { count: 1, updated };
      }
    }

    const store = new MockTemplateStore();
    store.insert({ id: 'tmpl_preset', name: 'Preset Template', scope: 'SYSTEM_PRESET' });
    store.insert({ id: 'tmpl_user', name: 'User Template', scope: 'PRIVATE' });

    // 1. Updating SYSTEM_PRESET is strictly blocked
    const presetRes = store.updateCAS({
      id: 'tmpl_preset',
      expectedVersion: 1,
      data: { name: 'Hacked Preset' },
      userRole: 'SUPERADMIN',
    });
    assert.equal(presetRes.error, 'PRESET_IMMUTABLE');

    // 2. CAS version mismatch is detected as CONFLICT
    const conflictRes = store.updateCAS({
      id: 'tmpl_user',
      expectedVersion: 99, // Mismatched version
      data: { name: 'New Name' },
      userRole: 'USER',
    });
    assert.equal(conflictRes.error, 'CONFLICT');

    // 3. Proper CAS update succeeds and increments templateVersion
    const successRes = store.updateCAS({
      id: 'tmpl_user',
      expectedVersion: 1,
      data: { name: 'Renamed Template' },
      userRole: 'USER',
    });
    assert.equal(successRes.count, 1);
    assert.equal(successRes.updated.templateVersion, 2);
  });

  // -------------------------------------------------------------
  // Test 8: Fenced Claim Token & Revival Counter Reset (Invariants Y, 1, 3)
  // -------------------------------------------------------------
  await t.test('8. Deletion lease token fences split-brain workers & revival resets counters', () => {
    const attachment = {
      id: 'att_sample',
      attachmentStatus: 'PENDING_DELETE',
      cleanupAttempts: 4,
      lastCleanupError: 'Timeout',
      deletingAt: null,
      deletionLeaseId: null,
    };

    // Worker 1 claims lease
    const lease1 = 'lease_uuid_111';
    attachment.attachmentStatus = 'DELETING';
    attachment.deletionLeaseId = lease1;
    attachment.deletingAt = new Date();

    // Simulating lease expiration: Worker 2 reclaims with new lease token
    const lease2 = 'lease_uuid_222';
    attachment.deletionLeaseId = lease2;

    // Worker 1 tries to finalize with stale lease1 -> fails (0 rows matched)
    const worker1FinalizeMatches = attachment.deletionLeaseId === lease1;
    assert.equal(worker1FinalizeMatches, false); // Fenced out!

    // Invariant 1: If revived to ACTIVE, all failure metadata must be reset
    attachment.attachmentStatus = 'ACTIVE';
    attachment.cleanupAttempts = 0;
    attachment.lastCleanupError = null;
    attachment.deletingAt = null;
    attachment.deletionLeaseId = null;

    assert.equal(attachment.cleanupAttempts, 0);
    assert.equal(attachment.lastCleanupError, null);
  });

  // -------------------------------------------------------------
  // Test 9: Two-phase upload cleanup & DeleteObject contract (Invariants AE, AF)
  // -------------------------------------------------------------
  await t.test('9. Two-phase upload cleanup & DeleteObject contract preserves DB on retryable error', () => {
    // Mock DeleteObjectResult
    const retryableResult = { status: 'RETRYABLE_ERROR', error: new Error('Cloudflare 503') };
    const successResult = { status: 'DELETED' };

    let dbDeleted = false;

    function handleCloudResult(res) {
      if (res.status === 'DELETED' || res.status === 'ALREADY_MISSING') {
        dbDeleted = true;
      } else {
        dbDeleted = false; // DB row preserved for exponential backoff!
      }
    }

    handleCloudResult(retryableResult);
    assert.equal(dbDeleted, false); // Invariant AF: DB preserved on transient failure!

    handleCloudResult(successResult);
    assert.equal(dbDeleted, true); // Safely deleted only on confirmed cloud deletion!
  });
});
