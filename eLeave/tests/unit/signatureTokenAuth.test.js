import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  createScopedSignatureTokenSync, 
  verifySignatureTokenFormat, 
  verifyAndConsumeSignatureTokenSync 
} from '../../../src/lib/signature-token.js';

test('SignatureTokenEngine - creates and cryptographically verifies scoped HMAC token format', () => {
  const mockDb = [];
  const { token, payload } = createScopedSignatureTokenSync({
    userId: 'user-director-1',
    docId: 'FR-2026-0001',
    purpose: 'PRINT_FACILITY_A4',
    ttlSeconds: 300
  }, mockDb);

  assert.ok(token);
  assert.equal(typeof token, 'string');
  assert.equal(token.split('.').length, 2);

  const verified = verifySignatureTokenFormat(token);
  assert.ok(verified);
  assert.equal(verified.userId, 'user-director-1');
  assert.equal(verified.docId, 'FR-2026-0001');
  assert.equal(verified.purpose, 'PRINT_FACILITY_A4');
  assert.equal(mockDb.length, 1);
  assert.equal(mockDb[0].consumedAt, null);
});

test('SignatureTokenEngine - tampered token fails signature verification', () => {
  const mockDb = [];
  const { token } = createScopedSignatureTokenSync({
    userId: 'user-director-1',
    docId: 'FR-2026-0001'
  }, mockDb);

  const [payloadB64, sig] = token.split('.');
  // Tamper payload
  const tamperedPayloadB64 = Buffer.from(JSON.stringify({ userId: 'hacker', docId: 'FR-2026-0001' })).toString('base64url');
  const tamperedToken = `${tamperedPayloadB64}.${sig}`;

  const verified = verifySignatureTokenFormat(tamperedToken);
  assert.equal(verified, null);
});

test('SignatureTokenEngine - atomic single-use consumption prevents replay attacks', () => {
  const mockDb = [];
  const { token } = createScopedSignatureTokenSync({
    userId: 'user-director-1',
    docId: 'FR-2026-0001',
    purpose: 'PRINT_FACILITY_A4',
    ttlSeconds: 300
  }, mockDb);

  // First consumption: Must succeed
  const firstConsume = verifyAndConsumeSignatureTokenSync(
    token,
    'FR-2026-0001',
    'user-director-1',
    'PRINT_FACILITY_A4',
    mockDb
  );
  assert.equal(firstConsume, true);
  assert.ok(mockDb[0].consumedAt instanceof Date);

  // Second consumption with SAME token (Replay Attack): Must return FALSE (401 Unauthorized)
  const secondConsume = verifyAndConsumeSignatureTokenSync(
    token,
    'FR-2026-0001',
    'user-director-1',
    'PRINT_FACILITY_A4',
    mockDb
  );
  assert.equal(secondConsume, false);
});

test('SignatureTokenEngine - rejects expired tokens and mismatched document/user scope', () => {
  const mockDb = [];
  // Expired token (ttl -10s)
  const { token: expiredToken } = createScopedSignatureTokenSync({
    userId: 'user-director-1',
    docId: 'FR-2026-0001',
    ttlSeconds: -10
  }, mockDb);

  const expiredConsume = verifyAndConsumeSignatureTokenSync(
    expiredToken,
    'FR-2026-0001',
    'user-director-1',
    'PRINT_FACILITY_A4',
    mockDb
  );
  assert.equal(expiredConsume, false);

  // Mismatched Doc ID
  const { token: validToken } = createScopedSignatureTokenSync({
    userId: 'user-director-1',
    docId: 'FR-2026-0001',
    ttlSeconds: 300
  }, mockDb);

  const mismatchedDocConsume = verifyAndConsumeSignatureTokenSync(
    validToken,
    'DIFFERENT-DOC-999',
    'user-director-1',
    'PRINT_FACILITY_A4',
    mockDb
  );
  assert.equal(mismatchedDocConsume, false);
});
