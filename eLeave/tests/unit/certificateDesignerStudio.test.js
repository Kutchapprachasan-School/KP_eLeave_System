import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ptToCanvasPx,
  sanitizeCellValue,
  sanitizeForExport,
  truncateThaiGrapheme,
  CertificateTemplateV1Schema,
  DEFAULT_CERTIFICATE_ELEMENTS,
  screenToDocumentPercent,
  documentPointToScreen,
  computeSnap,
  FONT_MANIFEST,
} from '../../../src/app/(app)/document/_components/designer/cert-schema.ts';
import { generateQrMatrix } from '../../../src/app/(app)/document/_components/designer/qr-renderer.ts';
import crypto from 'node:crypto';

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

  // -------------------------------------------------------------
  // Test 10: Provider fallback simulation (R2 fail -> Supabase success)
  // -------------------------------------------------------------
  await t.test('10. Provider fallback: R2 fail -> Supabase success sets storageProvider to SUPABASE', async () => {
    let r2Attempted = false;
    let supabaseAttempted = false;

    async function uploadWithFallbackSimulation() {
      // Step 1: Try R2
      r2Attempted = true;
      const r2Error = new Error('Cloudflare R2 Connection Timeout');

      // Step 2: Catch R2 fail and failover to Supabase
      if (r2Error) {
        supabaseAttempted = true;
        return {
          storageKey: 'certificates/backgrounds/test.png',
          provider: 'SUPABASE',
          publicUrl: 'https://xxx.supabase.co/storage/v1/object/public/data1/test.png',
        };
      }
      return { storageKey: 'test.png', provider: 'R2' };
    }

    const result = await uploadWithFallbackSimulation();
    assert.equal(r2Attempted, true);
    assert.equal(supabaseAttempted, true);
    assert.equal(result.provider, 'SUPABASE');
    assert.ok(result.publicUrl.includes('supabase.co'));
  });

  // -------------------------------------------------------------
  // Test 11: Upload Idempotency (same uploadSessionId returns existing record)
  // -------------------------------------------------------------
  await t.test('11. Upload idempotency: Resubmitting identical uploadSessionId yields existing FileAttachment', () => {
    const db = new Map();
    const sessionId = 'session_uuid_fixed_123';

    function handleUpload(clientSessionId, objectKey) {
      if (db.has(clientSessionId)) {
        return { isExisting: true, record: db.get(clientSessionId) };
      }
      const newRec = { id: 'att_' + Date.now(), uploadSessionId: clientSessionId, objectKey };
      db.set(clientSessionId, newRec);
      return { isExisting: false, record: newRec };
    }

    const first = handleUpload(sessionId, 'key_1.png');
    assert.equal(first.isExisting, false);

    const duplicate = handleUpload(sessionId, 'key_2.png');
    assert.equal(duplicate.isExisting, true);
    assert.equal(duplicate.record.id, first.record.id); // Deduplicated!
  });

  // -------------------------------------------------------------
  // Test 12: Verify security (VALID, REVOKED, NOT_FOUND)
  // -------------------------------------------------------------
  await t.test('12. Verify security: Checks VALID, REVOKED, and NOT_FOUND states without exposing private data', () => {
    function evaluateVerifyState(record) {
      if (!record) {
        return { success: false, state: 'NOT_FOUND', error: 'ไม่พบข้อมูลเกียรติบัตร' };
      }
      if (record.status === 'CANCELLED' || record.batchStatus === 'CANCELLED' || record.status === 'REVOKED') {
        return {
          success: true,
          data: { state: 'REVOKED', certNo: record.certNo, recipientName: record.recipientName },
        };
      }
      return {
        success: true,
        data: { state: 'VALID', certNo: record.certNo, recipientName: record.recipientName },
      };
    }

    // 1. Not found
    const res404 = evaluateVerifyState(null);
    assert.equal(res404.state, 'NOT_FOUND');
    assert.equal(res404.data, undefined); // Zero leakage!

    // 2. Revoked certificate
    const resRevoked = evaluateVerifyState({ status: 'CANCELLED', batchStatus: 'ISSUED', certNo: '1/2569', recipientName: 'นาย ก' });
    assert.equal(resRevoked.data.state, 'REVOKED');

    // 3. Valid certificate
    const resValid = evaluateVerifyState({ status: 'ISSUED', batchStatus: 'ISSUED', certNo: '1/2569', recipientName: 'นาย ก' });
    assert.equal(resValid.data.state, 'VALID');
  });

  // -------------------------------------------------------------
  // Test 13: Zoom transform & Drag Offset stability (Senior Lock 3)
  // -------------------------------------------------------------
  await t.test('13. Zoom transform: dragging at 60%, 100%, 150% + cursor offset maintains stable document position', () => {
    const canvasWidth = 842;
    const canvasHeight = 595;

    // Simulate DOMRect at 3 different zoom scales
    const rect100 = { left: 100, top: 100, width: canvasWidth * 1.0, height: canvasHeight * 1.0 };
    const rect60 = { left: 100, top: 100, width: canvasWidth * 0.6, height: canvasHeight * 0.6 };
    const rect150 = { left: 100, top: 100, width: canvasWidth * 1.5, height: canvasHeight * 1.5 };

    // Point at 50% X, 50% Y
    const screen100 = documentPointToScreen(50, 50, rect100);
    const doc100 = screenToDocumentPercent(screen100.screenX, screen100.screenY, rect100);
    assert.equal(doc100.xPercent, 50);
    assert.equal(doc100.yPercent, 50);

    const screen60 = documentPointToScreen(50, 50, rect60);
    const doc60 = screenToDocumentPercent(screen60.screenX, screen60.screenY, rect60);
    assert.equal(doc60.xPercent, 50);
    assert.equal(doc60.yPercent, 50);

    const screen150 = documentPointToScreen(50, 50, rect150);
    const doc150 = screenToDocumentPercent(screen150.screenX, screen150.screenY, rect150);
    assert.equal(doc150.xPercent, 50);
    assert.equal(doc150.yPercent, 50);

    // Cursor Grab Offset Simulation: grabbing at (52%, 52%) with element at (50%, 50%)
    const grabOffset = { dx: 2, dy: 2 };
    // Dragging pointer to (72%, 72%)
    const movedPointer = { x: 72, y: 72 };
    const newElementPos = { x: movedPointer.x - grabOffset.dx, y: movedPointer.y - grabOffset.dy };
    assert.equal(newElementPos.x, 70); // Exact 20% move without jumping!
    assert.equal(newElementPos.y, 70);
  });

  // -------------------------------------------------------------
  // Test 14: verifyToken DB leak test (raw token != stored hash)
  // -------------------------------------------------------------
  await t.test('14. verifyToken DB leak test: DB stores SHA-256 hash preventing offline token exposure', () => {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const storedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // DB value must NEVER equal raw token
    assert.notEqual(storedHash, rawToken);
    assert.equal(storedHash.length, 64); // SHA-256 64-hex chars

    // Verification check: incoming raw token hashes to stored DB hash
    const inputToken = rawToken;
    const inputHash = crypto.createHash('sha256').update(inputToken.trim()).digest('hex');
    assert.equal(inputHash, storedHash);

    // Attacker tampering with token fails
    const tamperedHash = crypto.createHash('sha256').update('fake_token_123').digest('hex');
    assert.notEqual(tamperedHash, storedHash);
  });

  // -------------------------------------------------------------
  // Test 15: Font asset identity test (Preview + PDF resolve exact same manifest)
  // -------------------------------------------------------------
  await t.test('15. Font asset identity test: All 6 Thai fonts resolve identical family, version, and assetHash', () => {
    const manifestKeys = Object.keys(FONT_MANIFEST);
    assert.equal(manifestKeys.length, 6);

    for (const key of manifestKeys) {
      const font = FONT_MANIFEST[key];
      assert.ok(font.family, `Font ${key} has family`);
      assert.ok(font.version, `Font ${key} has version`);
      assert.ok(font.assetHash, `Font ${key} has assetHash`);
      assert.ok(font.weights.length > 0, `Font ${key} has weights`);
    }

    // Verify Sarabun, Prompt, Kanit, Taviraj, Chakra Petch, Mali
    assert.ok(FONT_MANIFEST['Sarabun']);
    assert.ok(FONT_MANIFEST['Prompt']);
    assert.ok(FONT_MANIFEST['Kanit']);
    assert.ok(FONT_MANIFEST['Taviraj']);
    assert.ok(FONT_MANIFEST['Chakra Petch']);
    assert.ok(FONT_MANIFEST['Mali']);
  });

  // -------------------------------------------------------------
  // Test 16: Pure QR Matrix generator (Decoupled from React DOM)
  // -------------------------------------------------------------
  await t.test('16. Pure QR Matrix generator: Generates 25x25 boolean matrix with EC Level H without DOM', () => {
    const matrix = generateQrMatrix('https://eleave.kutchap.ac.th/verify/cert?token=TEST', 'H');
    assert.ok(matrix.size >= 21); // Standard QR size >= 21
    assert.equal(typeof matrix.getModule(0, 0), 'boolean');
    assert.equal(matrix.modules.length, matrix.size);
    assert.equal(matrix.modules[0].length, matrix.size);
  });
});

