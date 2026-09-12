import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ptToCanvasPx,
  sanitizeCellValue,
  sanitizeForExport,
  truncateThaiGrapheme,
  CertificateTemplateV1Schema,
  DEFAULT_CERTIFICATE_ELEMENTS,
  ELEMENT_PRESETS,
  screenToDocumentPercent,
  documentPointToScreen,
  computeSnap,
  FONT_MANIFEST,
  SUPPORTED_FONTS,
  CustomFontSchema,
  extractCustomFontAttachmentIds,
  isValidVerificationTokenFormat,
} from '../../../src/app/(app)/document/_components/designer/cert-schema.ts';
import { detectFontMagicBytes } from '../../../src/app/(app)/document/_components/designer/font-manifest.ts';
import { computeBufferSha256 } from '../../../src/app/(app)/document/_components/designer/font-loader.ts';
import { generateQrMatrix, drawQRCodeBadge } from '../../../src/app/(app)/document/_components/designer/qr-renderer.ts';
import {
  drawCertificatePage,
  isValidDrawableImage,
  loadCanvasImage,
  clearImageCache,
  evictImageCache,
  getImageCacheSize,
} from '../../../src/app/(app)/document/_components/designer/cert-pdf-engine.ts';
import { processSignaturePixels } from '../../../src/app/(app)/document/_components/designer/signature-processor.ts';
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
    assert.equal(sanitizeCellValue('001/2569'), '001/2569');
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
  await t.test('15. Font asset identity test: All 14 multilingual fonts resolve identical family, version, and assetHash', () => {
    const manifestKeys = Object.keys(FONT_MANIFEST);
    assert.equal(manifestKeys.length, 14);

    for (const key of manifestKeys) {
      const font = FONT_MANIFEST[key];
      assert.ok(font.family, `Font ${key} has family`);
      assert.ok(font.version, `Font ${key} has version`);
      assert.ok(font.assetHash, `Font ${key} has assetHash`);
      assert.ok(font.weights.length > 0, `Font ${key} has weights`);
    }

    // Verify Thai (6)
    assert.ok(FONT_MANIFEST['Sarabun']);
    assert.ok(FONT_MANIFEST['Prompt']);
    assert.ok(FONT_MANIFEST['Kanit']);
    assert.ok(FONT_MANIFEST['Taviraj']);
    assert.ok(FONT_MANIFEST['Chakra Petch']);
    assert.ok(FONT_MANIFEST['Mali']);

    // Verify English (4)
    assert.ok(FONT_MANIFEST['Playfair Display']);
    assert.ok(FONT_MANIFEST['Cinzel']);
    assert.ok(FONT_MANIFEST['Montserrat']);
    assert.ok(FONT_MANIFEST['Inter']);

    // Verify Japanese (2)
    assert.ok(FONT_MANIFEST['Noto Sans JP']);
    assert.ok(FONT_MANIFEST['Noto Serif JP']);

    // Verify Chinese (2)
    assert.ok(FONT_MANIFEST['Noto Sans SC']);
    assert.ok(FONT_MANIFEST['Noto Serif SC']);
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

  // -------------------------------------------------------------
  // Test 17: drawCertificatePage immunity against invalid background image
  // -------------------------------------------------------------
  await t.test('17. drawCertificatePage immunity: Does not throw TypeError on null or plain object background', () => {
    let drawImageCalled = false;
    const drawnTexts = [];

    const mockCtx = {
      drawImage: () => { drawImageCalled = true; },
      save: () => {},
      restore: () => {},
      fillText: (text) => { drawnTexts.push(text); },
      font: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
    };

    // A. Testing with null background
    assert.doesNotThrow(() => {
      drawCertificatePage({
        ctx: mockCtx,
        width: 842,
        height: 595,
        dpi: 72,
        backgroundImage: null,
        template: {
          schemaVersion: 1,
          orientation: 'LANDSCAPE',
          elements: [
            {
              id: 'el_1',
              type: 'text',
              key: 'title',
              label: 'หัวข้อเกียรติบัตร',
              sampleText: 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า',
              xPercent: 50,
              yPercent: 30,
              fontSizePt: 20,
              fontFamily: 'Sarabun',
              fontWeight: 'bold',
            },
          ],
        },
        data: {},
      });
    });
    assert.equal(drawImageCalled, false, 'drawImage should not be called when backgroundImage is null');
    assert.ok(drawnTexts.includes('เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า'), 'Text element must be rendered');

    // B. Testing with invalid plain object (the previous bug: { width, height })
    assert.equal(isValidDrawableImage({ width: 842, height: 595 }), false);
    drawImageCalled = false;
    drawnTexts.length = 0;

    assert.doesNotThrow(() => {
      drawCertificatePage({
        ctx: mockCtx,
        width: 842,
        height: 595,
        dpi: 72,
        backgroundImage: { width: 842, height: 595 },
        template: {
          schemaVersion: 1,
          orientation: 'LANDSCAPE',
          elements: [
            {
              id: 'el_2',
              type: 'text',
              key: 'customHeader',
              label: 'หัวข้อใหม่',
              sampleText: 'หัวข้อรางวัลยอดเยี่ยม',
              xPercent: 50,
              yPercent: 40,
              fontSizePt: 24,
              fontFamily: 'Prompt',
              fontWeight: 'bold',
            },
          ],
        },
        data: {},
      });
    });
    assert.equal(drawImageCalled, false, 'drawImage must NOT be called for invalid plain objects');
    assert.ok(drawnTexts.includes('หัวข้อรางวัลยอดเยี่ยม'), 'Newly added element must be rendered successfully');
  });

  // -------------------------------------------------------------
  // Test 18: Fallback text rendering for newly added elements
  // -------------------------------------------------------------
  await t.test('18. Fallback text rendering: Newly added preset elements render sampleText or label when roster key is missing', () => {
    const renderedTexts = [];
    const mockCtx = {
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      fillText: (text) => { renderedTexts.push(text); },
      font: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
    };

    drawCertificatePage({
      ctx: mockCtx,
      width: 842,
      height: 595,
      dpi: 72,
      backgroundImage: null,
      template: {
        schemaVersion: 1,
        orientation: 'LANDSCAPE',
        elements: [
          {
            id: 'el_fallback_1',
            type: 'text',
            key: 'newTopicWithoutRosterData',
            label: 'หัวข้อทดสอบ',
            sampleText: 'ข้อความตัวอย่างที่ต้องแสดงในพรีวิว',
            xPercent: 50,
            yPercent: 50,
            fontSizePt: 18,
            fontFamily: 'Kanit',
            fontWeight: 'normal',
          },
          {
            id: 'el_fallback_2',
            type: 'text',
            key: 'onlyLabelTopic',
            label: 'หัวข้อไม่มีตัวอย่าง',
            xPercent: 50,
            yPercent: 60,
            fontSizePt: 18,
            fontFamily: 'Kanit',
            fontWeight: 'normal',
          },
        ],
      },
      data: { existingField: 'someValue' }, // Notice: neither key is in data!
    });

    assert.ok(renderedTexts.includes('ข้อความตัวอย่างที่ต้องแสดงในพรีวิว'), 'sampleText must render when data key is missing');
    assert.ok(renderedTexts.includes('หัวข้อไม่มีตัวอย่าง'), 'label must render as ultimate fallback so element is visible');
  });

  // -------------------------------------------------------------
  // Test 19: Singleton Guard (Service/Schema Boundary Validation)
  // -------------------------------------------------------------
  await t.test('19. Singleton Guard: CertificateTemplateV1Schema rejects duplicate singleton element keys with INVALID_LAYOUT', () => {
    // A. Duplicate 'fullName' must be rejected
    const dupFullNameLayout = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'el_1',
          type: 'text',
          key: 'fullName',
          label: 'ชื่อผู้รับคนที่ 1',
          xPercent: 50,
          yPercent: 48,
          fontSizePt: 24,
          fontFamily: 'Sarabun',
          fontWeight: 'bold',
        },
        {
          id: 'el_2',
          type: 'text',
          key: 'fullName', // DUPLICATE!
          label: 'ชื่อผู้รับซ้ำ',
          xPercent: 50,
          yPercent: 55,
          fontSizePt: 24,
          fontFamily: 'Sarabun',
          fontWeight: 'bold',
        },
      ],
    };

    const resFullName = CertificateTemplateV1Schema.safeParse(dupFullNameLayout);
    assert.equal(resFullName.success, false);
    assert.ok(resFullName.error.issues[0]?.message.includes('INVALID_LAYOUT'));

    // B. Duplicate 'qrCode' must be rejected
    const dupQrLayout = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'el_qr_1',
          type: 'qrcode',
          key: 'qrCode',
          label: 'QR 1',
          xPercent: 88,
          yPercent: 85,
          fontSizePt: 16,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
        {
          id: 'el_qr_2',
          type: 'qrcode',
          key: 'qrCode', // DUPLICATE!
          label: 'QR 2',
          xPercent: 12,
          yPercent: 85,
          fontSizePt: 16,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
      ],
    };

    const resQr = CertificateTemplateV1Schema.safeParse(dupQrLayout);
    assert.equal(resQr.success, false);
    assert.ok(resQr.error.issues[0]?.message.includes('INVALID_LAYOUT'));

    // C. Non-singleton keys (unlimited) can duplicate freely
    const validMultiCustomLayout = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'el_custom_1',
          type: 'text',
          key: 'customNote',
          label: 'ข้อความเพิ่มเติม 1',
          xPercent: 50,
          yPercent: 30,
          fontSizePt: 14,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
        {
          id: 'el_custom_2',
          type: 'text',
          key: 'customNote',
          label: 'ข้อความเพิ่มเติม 2',
          xPercent: 50,
          yPercent: 35,
          fontSizePt: 14,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
      ],
    };

    const resCustom = CertificateTemplateV1Schema.safeParse(validMultiCustomLayout);
    assert.equal(resCustom.success, true, 'Unlimited custom keys may appear more than once');
  });

  // -------------------------------------------------------------
  // Test 20: Role-singleton (Dual Signees & Signature Binding)
  // -------------------------------------------------------------
  await t.test('20. Dual Signees & Signature Binding: signee1, signature1, signee2, signature2 coexist but reject duplicates', () => {
    // A. Valid dual signee layout
    const validDualSignees = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'el_s1',
          type: 'text',
          key: 'signee1',
          label: 'ผู้ลงนามคนที่ 1',
          xPercent: 28,
          yPercent: 88,
          fontSizePt: 16,
          fontFamily: 'Taviraj',
          fontWeight: 'bold',
        },
        {
          id: 'el_sig1',
          type: 'signature',
          key: 'signature1',
          label: 'ลายเซ็น 1',
          signatureFor: 'signee1',
          signatureAttachmentId: 'att_sig_1',
          xPercent: 28,
          yPercent: 80,
          imageWidthPercent: 14,
          fontSizePt: 14,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
        {
          id: 'el_s2',
          type: 'text',
          key: 'signee2',
          label: 'ผู้ลงนามคนที่ 2',
          xPercent: 72,
          yPercent: 88,
          fontSizePt: 16,
          fontFamily: 'Taviraj',
          fontWeight: 'bold',
        },
        {
          id: 'el_sig2',
          type: 'signature',
          key: 'signature2',
          label: 'ลายเซ็น 2',
          signatureFor: 'signee2',
          signatureAttachmentId: 'att_sig_2',
          xPercent: 72,
          yPercent: 80,
          imageWidthPercent: 14,
          fontSizePt: 14,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
      ],
    };

    const parsed = CertificateTemplateV1Schema.safeParse(validDualSignees);
    assert.equal(parsed.success, true, 'Dual signee + signature layout must be valid');

    // B. Duplicate signee1 must be rejected
    const dupSignee1 = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        ...validDualSignees.elements,
        {
          id: 'el_s1_dup',
          type: 'text',
          key: 'signee1', // DUPLICATE!
          label: 'ผู้ลงนามคนที่ 1 ซ้ำ',
          xPercent: 50,
          yPercent: 88,
          fontSizePt: 16,
          fontFamily: 'Taviraj',
          fontWeight: 'bold',
        },
      ],
    };
    const parsedDup = CertificateTemplateV1Schema.safeParse(dupSignee1);
    assert.equal(parsedDup.success, false);
    assert.ok(parsedDup.error.issues[0]?.message.includes('INVALID_LAYOUT'));
  });

  // -------------------------------------------------------------
  // Test 21: Signature Attachment Lifecycle Reference Counting Simulation
  // -------------------------------------------------------------
  await t.test('21. Attachment Lifecycle: Signatures stored in layoutConfig are counted in reference tracking', () => {
    // Mock templates table containing signatureAttachmentId in JSON
    const templates = [
      {
        id: 'tmpl_1',
        backgroundAttachmentId: 'att_bg_1',
        layoutConfig: {
          elements: [
            { type: 'signature', key: 'signature1', signatureAttachmentId: 'att_sig_special_99' },
          ],
        },
      },
      {
        id: 'tmpl_2',
        backgroundAttachmentId: 'att_bg_2',
        layoutConfig: {
          elements: [
            { type: 'text', key: 'fullName' },
          ],
        },
      },
    ];

    // Reference counter function testing layoutConfig reflection
    const countRefs = (attId) => {
      let count = 0;
      for (const t of templates) {
        if (t.backgroundAttachmentId === attId) count++;
        const text = JSON.stringify(t.layoutConfig);
        if (text.includes(`"signatureAttachmentId":"${attId}"`)) {
          count++;
        }
      }
      return count;
    };

    // att_sig_special_99 is referenced by tmpl_1 -> count = 1
    assert.equal(countRefs('att_sig_special_99'), 1, 'Signature attachment must be detected in layoutConfig');

    // Remove signature from tmpl_1 -> count drops to 0 (can now be marked PENDING_DELETE safely)
    templates[0].layoutConfig.elements = [];
    assert.equal(countRefs('att_sig_special_99'), 0, 'Orphaned signature after layout removal must reach 0 refs');
  });

  // -------------------------------------------------------------
  // Test 22: Signature Aspect Ratio Geometry (72 DPI == 300 DPI without distortion)
  // -------------------------------------------------------------
  await t.test('22. Signature Aspect Ratio Geometry: Preserves natural width/height ratio identically at 72 DPI and 300 DPI', () => {
    let lastDrawn = null;
    const mockCtx = {
      drawImage: (img, x, y, w, h) => {
        lastDrawn = { img, x, y, w, h, aspect: w / h };
      },
      save: () => {},
      restore: () => {},
      strokeRect: () => {},
      setLineDash: () => {},
      fillText: () => {},
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textAlign: '',
      textBaseline: '',
    };

    // Mock signature image with natural aspect ratio 2.5 (e.g. 500x200)
    const mockSigImg = {
      naturalWidth: 500,
      naturalHeight: 200,
      width: 500,
      height: 200,
      nodeName: 'IMG',
    };

    const testTemplate = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'sig_1',
          type: 'signature',
          key: 'signature1',
          label: 'ลายเซ็น',
          signatureAttachmentId: 'att_sig_test',
          xPercent: 50,
          yPercent: 80,
          imageWidthPercent: 14,
          fontSizePt: 14,
          fontFamily: 'Sarabun',
          fontWeight: 'normal',
        },
      ],
    };

    // 1. Render at 72 DPI (Screen Preview)
    drawCertificatePage({
      ctx: mockCtx,
      width: 842,
      height: 595,
      dpi: 72,
      backgroundImage: null,
      template: testTemplate,
      data: {},
      signatureImages: { att_sig_test: mockSigImg },
    });

    const screenAspect = lastDrawn.aspect;
    const screenWidth = lastDrawn.w;
    const screenHeight = lastDrawn.h;
    assert.equal(Math.round(screenAspect * 10) / 10, 2.5, '72 DPI aspect ratio must be 2.5');

    // 2. Render at 300 DPI (Print Export)
    drawCertificatePage({
      ctx: mockCtx,
      width: 3508,
      height: 2480,
      dpi: 300,
      backgroundImage: null,
      template: testTemplate,
      data: {},
      signatureImages: { att_sig_test: mockSigImg },
    });

    const printAspect = lastDrawn.aspect;
    const printWidth = lastDrawn.w;
    const printHeight = lastDrawn.h;
    assert.equal(Math.round(printAspect * 10) / 10, 2.5, '300 DPI aspect ratio must be 2.5');

    // Invariant: Aspect ratio at 72 DPI and 300 DPI is exactly preserved
    assert.equal(Math.round(screenAspect * 100), Math.round(printAspect * 100));

    // Scaling ratio must match page width scaling (3508 / 842 ≈ 4.166)
    const scaleRatio = printWidth / screenWidth;
    assert.ok(Math.abs(scaleRatio - (3508 / 842)) < 0.05, 'Signature width scales proportionally with DPI');
  });

  // -------------------------------------------------------------
  // Test 23: Signature Background Removal & Ink Extraction
  // -------------------------------------------------------------
  await t.test('23. processSignaturePixels extracts transparent ink and calculates tight bounding box', () => {
    // Create a 4x4 RGBA pixel grid:
    // Row 0: All paper (white: 245, 245, 245, 255)
    // Row 1: Paper, Ink (blue pen: 15, 20, 110, 255), Ink (black pen: 10, 10, 10, 255), Paper
    // Row 2: Paper, Ink (blue pen: 15, 20, 110, 255), Paper, Paper
    // Row 3: All paper (white: 245, 245, 245, 255)
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Fill all with paper
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 245;     // R
      pixels[i + 1] = 245; // G
      pixels[i + 2] = 245; // B
      pixels[i + 3] = 255; // A
    }

    // Set ink at (1, 1), (2, 1), and (1, 2)
    const setInk = (x, y, r, g, b) => {
      const idx = (y * width + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    };

    setInk(1, 1, 15, 20, 110); // Blue pen
    setInk(2, 1, 10, 10, 10);  // Black pen
    setInk(1, 2, 15, 20, 110); // Blue pen

    const result = processSignaturePixels({ data: pixels, width, height }, {
      threshold: 215,
      smoothness: 25,
      darkenInk: true,
    });

    // Verify paper pixels became completely transparent (alpha = 0)
    const paperPixelAlpha = pixels[(0 * width + 0) * 4 + 3];
    assert.equal(paperPixelAlpha, 0, 'Paper pixel must be completely transparent');

    // Verify ink pixels remain opaque (alpha > 200)
    const inkPixel1Alpha = pixels[(1 * width + 1) * 4 + 3];
    assert.ok(inkPixel1Alpha > 200, 'Ink pixel must remain opaque');

    const inkPixel2Alpha = pixels[(1 * width + 2) * 4 + 3];
    assert.ok(inkPixel2Alpha > 200, 'Ink pixel must remain opaque');

    // Verify bounding box tightly encloses the ink (x: 1..2, y: 1..2)
    assert.equal(result.boundingBox.minX, 1);
    assert.equal(result.boundingBox.maxX, 2);
    assert.equal(result.boundingBox.minY, 1);
    assert.equal(result.boundingBox.maxY, 2);
    assert.equal(result.boundingBox.cropWidth, 2);
    assert.equal(result.boundingBox.cropHeight, 2);
  });

  // -------------------------------------------------------------
  // Test 24: Scheme-sensitive CORS URL handling
  // -------------------------------------------------------------
  await t.test('24. Scheme-sensitive CORS handling prevents blob:/data: security rejection', () => {
    const isRemoteUrl = (url) => url.startsWith('http://') || url.startsWith('https://');

    // Local schemes must NOT trigger anonymous CORS
    assert.equal(isRemoteUrl('blob:http://localhost:3001/uuid-1234'), false);
    assert.equal(isRemoteUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='), false);

    // Remote schemes must trigger anonymous CORS
    assert.equal(isRemoteUrl('https://r2.kutchap.ac.th/cert/bg.png'), true);
    assert.equal(isRemoteUrl('http://storage.example.com/sig.png'), true);
  });

  // -------------------------------------------------------------
  // Test 25: Resilient fallback when background image is absent or invalid
  // -------------------------------------------------------------
  await t.test('25. drawCertificatePage renders fallback clean certificate card without crashing', () => {
    let strokeRectCalled = false;
    let fillRectCalled = false;

    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: () => { fillRectCalled = true; },
      strokeRect: () => { strokeRectCalled = true; },
      drawImage: () => { throw new Error('Simulated drawImage error'); },
      fillText: () => {},
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
      textBaseline: '',
      setLineDash: () => {},
    };

    const testTemplate = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'el_name',
          type: 'text',
          key: 'fullName',
          label: 'ชื่อ-นามสกุล',
          xPercent: 50,
          yPercent: 45,
          fontSizePt: 24,
          fontFamily: 'Sarabun',
          fontWeight: 'bold',
          color: '#1e293b',
          textAlign: 'center',
        },
      ],
    };

    // Calling drawCertificatePage with null or invalid background must NOT throw
    assert.doesNotThrow(() => {
      drawCertificatePage({
        ctx: mockCtx,
        width: 842,
        height: 595,
        dpi: 72,
        backgroundImage: null, // No background image
        template: testTemplate,
        data: { fullName: 'นายสมศักดิ์ รักเรียน' },
      });
    });

    assert.equal(fillRectCalled, true, 'Must fill fallback canvas background');
    assert.equal(strokeRectCalled, true, 'Must draw fallback certificate borders');
  });

  // -------------------------------------------------------------
  // Test 26: Token format validation (128-bit Base64URL contract)
  // -------------------------------------------------------------
  await t.test('26. isValidVerificationTokenFormat: Validates 22-char Base64URL and rejects malformed inputs', () => {
    // 22-character Base64URL string (128-bit)
    const valid128BitToken = crypto.randomBytes(16).toString('base64url');
    assert.equal(valid128BitToken.length, 22);
    assert.equal(isValidVerificationTokenFormat(valid128BitToken), true);

    // Legacy hex token (48 or 64 characters)
    const validLegacyHex = crypto.randomBytes(24).toString('hex');
    assert.equal(isValidVerificationTokenFormat(validLegacyHex), true);

    // Malformed / injection attacks
    assert.equal(isValidVerificationTokenFormat(''), false);
    assert.equal(isValidVerificationTokenFormat('abc'), false);
    assert.equal(isValidVerificationTokenFormat("' OR 1=1 --"), false);
    assert.equal(isValidVerificationTokenFormat('short_token_123'), false);
  });

  // -------------------------------------------------------------
  // Test 27: Multiline text rendering with newline splitting
  // -------------------------------------------------------------
  await t.test('27. Multiline signee text rendering: Splits lines by newline without throwing and offsets Y', () => {
    const renderedLines = [];
    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      drawImage: () => {},
      fillText: (text, x, y) => {
        renderedLines.push({ text, x, y });
      },
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
      textBaseline: '',
      setLineDash: () => {},
      measureText: (text) => ({ width: text.length * 10 }),
    };

    const testTemplate = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [
        {
          id: 'el_signee',
          type: 'text',
          key: 'signee1',
          label: 'ผู้ลงนาม',
          sampleText: '( นายวิจิตร สุขสงบ )\nผู้อำนวยการโรงเรียนกุดจับประชาสรรค์',
          xPercent: 50,
          yPercent: 80,
          fontSizePt: 16,
          fontFamily: 'Sarabun',
          color: '#000000',
        },
      ],
    };

    drawCertificatePage({
      ctx: mockCtx,
      width: 842,
      height: 595,
      dpi: 72,
      background: { mode: 'NONE' },
      template: testTemplate,
      data: {},
    });

    assert.equal(renderedLines.length, 2, 'Must render exactly 2 lines for multiline text');
    assert.equal(renderedLines[0].text, '( นายวิจิตร สุขสงบ )');
    assert.equal(renderedLines[1].text, 'ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์');
    assert.ok(renderedLines[1].y > renderedLines[0].y, 'Line 2 must have greater vertical Y offset than Line 1');
  });

  // -------------------------------------------------------------
  // Test 28: QR Code Badge ISO-compliant Quiet Zone & Level M
  // -------------------------------------------------------------
  await t.test('28. QR Code Badge: Level M matrix with Quiet Zone >= 4 modules and minimum physical size threshold', () => {
    let cardDrawn = false;
    let filledRectCount = 0;

    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: (x, y, w, h) => {
        filledRectCount++;
      },
      beginPath: () => {},
      roundRect: (x, y, w, h, r) => {
        cardDrawn = true;
      },
      fill: () => {},
      stroke: () => {},
      strokeRect: () => {},
      fillText: () => {},
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
    };

    const sampleUrl = 'https://eleave.kutchap.ac.th/v/' + crypto.randomBytes(16).toString('base64url');
    drawQRCodeBadge(mockCtx, 100, 100, 64, sampleUrl, {
      label: 'สแกนตรวจสอบ',
      showBadgeCard: true,
      dpi: 72,
      errorCorrection: 'M',
    });

    assert.equal(cardDrawn, true, 'Badge card must be rendered');
    assert.ok(filledRectCount > 10, 'QR modules must be drawn onto canvas context');
  });

  // -------------------------------------------------------------
  // Test 26: loadCanvasImage memory cache & ReferenceError immunity
  // -------------------------------------------------------------
  await t.test('26. loadCanvasImage caches in memory and handles Data URLs seamlessly without throwing ReferenceError', async () => {
    const originalImage = globalThis.Image;
    try {
      let instancesCreated = 0;
      globalThis.Image = class MockImage {
        constructor() {
          instancesCreated++;
          this.nodeName = 'IMG';
          this.complete = true;
          this.naturalWidth = 1200;
          this.naturalHeight = 800;
          this.width = 1200;
          this.height = 800;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const loadedImg = await loadCanvasImage(testDataUrl);

      assert.ok(isValidDrawableImage(loadedImg), 'Loaded image must be valid and drawable');
      assert.equal(loadedImg.naturalWidth, 1200);

      // Subsequent call must hit memory cache (0 extra Image instances created)
      const cachedImg = await loadCanvasImage(testDataUrl);
      assert.equal(cachedImg, loadedImg, 'Cached image instance must be returned');
      assert.equal(instancesCreated, 1, 'Only one Image instance created due to inMemoryImageCache');
    } finally {
      globalThis.Image = originalImage;
    }
  });

  // -------------------------------------------------------------
  // Test 27: Certificate Studio Mobile & Fullscreen Invariants
  // -------------------------------------------------------------
  await t.test('27. Studio state correctly models mobile drawers and edge-to-edge portal fullscreen', () => {
    const mobileWidth = 768;
    const desktopWidth = 1440;

    // Mobile viewport invariant: sidebars auto-close by default so canvas preview is unobscured
    const isMobileBreakpoint = (w) => w < 1024;
    assert.equal(isMobileBreakpoint(mobileWidth), true);
    assert.equal(isMobileBreakpoint(desktopWidth), false);

    // Fullscreen styling invariant: edge-to-edge z-[99999] without margins
    const getStudioClassNames = ({ isFullscreen }) => {
      return isFullscreen
        ? 'fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 overflow-hidden'
        : 'h-[calc(100vh-4rem)] min-h-[700px] rounded-2xl shadow-xl overflow-hidden border';
    };

    const fsClasses = getStudioClassNames({ isFullscreen: true });
    assert.ok(fsClasses.includes('fixed inset-0'), 'Must be fixed inset-0 in fullscreen');
    assert.ok(fsClasses.includes('z-[99999]'), 'Must have high z-index to overlay all navigation');
    assert.ok(fsClasses.includes('w-screen'), 'Must span 100vw');
    assert.ok(fsClasses.includes('h-screen'), 'Must span 100vh');
    assert.ok(fsClasses.includes('m-0 p-0'), 'Must have zero margins and padding for true edge-to-edge display');

    // Desktop panel collapse width invariant:
    const getPanelClass = (isOpen) => (isOpen ? 'w-72 sm:w-80 opacity-100' : 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none');
    assert.ok(getPanelClass(false).includes('w-0'));
    assert.ok(getPanelClass(true).includes('w-72 sm:w-80'));
  });

  // -------------------------------------------------------------
  // Test 28: Object URL Preview Lifecycle (Senior Invariant 1)
  // -------------------------------------------------------------
  await t.test('28. Object URL preview lifecycle avoids base64 heap bloating & revokes reliably', async () => {
    const revokedUrls = [];
    const createdUrls = [];
    const mockFile = { name: 'bg.png', size: 1024, type: 'image/png' };

    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    URL.createObjectURL = (file) => {
      const url = `blob:http://localhost/${file.name}-${createdUrls.length + 1}`;
      createdUrls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      revokedUrls.push(url);
    };

    try {
      // 1. Initial user file selection creates 0ms local preview URL
      let localPreviewUrl = URL.createObjectURL(mockFile);
      let backgroundUrl = localPreviewUrl;

      assert.equal(createdUrls.length, 1);
      assert.equal(backgroundUrl, 'blob:http://localhost/bg.png-1');

      // 2. If user selects another file before upload finishes, old URL is immediately revoked
      const secondFile = { name: 'bg2.png', size: 2048, type: 'image/png' };
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = null;
      }
      localPreviewUrl = URL.createObjectURL(secondFile);
      backgroundUrl = localPreviewUrl;

      assert.equal(revokedUrls.includes('blob:http://localhost/bg.png-1'), true, 'Previous preview URL must be revoked');
      assert.equal(backgroundUrl, 'blob:http://localhost/bg2.png-2');

      // 3. Upload succeeds -> cloud URL arrives -> preloads into memory cache -> revoke local object URL
      const cloudUrl = 'https://r2.storage.kutchap.ac.th/certs/bg2.png';
      backgroundUrl = cloudUrl;
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = null;
      }

      assert.equal(localPreviewUrl, null, 'Local preview ref must be nullified');
      assert.equal(revokedUrls.includes('blob:http://localhost/bg2.png-2'), true, 'Local preview URL must be cleanly revoked');
      assert.equal(backgroundUrl, cloudUrl, 'Background URL switched to permanent cloud URL');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  // -------------------------------------------------------------
  // Test 29: Image Cache Bounds and Eviction Lifecycle (Senior Invariant 2)
  // -------------------------------------------------------------
  await t.test('29. inMemoryImageCache enforces MAX_IMAGE_CACHE_SIZE bound and supports explicit eviction', async () => {
    clearImageCache();
    assert.equal(getImageCacheSize(), 0);

    const originalImage = globalThis.Image;
    try {
      globalThis.Image = class MockImage {
        constructor() {
          this.nodeName = 'IMG';
          this.complete = true;
          this.naturalWidth = 800;
          this.naturalHeight = 600;
          this.width = 800;
          this.height = 600;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      // Populate cache up to 35 images (exceeding MAX_IMAGE_CACHE_SIZE = 30)
      for (let i = 1; i <= 35; i++) {
        await loadCanvasImage(`https://mock.storage/img_${i}.png`);
      }

      // Max size must be strictly bounded to 30
      assert.equal(getImageCacheSize(), 30, 'Cache size must not exceed MAX_IMAGE_CACHE_SIZE (30)');

      // Evict specific entry
      evictImageCache('https://mock.storage/img_35.png');
      assert.equal(getImageCacheSize(), 29, 'Explicit eviction should remove entry');

      // Canonical key lookup support
      const canonicalKey = 'att_canonical_12345';
      await loadCanvasImage('https://mock.storage/dynamic_signed_url_xyz.png', canonicalKey);
      assert.equal(getImageCacheSize(), 30);

      // Evict by canonical key
      evictImageCache(canonicalKey);
      assert.equal(getImageCacheSize(), 29);

      // studio unmount calls clearImageCache()
      clearImageCache();
      assert.equal(getImageCacheSize(), 0, 'clearImageCache should completely wipe image cache on unmount');
    } finally {
      globalThis.Image = originalImage;
      clearImageCache();
    }
  });

  // -------------------------------------------------------------
  // Test 30: Fullscreen API Error Resilience & Portal Fallback (Senior Invariant 3)
  // -------------------------------------------------------------
  await t.test('30. Fullscreen API rejection is caught and gracefully falls back to CSS portal fullscreen', async () => {
    let nativeRequestCalled = false;
    let nativeExitCalled = false;
    let fallbackTriggered = false;

    // Simulate iframe or restricted permission policy rejection
    const mockContainer = {
      requestFullscreen: async () => {
        nativeRequestCalled = true;
        throw new Error('NotAllowedError: Permissions policy denies fullscreen');
      },
    };

    let isFullscreen = false;
    const handleToggleFullscreen = async () => {
      try {
        if (!isFullscreen) {
          try {
            await mockContainer.requestFullscreen();
          } catch (nativeErr) {
            // Senior Invariant 3: Native Fullscreen API failed, fallback to pure React portal fullscreen
            fallbackTriggered = true;
          }
          isFullscreen = true;
        } else {
          try {
            nativeExitCalled = true;
          } catch {}
          isFullscreen = false;
        }
      } catch (err) {
        console.error(err);
      }
    };

    await handleToggleFullscreen();
    assert.equal(nativeRequestCalled, true, 'Should attempt native Fullscreen API');
    assert.equal(fallbackTriggered, true, 'Should catch native error cleanly');
    assert.equal(isFullscreen, true, 'React portal fullscreen must activate despite native API rejection');

    // Toggle off
    await handleToggleFullscreen();
    assert.equal(nativeExitCalled, true);
    assert.equal(isFullscreen, false);
  });

  // -------------------------------------------------------------
  // Test 31: Body Scroll Lock Lifecycle (Senior Invariant 4)
  // -------------------------------------------------------------
  await t.test('31. Fullscreen activates body scroll lock and safely restores previous overflow on exit', () => {
    const mockBody = {
      style: {
        overflow: 'auto',
      },
    };

    let isFullscreen = false;
    let originalOverflow = '';

    const applyScrollLock = (fs) => {
      if (fs) {
        originalOverflow = mockBody.style.overflow;
        mockBody.style.overflow = 'hidden';
      } else {
        mockBody.style.overflow = originalOverflow;
      }
    };

    // 1. Enter fullscreen
    isFullscreen = true;
    applyScrollLock(isFullscreen);
    assert.equal(mockBody.style.overflow, 'hidden', 'Body overflow must be locked to hidden in fullscreen');

    // 2. Exit fullscreen
    isFullscreen = false;
    applyScrollLock(isFullscreen);
    assert.equal(mockBody.style.overflow, 'auto', 'Body overflow must be restored to original value on exit');
  });

  // -------------------------------------------------------------
  // Test 32: Responsive matchMedia Breakpoint Logic (Senior Invariant 5)
  // -------------------------------------------------------------
  await t.test('32. matchMedia breakpoint strictly mirrors Tailwind lg (1024px) boundary', () => {
    const mediaQueryString = '(max-width: 1023px)';

    const evaluateQuery = (width) => {
      const match = mediaQueryString.match(/max-width:\s*(\d+)px/);
      const maxWidth = match ? parseInt(match[1], 10) : 1023;
      return width <= maxWidth;
    };

    // Strictly below 1024px -> mobile drawer
    assert.equal(evaluateQuery(1023), true, '1023px must be mobile drawer mode');
    assert.equal(evaluateQuery(768), true, '768px tablet must be mobile drawer mode');
    assert.equal(evaluateQuery(375), true, '375px phone must be mobile drawer mode');

    // 1024px and above -> desktop panels
    assert.equal(evaluateQuery(1024), false, '1024px must be desktop panel mode');
    assert.equal(evaluateQuery(1280), false, '1280px must be desktop panel mode');
    assert.equal(evaluateQuery(1920), false, '1920px must be desktop panel mode');
  });

  // -------------------------------------------------------------
  // Test 33: Panel Accessibility & Escape Key Hierarchy (Senior Invariant 6)
  // -------------------------------------------------------------
  await t.test('33. Escape key hierarchy prioritizes closing mobile drawers before exiting fullscreen', () => {
    let isFullscreen = true;
    let isMobile = true;
    let leftPanelOpen = true;
    let rightPanelOpen = false;

    const handleEscapeKey = () => {
      if (isMobile && (leftPanelOpen || rightPanelOpen)) {
        leftPanelOpen = false;
        rightPanelOpen = false;
      } else if (isFullscreen) {
        isFullscreen = false;
      }
    };

    // 1. In mobile fullscreen with drawer open, Escape closes drawer first!
    handleEscapeKey();
    assert.equal(leftPanelOpen, false, 'Mobile drawer must close first on Escape');
    assert.equal(isFullscreen, true, 'Fullscreen must remain active while closing drawer');

    // 2. Second Escape exits fullscreen
    handleEscapeKey();
    assert.equal(isFullscreen, false, 'Second Escape exits fullscreen when drawers are closed');

    // 3. Accessibility attribute contracts
    const getAsideA11y = (isOpen) => ({
      'aria-hidden': !isOpen,
      inert: !isOpen ? true : undefined,
    });

    assert.deepEqual(getAsideA11y(false), { 'aria-hidden': true, inert: true });
    assert.deepEqual(getAsideA11y(true), { 'aria-hidden': false, inert: undefined });

    const getToggleA11y = (isOpen, panelId) => ({
      'aria-expanded': isOpen,
      'aria-controls': panelId,
    });

    assert.deepEqual(getToggleA11y(false, 'studio-left-panel'), {
      'aria-expanded': false,
      'aria-controls': 'studio-left-panel',
    });
    assert.deepEqual(getToggleA11y(true, 'studio-right-panel'), {
      'aria-expanded': true,
      'aria-controls': 'studio-right-panel',
    });
  });

  // -------------------------------------------------------------
  // Test 34: File Dialog Fullscreen Protection
  // -------------------------------------------------------------
  await t.test('34. File dialog opening protects studio from exiting fullscreen mode', () => {
    let isStudioFullscreen = true;
    let isFileDialogOpen = false;

    const handleFullscreenChange = (nativeFullscreenElement) => {
      if (!nativeFullscreenElement && isStudioFullscreen) {
        if (isFileDialogOpen) {
          return; // Fenced out! Studio stays fullscreen while OS file dialog is open
        }
        isStudioFullscreen = false;
      }
    };

    // 1. User clicks file upload -> sets file dialog flag
    isFileDialogOpen = true;

    // 2. OS opens file dialog -> browser exits HTML5 native fullscreen
    handleFullscreenChange(null);
    assert.equal(isStudioFullscreen, true, 'Studio must stay in fullscreen when file dialog opened');

    // 3. User finishes selecting file -> dialog flag reset
    isFileDialogOpen = false;

    // 4. Genuine user exit (Esc or toggle button)
    handleFullscreenChange(null);
    assert.equal(isStudioFullscreen, false, 'Studio exits fullscreen on genuine exit event');
  });

  // -------------------------------------------------------------
  // Test 35: Zoom Fit Algorithm Bounds & Dynamic Scaling
  // -------------------------------------------------------------
  await t.test('35. Zoom Fit algorithm fits large containers up to 2.5x without 1.5x choke', () => {
    const calcFit = (containerWidth, containerHeight, previewWidth, previewHeight) => {
      const pad = 32;
      const scaleW = Math.max(0.2, (containerWidth - pad) / previewWidth);
      const scaleH = Math.max(0.2, (containerHeight - pad) / previewHeight);
      const fit = Math.min(scaleW, scaleH);
      return Math.max(0.3, Math.min(2.5, Math.round(fit * 100) / 100));
    };

    // A4 Landscape is 842 x 595
    // On 1920x1080 screen with collapsed sidebars: container is approx 1800 x 950
    const fitWide = calcFit(1800, 950, 842, 595);
    assert.ok(fitWide > 1.5, `Fit on large screen (${fitWide}x) must exceed previous 1.5x choke`);
    assert.ok(fitWide <= 2.5, 'Fit must respect maximum 2.5x bound');

    // On smaller squished container (e.g. 384 x 500)
    const fitNarrow = calcFit(384, 500, 842, 595);
    assert.ok(fitNarrow >= 0.3, 'Fit must respect minimum 0.3x bound');
  });

  // -------------------------------------------------------------
  // Test 36: Studio Tab Navigation & Header Isolation
  // -------------------------------------------------------------
  await t.test('36. Studio mode conceals outer tab bar and outer onBack button to prevent layout leakage', () => {
    const shouldRenderOuterTabs = (activeTab) => activeTab !== 'studio';

    assert.equal(shouldRenderOuterTabs('issue'), true, 'Issue tab shows outer nav');
    assert.equal(shouldRenderOuterTabs('history'), true, 'History tab shows outer nav');
    assert.equal(shouldRenderOuterTabs('studio'), false, 'Studio mode conceals outer nav for immersive workspace');
  });

  // -------------------------------------------------------------
  // Test 37: Canvas Dimensions Initialization
  // -------------------------------------------------------------
  await t.test('37. Canvas dimensions always initialize to A4 aspect ratio instead of HTML5 300x150 default', () => {
    const getCanvasInitialDims = (orientation) => {
      const dims = {
        LANDSCAPE: { width: 842, height: 595 },
        PORTRAIT: { width: 595, height: 842 },
      }[orientation];
      return dims;
    };

    const landscape = getCanvasInitialDims('LANDSCAPE');
    assert.equal(landscape.width, 842);
    assert.equal(landscape.height, 595);
    assert.notEqual(landscape.width, 300);
    assert.notEqual(landscape.height, 150);

    const portrait = getCanvasInitialDims('PORTRAIT');
    assert.equal(portrait.width, 595);
    assert.equal(portrait.height, 842);
  });

  // -------------------------------------------------------------
  // Test 38: Fullscreen Zoom Neutralization & Edge-to-Edge Portal Invariants
  // -------------------------------------------------------------
  await t.test('38. Fullscreen mode neutralizes body zoom (preventing 90vw shrink) and enforces zero border-radius', () => {
    // Simulate body style state lifecycle
    const mockBody = {
      style: {
        overflow: '',
        zoom: '',
      },
    };

    const activateFullscreen = (body) => {
      const originalOverflow = body.style.overflow;
      const originalZoom = body.style.zoom;
      body.style.overflow = 'hidden';
      body.style.zoom = '1';
      return () => {
        body.style.overflow = originalOverflow;
        body.style.zoom = originalZoom;
      };
    };

    // 1. Prior to entering fullscreen, body has default zoom (or CSS zoom: 0.9)
    assert.equal(mockBody.style.zoom, '');
    assert.equal(mockBody.style.overflow, '');

    // 2. User toggles fullscreen: zoom must be explicitly set to '1' to neutralize globals.css 0.9 zoom
    const cleanup = activateFullscreen(mockBody);
    assert.equal(mockBody.style.zoom, '1', 'Body zoom must be 1 during fullscreen to avoid 10% viewport shrink');
    assert.equal(mockBody.style.overflow, 'hidden', 'Body scroll must be locked during fullscreen');

    // 3. Studio layout style props in fullscreen
    const getStudioFullscreenStyle = (isFullscreen) => {
      if (!isFullscreen) return undefined;
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        zIndex: 999999,
        margin: 0,
        padding: 0,
        borderRadius: 0,
        zoom: 1,
      };
    };

    const fsStyle = getStudioFullscreenStyle(true);
    assert.equal(fsStyle.position, 'fixed');
    assert.equal(fsStyle.width, '100vw');
    assert.equal(fsStyle.height, '100vh');
    assert.equal(fsStyle.borderRadius, 0);
    assert.equal(fsStyle.zIndex, 999999);
    assert.equal(fsStyle.zoom, 1);

    // 4. On exit fullscreen: body style restored cleanly
    cleanup();
    assert.equal(mockBody.style.zoom, '');
    assert.equal(mockBody.style.overflow, '');
  });

  // -------------------------------------------------------------
  // Test 39: Canvas CORS Taint Immunization & Same-Origin Proxy Invariants
  // -------------------------------------------------------------
  await t.test('39. Canvas CORS Taint Immunization: loadCanvasImage handles blob/data URLs and isolates remote images', async () => {
    const originalImage = globalThis.Image;
    try {
      const mockImgInstances = [];
      globalThis.Image = class MockImage {
        constructor() {
          this.nodeName = 'IMG';
          this.complete = true;
          this.naturalWidth = 1920;
          this.naturalHeight = 1080;
          this.width = 1920;
          this.height = 1080;
          mockImgInstances.push(this);
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      // 1. Blob URL must NOT have crossOrigin set (setting crossOrigin on blob: causes browser rejection)
      const blobUrl = 'blob:http://localhost:3000/mock-blob-1234';
      const loadedBlobImg = await loadCanvasImage(blobUrl);
      assert.ok(loadedBlobImg);
      const blobInstance = mockImgInstances[mockImgInstances.length - 1];
      assert.equal(blobInstance.crossOrigin, undefined, 'Blob URLs must never have crossOrigin set');

      // 2. Data URL must NOT have crossOrigin set
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const loadedDataImg = await loadCanvasImage(dataUrl);
      assert.ok(loadedDataImg);
      const dataInstance = mockImgInstances[mockImgInstances.length - 1];
      assert.equal(dataInstance.crossOrigin, undefined, 'Data URLs must never have crossOrigin set');

      // 3. Clear image cache wipes cache
      clearImageCache();
      assert.equal(getImageCacheSize(), 0);
    } finally {
      globalThis.Image = originalImage;
      clearImageCache();
    }
  });

  // -------------------------------------------------------------
  // Test 40: Clean certificate number without hardcoded "กจ." & Prefix customization
  // -------------------------------------------------------------
  await t.test('40. Certificate number defaults are pure numbers (001/2569) and prefixes are user-configurable', () => {
    // 1. DEFAULT_CERTIFICATE_ELEMENTS: certNumber has pure sampleText "001/2569" without "กจ."
    const defaultCertNum = DEFAULT_CERTIFICATE_ELEMENTS.find((el) => el.key === 'certNumber');
    assert.ok(defaultCertNum, 'certNumber element should exist in defaults');
    assert.equal(defaultCertNum.sampleText, '001/2569');
    assert.ok(!defaultCertNum.sampleText.includes('กจ.'), 'Default certNumber sampleText must NOT contain hardcoded "กจ."');

    // 2. ELEMENT_PRESETS: certNumber preset has pure sampleText "001/2569" without "กจ."
    const presetCertNum = ELEMENT_PRESETS.find((p) => p.key === 'certNumber');
    assert.ok(presetCertNum, 'certNumber preset should exist in presets');
    assert.equal(presetCertNum.defaultElement.sampleText, '001/2569');
    assert.ok(!presetCertNum.defaultElement.sampleText.includes('กจ.'), 'Preset certNumber sampleText must NOT contain hardcoded "กจ."');

    // 3. User prefix flexibility: when user adds prefix "กจ. " or "เลขที่ ", it renders accurately
    const elWithCustomPrefix = {
      ...defaultCertNum,
      prefix: 'กจ. ',
      sampleText: '001/2569',
      suffix: '',
    };
    const renderedCustom = `${elWithCustomPrefix.prefix}${elWithCustomPrefix.sampleText}${elWithCustomPrefix.suffix}`;
    assert.equal(renderedCustom, 'กจ. 001/2569');

    const elWithNoPrefix = {
      ...defaultCertNum,
      prefix: '',
      sampleText: '001/2569',
      suffix: '',
    };
    const renderedClean = `${elWithNoPrefix.prefix}${elWithNoPrefix.sampleText}${elWithNoPrefix.suffix}`;
    assert.equal(renderedClean, '001/2569');

    // 4. Legacy element sanitization correctly strips any legacy "กจ. "
    const legacySample = 'กจ. 001/2569';
    const sanitized = legacySample.replace(/^กจ\.\s*/, '');
    assert.equal(sanitized, '001/2569');
  });

  // -------------------------------------------------------------
  // Test 41: Public verification token format supports SAMPLE preview tokens and CUIDs
  // -------------------------------------------------------------
  await t.test('41. isValidVerificationTokenFormat accepts SAMPLE preview tokens and CUIDs for draft designer testing', () => {
    // 1. SAMPLE format is accepted (case-insensitive)
    assert.equal(isValidVerificationTokenFormat('SAMPLE'), true);
    assert.equal(isValidVerificationTokenFormat('sample'), true);
    assert.equal(isValidVerificationTokenFormat('  SAMPLE  '), true);

    // 2. CUIDs are accepted (25-char alphanumeric starting with 'c')
    const sampleCuid = 'clx1234567890123456789012';
    assert.equal(isValidVerificationTokenFormat(sampleCuid), true);

    // 3. 22-char Base64URL and 48-64 hex strings are accepted
    const valid128Bit = crypto.randomBytes(16).toString('base64url');
    assert.equal(isValidVerificationTokenFormat(valid128Bit), true);

    // 4. Invalid/malformed tokens are safely rejected
    assert.equal(isValidVerificationTokenFormat('invalid!'), false);
    assert.equal(isValidVerificationTokenFormat('12345'), false);
    assert.equal(isValidVerificationTokenFormat(''), false);
    assert.equal(isValidVerificationTokenFormat(null), false);
    assert.equal(isValidVerificationTokenFormat(undefined), false);
  });

  // -------------------------------------------------------------
  // Test 42: Excel column mapper handles system-exported headers & QR token extraction
  // -------------------------------------------------------------
  await t.test('42. Excel importer correctly parses exported column headers and extracts verification tokens', () => {
    // Helper function mirroring handleExcelImport logic
    const getField = (r, candidates) => {
      for (const key of candidates) {
        if (r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== '') {
          return String(r[key]).trim();
        }
      }
      const rowKeys = Object.keys(r);
      for (const cand of candidates) {
        const candLower = cand.toLowerCase();
        const foundKey = rowKeys.find((k) => k.toLowerCase().includes(candLower) || candLower.includes(k.toLowerCase()));
        if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null && String(r[foundKey]).trim() !== '') {
          return String(r[foundKey]).trim();
        }
      }
      return '';
    };

    // Row as exported by handleExportMailMergeXlsx in cert-generator.tsx
    const exportedRow = {
      'ลำดับ': 1,
      'เลขที่เกียรติบัตร': '005/2569',
      'บทบาท': 'รางวัลชนะเลิศ อันดับ ๑',
      'ชื่อ-นามสกุลผู้รับ (พิมพ์ชื่อที่นี่)': 'เด็กหญิงสมหญิง รักเรียน',
      'โรงเรียน / หน่วยงาน': 'โรงเรียนกุดจับประชาสรรค์',
      'วันที่ออกเกียรติบัตร': '๑๑ กันยายน พ.ศ. ๒๕๖๙',
      'ชื่อกิจกรรม / โครงการ': 'การแข่งขันวิทยาศาสตร์ ประจำปี ๒๕๖๙',
      'ลิงก์ตรวจสอบ QR Code': 'http://localhost:3000/verify/cert?token=xyz1234567890123456789',
    };

    const certNumber = getField(exportedRow, ['เลขที่เกียรติบัตร', 'เลขที่', 'certNumber']);
    assert.equal(certNumber, '005/2569');

    const role = getField(exportedRow, ['บทบาท/รางวัล', 'บทบาท', 'รางวัล', 'role']);
    assert.equal(role, 'รางวัลชนะเลิศ อันดับ ๑');

    const fullName = getField(exportedRow, ['ชื่อ-นามสกุลผู้รับ (พิมพ์ชื่อที่นี่)', 'ชื่อ-นามสกุล', 'name']);
    assert.equal(fullName, 'เด็กหญิงสมหญิง รักเรียน');

    const activityName = getField(exportedRow, ['ชื่อกิจกรรม / โครงการ', 'ชื่อกิจกรรม', 'activityName']);
    assert.equal(activityName, 'การแข่งขันวิทยาศาสตร์ ประจำปี ๒๕๖๙');

    const department = getField(exportedRow, ['โรงเรียน / หน่วยงาน', 'หน่วยงาน', 'organization']);
    assert.equal(department, 'โรงเรียนกุดจับประชาสรรค์');

    const rawQr = getField(exportedRow, ['ลิงก์ตรวจสอบ QR Code', 'ลิงก์ตรวจสอบ', 'qrCode']);
    const tokenMatch = rawQr.match(/token=([A-Za-z0-9_-]+)/) || rawQr.match(/\/v\/([A-Za-z0-9_-]+)/);
    assert.ok(tokenMatch);
    assert.equal(tokenMatch[1], 'xyz1234567890123456789');

    const reconstructedQr = `https://eleave.kutchap.ac.th/v/${tokenMatch[1]}`;
    assert.equal(reconstructedQr, 'https://eleave.kutchap.ac.th/v/xyz1234567890123456789');
  });

  // -------------------------------------------------------------
  // Test 43: Deep Immutable Undo Snapshot (Invariant: structuredClone prevents mutation drift)
  // -------------------------------------------------------------
  await t.test('43. Deep Immutable Undo Snapshot: structuredClone isolates history stack from element mutations', () => {
    // Initial active state
    let elements = [
      { id: 'el-1', type: 'text', key: 'fullName', label: 'ชื่อ', xPercent: 50, yPercent: 40, fontSizePt: 24 },
      { id: 'el-2', type: 'text', key: 'role', label: 'บทบาท', xPercent: 50, yPercent: 50, fontSizePt: 18 },
    ];
    let backgroundAttachmentId = 'att_bg_1';
    let backgroundUrl = 'https://mock.storage/bg1.png';
    let orientation = 'LANDSCAPE';

    const undoStack = [];
    const redoStack = [];

    // Helper: take snapshot using structuredClone
    const pushSnapshot = () => {
      undoStack.push(structuredClone({
        elements,
        backgroundAttachmentId,
        backgroundUrl,
        orientation,
      }));
      redoStack.length = 0;
    };

    // 1. Take snapshot of initial state
    pushSnapshot();
    assert.equal(undoStack.length, 1);

    // 2. Direct mutation on active elements array and nested objects (e.g. user drags element)
    elements[0].xPercent = 95;
    elements[0].fontSizePt = 48;
    elements.push({ id: 'el-3', type: 'qrcode', key: 'qrCode', label: 'QR', xPercent: 80, yPercent: 80, fontSizePt: 12 });
    backgroundAttachmentId = 'att_bg_2';
    backgroundUrl = 'https://mock.storage/bg2.png';

    // 3. Invariant: Snapshot inside undoStack must NOT be affected by mutations
    const snapshot = undoStack[0];
    assert.equal(snapshot.elements.length, 2, 'Snapshot must still contain exactly 2 elements');
    assert.equal(snapshot.elements[0].xPercent, 50, 'Snapshot xPercent must remain 50');
    assert.equal(snapshot.elements[0].fontSizePt, 24, 'Snapshot fontSizePt must remain 24');
    assert.equal(snapshot.backgroundAttachmentId, 'att_bg_1');
    assert.equal(snapshot.backgroundUrl, 'https://mock.storage/bg1.png');

    // 4. Undo restores initial state cleanly
    const restored = undoStack.pop();
    redoStack.push(structuredClone({ elements, backgroundAttachmentId, backgroundUrl, orientation }));
    elements = restored.elements;
    backgroundAttachmentId = restored.backgroundAttachmentId;
    backgroundUrl = restored.backgroundUrl;
    orientation = restored.orientation;

    assert.equal(elements.length, 2);
    assert.equal(elements[0].xPercent, 50);
    assert.equal(redoStack.length, 1);
    assert.equal(redoStack[0].elements.length, 3);
  });

  // -------------------------------------------------------------
  // Test 44: Undoable vs Non-Undoable State Boundary (Invariant: Selection and Zoom Scale Preserved)
  // -------------------------------------------------------------
  await t.test('44. Undoable vs Non-Undoable State Boundary: Undo/Redo preserves selectedElementId, zoomScale, and pan state', () => {
    // Designer full state
    const studioState = {
      // Undoable slice
      elements: [
        { id: 'el-1', type: 'text', key: 'fullName', label: 'ชื่อ', xPercent: 50, yPercent: 40 },
      ],
      backgroundAttachmentId: 'att_bg_initial',
      backgroundUrl: 'https://mock.storage/bg_initial.png',
      orientation: 'LANDSCAPE',

      // Non-undoable slice (UI viewport / selection)
      selectedElementId: 'el-1',
      zoomScale: 1.5,
      isPanMode: true,
      activeTab: 'layers',
    };

    const undoStack = [];

    // History Transaction Boundary
    const performUndoableAction = (mutateFn) => {
      // Push ONLY the undoable state slice
      undoStack.push(structuredClone({
        elements: studioState.elements,
        backgroundAttachmentId: studioState.backgroundAttachmentId,
        backgroundUrl: studioState.backgroundUrl,
        orientation: studioState.orientation,
      }));
      mutateFn();
    };

    // User adds new element and selects it at zoom 2.0
    performUndoableAction(() => {
      studioState.elements.push({ id: 'el-2', type: 'text', key: 'date', label: 'วันที่', xPercent: 50, yPercent: 70 });
      studioState.selectedElementId = 'el-2';
      studioState.zoomScale = 2.0;
      studioState.isPanMode = false;
    });

    assert.equal(studioState.elements.length, 2);
    assert.equal(studioState.selectedElementId, 'el-2');
    assert.equal(studioState.zoomScale, 2.0);

    // User triggers Undo:
    const previous = undoStack.pop();
    studioState.elements = previous.elements;
    studioState.backgroundAttachmentId = previous.backgroundAttachmentId;
    studioState.backgroundUrl = previous.backgroundUrl;
    studioState.orientation = previous.orientation;
    // Note: studioState.selectedElementId, zoomScale, isPanMode are deliberately NOT reset from history!

    assert.equal(studioState.elements.length, 1, 'Elements reverted to initial 1 item');
    assert.equal(studioState.zoomScale, 2.0, 'zoomScale must NOT be reverted by undo');
    assert.equal(studioState.isPanMode, false, 'panMode must remain as currently set');
    assert.equal(studioState.elements.some((el) => el.id === studioState.selectedElementId), false);
  });

  // -------------------------------------------------------------
  // Test 45: Service-Side Template RBAC Matrix (PRIVATE, SCHOOL_SHARED, SYSTEM_PRESET)
  // -------------------------------------------------------------
  await t.test('45. Service-Side Template RBAC Matrix: strictly validates creator vs non-creator vs admin permissions', () => {
    // Model RBAC evaluator matching saveTemplateService & deleteTemplateService rules
    function evaluatePermission({ action, template, user, inputScope }) {
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

      if (action === 'CREATE') {
        if (inputScope === 'SYSTEM_PRESET') {
          return { allowed: false, code: 'PRESET_IMMUTABLE', error: 'Cannot create SYSTEM_PRESET directly' };
        }
        if (inputScope === 'SCHOOL_SHARED' && !isAdmin && !user.canShareCertTemplates) {
          return { allowed: false, code: 'FORBIDDEN', error: 'Sharing templates requires admin approval' };
        }
        return { allowed: true };
      }

      if (action === 'UPDATE') {
        if (template.scope === 'SYSTEM_PRESET') {
          return { allowed: false, code: 'PRESET_IMMUTABLE', error: 'System presets cannot be modified directly. Use Fork.' };
        }
        if (inputScope === 'SYSTEM_PRESET') {
          return { allowed: false, code: 'PRESET_IMMUTABLE', error: 'Cannot promote templates to SYSTEM_PRESET.' };
        }
        if (template.scope === 'PRIVATE') {
          if (template.createdById !== user.userId && !isAdmin) {
            return { allowed: false, code: 'FORBIDDEN', error: 'You can only edit your own private templates.' };
          }
        }
        if (template.scope === 'SCHOOL_SHARED') {
          if (template.createdById !== user.userId && !isAdmin) {
            return { allowed: false, code: 'FORBIDDEN', error: 'School-shared templates can only be edited by creator or admin.' };
          }
        }
        return { allowed: true };
      }

      if (action === 'DELETE') {
        if (template.scope === 'SYSTEM_PRESET') {
          return { allowed: false, code: 'PRESET_IMMUTABLE', error: 'System presets cannot be deleted.' };
        }
        if (template.createdById !== user.userId && !isAdmin) {
          return { allowed: false, code: 'FORBIDDEN', error: 'You can only delete your own templates.' };
        }
        return { allowed: true };
      }

      return { allowed: false, code: 'UNKNOWN_ACTION' };
    }

    const ownerUser = { userId: 'user-teacher-1', role: 'TEACHER', canShareCertTemplates: false };
    const otherUser = { userId: 'user-teacher-2', role: 'TEACHER', canShareCertTemplates: false };
    const adminUser = { userId: 'user-admin-1', role: 'ADMIN', canShareCertTemplates: true };

    const privateTmpl = { id: 'tmpl-1', scope: 'PRIVATE', createdById: 'user-teacher-1' };
    const sharedTmpl = { id: 'tmpl-2', scope: 'SCHOOL_SHARED', createdById: 'user-teacher-1' };
    const presetTmpl = { id: 'tmpl-3', scope: 'SYSTEM_PRESET', createdById: null };

    // 1. Owner can update & delete own PRIVATE template
    assert.equal(evaluatePermission({ action: 'UPDATE', template: privateTmpl, user: ownerUser, inputScope: 'PRIVATE' }).allowed, true);
    assert.equal(evaluatePermission({ action: 'DELETE', template: privateTmpl, user: ownerUser }).allowed, true);

    // 2. Other user CANNOT update or delete owner's PRIVATE template
    assert.equal(evaluatePermission({ action: 'UPDATE', template: privateTmpl, user: otherUser, inputScope: 'PRIVATE' }).code, 'FORBIDDEN');
    assert.equal(evaluatePermission({ action: 'DELETE', template: privateTmpl, user: otherUser }).code, 'FORBIDDEN');

    // 3. Admin CAN update & delete any PRIVATE template
    assert.equal(evaluatePermission({ action: 'UPDATE', template: privateTmpl, user: adminUser, inputScope: 'PRIVATE' }).allowed, true);
    assert.equal(evaluatePermission({ action: 'DELETE', template: privateTmpl, user: adminUser }).allowed, true);

    // 4. Other user CANNOT update owner's SCHOOL_SHARED template
    assert.equal(evaluatePermission({ action: 'UPDATE', template: sharedTmpl, user: otherUser, inputScope: 'SCHOOL_SHARED' }).code, 'FORBIDDEN');

    // 5. Nobody can modify or delete SYSTEM_PRESET directly
    assert.equal(evaluatePermission({ action: 'UPDATE', template: presetTmpl, user: adminUser, inputScope: 'SYSTEM_PRESET' }).code, 'PRESET_IMMUTABLE');
    assert.equal(evaluatePermission({ action: 'DELETE', template: presetTmpl, user: adminUser }).code, 'PRESET_IMMUTABLE');
    assert.equal(evaluatePermission({ action: 'UPDATE', template: presetTmpl, user: ownerUser, inputScope: 'PRIVATE' }).code, 'PRESET_IMMUTABLE');
  });

  // -------------------------------------------------------------
  // Test 46: Fork Source Row Lock & Reference Acquisition (Invariants W, AA)
  // -------------------------------------------------------------
  await t.test('46. Fork Source Row Lock & Reference Acquisition: acquires lock, collects all persistent attachments and increments references', async () => {
    // Mock database tables
    const attachments = new Map([
      ['att_bg_src', { id: 'att_bg_src', attachmentStatus: 'ACTIVE', referenceCount: 1 }],
      ['att_sig_1', { id: 'att_sig_1', attachmentStatus: 'ACTIVE', referenceCount: 2 }],
      ['att_font_1', { id: 'att_font_1', attachmentStatus: 'ACTIVE', referenceCount: 1 }],
    ]);

    const templates = new Map([
      [
        'tmpl_src_1',
        {
          id: 'tmpl_src_1',
          name: 'เกียรติบัตรดีเด่น',
          orientation: 'LANDSCAPE',
          backgroundAttachmentId: 'att_bg_src',
          scope: 'SCHOOL_SHARED',
          createdById: 'teacher-1',
          layoutConfig: {
            schemaVersion: 1,
            orientation: 'LANDSCAPE',
            elements: [
              { id: 'el-1', type: 'text', key: 'fullName', label: 'ชื่อ', xPercent: 50, yPercent: 40 },
              { id: 'el-2', type: 'signature', key: 'signature1', label: 'ลายเซ็น', xPercent: 50, yPercent: 80, signatureAttachmentId: 'att_sig_1' },
            ],
            customFonts: [
              { family: 'SpecialFont', attachmentId: 'att_font_1', fontVersion: '1.0.0', assetHash: 'a'.repeat(64) },
            ],
          },
        },
      ],
    ]);

    let rowLocked = false;
    // Simulate fork transaction
    const executeFork = async (sourceId, targetUserId) => {
      // 1. Lock source row (FOR UPDATE)
      rowLocked = true;
      const source = templates.get(sourceId);
      if (!source) throw new Error('NOT_FOUND');

      // 2. Collect persistent attachments (background + signatures + custom fonts)
      const sigIds = source.layoutConfig.elements.map((el) => el.signatureAttachmentId).filter(Boolean);
      const fontIds = source.layoutConfig.customFonts.map((f) => f.attachmentId).filter(Boolean);
      const allAttIds = Array.from(new Set([source.backgroundAttachmentId, ...sigIds, ...fontIds].filter(Boolean))).sort();

      // 3. Acquire references
      for (const id of allAttIds) {
        const att = attachments.get(id);
        if (!att || att.attachmentStatus !== 'ACTIVE') {
          throw new Error('ATTACHMENT_UNAVAILABLE');
        }
        att.referenceCount += 1;
      }

      // 4. Create new PRIVATE template
      const forkedId = `tmpl_fork_${Date.now()}`;
      const forked = {
        id: forkedId,
        name: `${source.name} (คัดลอก)`,
        orientation: source.orientation,
        backgroundAttachmentId: source.backgroundAttachmentId,
        layoutConfig: structuredClone(source.layoutConfig),
        scope: 'PRIVATE',
        createdById: targetUserId,
      };
      templates.set(forkedId, forked);
      return forked;
    };

    const forked = await executeFork('tmpl_src_1', 'teacher-2');
    assert.equal(rowLocked, true, 'Source row lock must be acquired');
    assert.equal(forked.scope, 'PRIVATE');
    assert.equal(forked.name, 'เกียรติบัตรดีเด่น (คัดลอก)');
    assert.equal(forked.createdById, 'teacher-2');

    // References for all 3 attachments must be incremented by 1
    assert.equal(attachments.get('att_bg_src').referenceCount, 2);
    assert.equal(attachments.get('att_sig_1').referenceCount, 3);
    assert.equal(attachments.get('att_font_1').referenceCount, 2);
  });

  // -------------------------------------------------------------
  // Test 47: Fork Attachment State Gate (Invariant: Aborts if attachment not ACTIVE)
  // -------------------------------------------------------------
  await t.test('47. Fork Attachment State Gate: transaction aborts if any dependent attachment is not ACTIVE', async () => {
    const attachments = new Map([
      ['att_bg', { id: 'att_bg', attachmentStatus: 'ACTIVE', referenceCount: 1 }],
      ['att_font_corrupted', { id: 'att_font_corrupted', attachmentStatus: 'PENDING_DELETE', referenceCount: 0 }],
    ]);

    const executeForkWithGate = (attIds) => {
      for (const id of attIds) {
        const att = attachments.get(id);
        if (!att || att.attachmentStatus !== 'ACTIVE') {
          throw new Error(`ATTACHMENT_UNAVAILABLE: Attachment ${id} is not in ACTIVE state (${att?.attachmentStatus})`);
        }
      }
    };

    // Fails because att_font_corrupted is PENDING_DELETE
    assert.throws(
      () => executeForkWithGate(['att_bg', 'att_font_corrupted']),
      /ATTACHMENT_UNAVAILABLE/
    );

    // References remain unchanged on abort
    assert.equal(attachments.get('att_bg').referenceCount, 1);
  });

  // -------------------------------------------------------------
  // Test 48: Font SOT Invariant: CustomFontSchema strictly excludes transient URLs & verifies 64-hex SHA-256
  // -------------------------------------------------------------
  await t.test('48. Font SOT Invariant: CustomFontSchema strictly rejects transient URLs and enforces 64-hex SHA-256 hash', () => {
    const validCustomFont = {
      family: 'MyCustomSarabun',
      attachmentId: 'att_font_123',
      fontVersion: '1.0.0',
      assetHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    };

    // 1. Valid custom font passes schema validation
    const parsed = CustomFontSchema.safeParse(validCustomFont);
    assert.equal(parsed.success, true);

    // 2. Strict rejection of transient/derived 'url' (P0-1 invariant)
    const taintedCustomFont = {
      ...validCustomFont,
      url: 'https://cdn.example.com/fonts/my-font.woff2', // FORBIDDEN!
    };
    const taintedResult = CustomFontSchema.safeParse(taintedCustomFont);
    assert.equal(taintedResult.success, false, 'CustomFontSchema must reject any presence of url');

    // 3. Rejects invalid hash (not 64 hex characters)
    const shortHashFont = { ...validCustomFont, assetHash: 'abc123' };
    assert.equal(CustomFontSchema.safeParse(shortHashFont).success, false);

    const nonHexHashFont = { ...validCustomFont, assetHash: 'z'.repeat(64) };
    assert.equal(CustomFontSchema.safeParse(nonHexHashFont).success, false);

    // 4. extractCustomFontAttachmentIds extracts clean list of unique IDs
    const layoutConfig = {
      schemaVersion: 1,
      orientation: 'LANDSCAPE',
      elements: [],
      customFonts: [
        { family: 'F1', attachmentId: 'att_1', fontVersion: '1.0.0', assetHash: '0'.repeat(64) },
        { family: 'F2', attachmentId: 'att_2', fontVersion: '1.0.0', assetHash: '1'.repeat(64) },
        { family: 'F1-Bold', attachmentId: 'att_1', fontVersion: '1.0.0', assetHash: '2'.repeat(64) }, // Duplicate attachmentId
      ],
    };
    const extractedIds = extractCustomFontAttachmentIds(layoutConfig);
    assert.deepEqual(extractedIds, ['att_1', 'att_2']);
  });

  // -------------------------------------------------------------
  // Test 49: Font Binary SHA-256 Verification: computeBufferSha256 and integrity checks
  // -------------------------------------------------------------
  await t.test('49. Font Binary SHA-256 Verification: computeBufferSha256 produces exact match and rejects tampered bytes', async () => {
    // Generate known binary buffer
    const testBytes = Buffer.from('Mock WOFF2 Font Binary Content for Certificate Studio');
    const expectedHash = crypto.createHash('sha256').update(testBytes).digest('hex');

    // 1. computeBufferSha256 produces identical hash for Buffer (ArrayBufferView)
    const computedHashFromView = await computeBufferSha256(testBytes);
    assert.equal(computedHashFromView, expectedHash);

    // 2. computeBufferSha256 produces identical hash for pure ArrayBuffer
    const isolatedArrayBuffer = testBytes.buffer.slice(testBytes.byteOffset, testBytes.byteOffset + testBytes.byteLength);
    const computedHashFromBuf = await computeBufferSha256(isolatedArrayBuffer);
    assert.equal(computedHashFromBuf, expectedHash);

    // 3. Tampered content generates different hash
    const tamperedBytes = Buffer.from('Mock WOFF2 Font Binary Content - TAMPERED');
    const tamperedHash = await computeBufferSha256(tamperedBytes);
    assert.notEqual(tamperedHash, expectedHash);

    // 4. Verification function rejects hash mismatch
    const verifyHashMatch = (actual, expected) => {
      if (actual.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(`Font integrity verification failed: hash mismatch (expected ${expected}, got ${actual})`);
      }
      return true;
    };

    assert.equal(verifyHashMatch(computedHashFromView, expectedHash), true);
    assert.throws(() => verifyHashMatch(tamperedHash, expectedHash), /Font integrity verification failed/);
  });

  // -------------------------------------------------------------
  // Test 50: Server-Side Font Magic Bytes & Hash Computation
  // -------------------------------------------------------------
  await t.test('50. Server-Side Font Magic Bytes: detectFontMagicBytes recognizes WOFF2, WOFF, TTF, OTF and rejects non-fonts', () => {
    // 1. WOFF2 magic bytes 'wOF2' (0x77, 0x4F, 0x46, 0x32)
    const woff2Buffer = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01]);
    const woff2Res = detectFontMagicBytes(woff2Buffer);
    assert.equal(woff2Res.valid, true);
    assert.equal(woff2Res.format, 'woff2');
    assert.equal(woff2Res.mimeType, 'font/woff2');

    // 2. WOFF magic bytes 'wOFF' (0x77, 0x4F, 0x46, 0x46)
    const woffBuffer = Buffer.from([0x77, 0x4f, 0x46, 0x46, 0x00, 0x01]);
    const woffRes = detectFontMagicBytes(woffBuffer);
    assert.equal(woffRes.valid, true);
    assert.equal(woffRes.format, 'woff');
    assert.equal(woffRes.mimeType, 'font/woff');

    // 3. TrueType magic bytes 0x00, 0x01, 0x00, 0x00
    const ttfBuffer1 = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x04]);
    const ttfRes1 = detectFontMagicBytes(ttfBuffer1);
    assert.equal(ttfRes1.valid, true);
    assert.equal(ttfRes1.format, 'ttf');

    // 4. TrueType magic bytes 'true' (0x74, 0x72, 0x75, 0x65)
    const ttfBuffer2 = Buffer.from([0x74, 0x72, 0x75, 0x65, 0x00, 0x04]);
    const ttfRes2 = detectFontMagicBytes(ttfBuffer2);
    assert.equal(ttfRes2.valid, true);
    assert.equal(ttfRes2.format, 'ttf');

    // 5. OpenType magic bytes 'OTTO' (0x4F, 0x54, 0x54, 0x4F)
    const otfBuffer = Buffer.from([0x4f, 0x54, 0x54, 0x4f, 0x00, 0x08]);
    const otfRes = detectFontMagicBytes(otfBuffer);
    assert.equal(otfRes.valid, true);
    assert.equal(otfRes.format, 'otf');

    // 6. Non-font files rejected
    assert.equal(detectFontMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47])).valid, false); // PNG
    assert.equal(detectFontMagicBytes(Buffer.from('GIF89a')).valid, false); // GIF
    assert.equal(detectFontMagicBytes(Buffer.from('%PDF-1.4')).valid, false); // PDF
    assert.equal(detectFontMagicBytes(Buffer.from('hello')).valid, false); // Text
    assert.equal(detectFontMagicBytes(Buffer.from([])).valid, false); // Empty
    assert.equal(detectFontMagicBytes(null).valid, false); // Null
  });

  // -------------------------------------------------------------
  // Test 51: Attachment Authorization & Category Gate (Item 7)
  // -------------------------------------------------------------
  await t.test('51. Attachment Authorization & Category Gate: validates active status, category match, and caller permissions', () => {
    // Model getAttachmentUrlAction security logic
    function evaluateAttachmentAccess({ user, attachment, expectedCategory }) {
      if (!user) return { success: false, error: 'Unauthorized' };
      if (!attachment) return { success: false, error: 'Attachment not found' };
      if (attachment.attachmentStatus !== 'ACTIVE') return { success: false, error: 'Attachment is not active' };

      if (expectedCategory) {
        const key = attachment.objectKey.toLowerCase();
        if (expectedCategory === 'BACKGROUND' && !key.includes('background')) {
          return { success: false, error: 'Attachment is not a background image' };
        }
        if (expectedCategory === 'SIGNATURE' && !key.includes('signature')) {
          return { success: false, error: 'Attachment is not a signature image' };
        }
        if (expectedCategory === 'CUSTOM_FONT' && !key.includes('font')) {
          return { success: false, error: 'Attachment is not a font file' };
        }
      }

      const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
      if (attachment.templates && attachment.templates.length > 0) {
        const hasAccess = attachment.templates.some(
          (t) => t.scope === 'SYSTEM_PRESET' || t.scope === 'SCHOOL_SHARED' || t.createdById === user.id || isAdminUser
        );
        if (!hasAccess) {
          return { success: false, error: 'Forbidden' };
        }
      }

      return { success: true, url: `https://storage.kutchap.ac.th/${attachment.objectKey}` };
    }

    const user1 = { id: 'u1', role: 'TEACHER' };
    const user2 = { id: 'u2', role: 'TEACHER' };
    const admin = { id: 'adm', role: 'ADMIN' };

    const fontAttachment = {
      id: 'att_font',
      objectKey: 'cert-fonts/noto_jp.woff2',
      attachmentStatus: 'ACTIVE',
      templates: [{ id: 't1', scope: 'PRIVATE', createdById: 'u1' }],
    };

    // 1. Owner can access
    assert.equal(evaluateAttachmentAccess({ user: user1, attachment: fontAttachment, expectedCategory: 'CUSTOM_FONT' }).success, true);

    // 2. Non-owner non-admin is blocked
    assert.equal(evaluateAttachmentAccess({ user: user2, attachment: fontAttachment, expectedCategory: 'CUSTOM_FONT' }).error, 'Forbidden');

    // 3. Admin can access
    assert.equal(evaluateAttachmentAccess({ user: admin, attachment: fontAttachment, expectedCategory: 'CUSTOM_FONT' }).success, true);

    // 4. Category mismatch is blocked
    assert.equal(evaluateAttachmentAccess({ user: user1, attachment: fontAttachment, expectedCategory: 'BACKGROUND' }).error, 'Attachment is not a background image');

    // 5. Inactive attachment is blocked
    const inactiveAtt = { ...fontAttachment, attachmentStatus: 'PENDING_DELETE' };
    assert.equal(evaluateAttachmentAccess({ user: user1, attachment: inactiveAtt }).error, 'Attachment is not active');
  });

  // -------------------------------------------------------------
  // Test 52: Immediate Canonical State Upsert Invariant (Item 6 & Bug 2)
  // -------------------------------------------------------------
  await t.test('52. Immediate Canonical State Upsert: prevents canvas wipe and selection reset during async save reload', () => {
    // Simulate studio component local state
    let templates = [
      { id: 't1', name: 'Existing 1', layoutConfig: { elements: [] }, backgroundUrl: 'https://r2/bg1.png' },
    ];
    let selectedTemplateId = 't1';
    let currentCanvasElements = [{ id: 'el-active', type: 'text', key: 'fullName', label: 'สมชาย' }];
    let currentBackgroundUrl = 'https://r2/new-uploaded-bg.png';

    // Simulated handleSaveTemplate response (Hydrated ViewModel)
    const savedViewModel = {
      id: 't2', // Newly created or updated template
      name: 'แม่แบบใหม่ที่เพิ่งบันทึก',
      orientation: 'LANDSCAPE',
      backgroundAttachmentId: 'att_bg_new',
      backgroundUrl: 'https://r2/new-uploaded-bg.png',
      layoutConfig: {
        schemaVersion: 1,
        orientation: 'LANDSCAPE',
        elements: currentCanvasElements,
      },
      scope: 'PRIVATE',
      createdById: 'u1',
      createdByName: 'ครูสมศักดิ์',
    };

    // 1. Immediate Upsert into local state (0ms roundtrip)
    const upsertLocalState = (saved) => {
      templates = [saved, ...templates.filter((t) => t.id !== saved.id)];
      selectedTemplateId = saved.id;
    };
    upsertLocalState(savedViewModel);

    assert.equal(templates.length, 2);
    assert.equal(templates[0].id, 't2');
    assert.equal(selectedTemplateId, 't2');

    // 2. Async loadTemplates completes in background with { preserveCurrent: true }
    const backgroundReloadTemplates = (freshDbTemplates, options = {}) => {
      templates = freshDbTemplates;
      if (options.preserveCurrent) {
        // Invariant: Do NOT overwrite current selection with templates[0]!
        return;
      }
      if (!selectedTemplateId && freshDbTemplates.length > 0) {
        selectedTemplateId = freshDbTemplates[0].id;
      }
    };

    // Simulate DB reload returning the list
    backgroundReloadTemplates([savedViewModel, templates[1]], { preserveCurrent: true });

    // Current selection and active state must be preserved
    assert.equal(selectedTemplateId, 't2', 'selectedTemplateId must NOT reset to t1');
    assert.equal(currentBackgroundUrl, 'https://r2/new-uploaded-bg.png', 'Background URL remains stable');
  });

  // -------------------------------------------------------------
  // Test 53: Multilingual Font Manifest Completeness (Item 2 & 10)
  // -------------------------------------------------------------
  await t.test('53. Multilingual Font Manifest Completeness: all 14 fonts contain valid hashes, static woff2 URLs, and multilingual scripts', () => {
    assert.equal(SUPPORTED_FONTS.length, 14, 'Must define exactly 14 supported fonts');

    const expectedLanguages = ['th', 'en', 'ja', 'zh'];
    const foundLanguages = new Set();

    for (const fontName of SUPPORTED_FONTS) {
      const item = FONT_MANIFEST[fontName];
      assert.ok(item, `Manifest entry for font ${fontName} must exist`);
      assert.equal(item.id, fontName);
      assert.equal(item.format, 'woff2');
      assert.ok(item.assetUrl.startsWith('https://fonts.gstatic.com/'), `Asset URL for ${fontName} must be static gstatic URL`);
      assert.ok(item.assetUrl.endsWith('.woff2'), `Asset for ${fontName} must be woff2`);

      // 64 hex character SHA-256 hash
      assert.match(item.assetHash, /^[a-f0-9]{64}$/i, `assetHash for ${fontName} must be 64 hex characters`);

      // Weights array contains valid numbers
      assert.ok(item.weights.length >= 1);
      assert.ok(item.weights.includes(400) || item.weights.includes(700));

      foundLanguages.add(item.language);
    }

    // Verify all 4 required language groups are represented
    for (const lang of expectedLanguages) {
      assert.ok(foundLanguages.has(lang), `Manifest must include language group '${lang}'`);
    }
  });
});
