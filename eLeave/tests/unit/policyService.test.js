import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCanonicalHash,
  publishPolicyDocument,
  getCurrentPolicy,
  acknowledgePolicy,
  hasUserAcknowledgedCurrentPolicy,
} from '../../../src/lib/privacy/policy-service.ts';

describe('Policy Service', () => {
  test('computeCanonicalHash produces normalized SHA-256 independent of line endings and whitespace', () => {
    const textCRLF = "# Privacy Notice \r\n\r\n Content with trailing spaces   \r\n";
    const textLF = "# Privacy Notice\n\n Content with trailing spaces\n";
    const hash1 = computeCanonicalHash(textCRLF);
    const hash2 = computeCanonicalHash(textLF);
    assert.equal(hash1, hash2, 'Normalized content must produce identical hash');
    assert.equal(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
  });

  test('computeCanonicalHash produces distinct hashes for distinct contents', () => {
    const hashA = computeCanonicalHash('# Policy A\nContent');
    const hashB = computeCanonicalHash('# Policy B\nContent');
    assert.notEqual(hashA, hashB, 'Different markdown contents must produce different hashes');
  });

  test('exports all policy management functions defined in task interfaces', () => {
    assert.equal(typeof computeCanonicalHash, 'function');
    assert.equal(typeof publishPolicyDocument, 'function');
    assert.equal(typeof getCurrentPolicy, 'function');
    assert.equal(typeof acknowledgePolicy, 'function');
    assert.equal(typeof hasUserAcknowledgedCurrentPolicy, 'function');
  });
});
