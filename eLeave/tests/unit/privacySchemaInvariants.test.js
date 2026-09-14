import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../src/lib/db.ts';

describe('Privacy Governance Schema Invariants', () => {
  test('Prisma Client exports all 7 privacy models with expected delegate methods', async () => {
    assert.ok(typeof prisma.policyDocument?.findFirst === 'function', 'prisma.policyDocument must have findFirst');
    assert.ok(typeof prisma.policyAcknowledgment?.findMany === 'function', 'prisma.policyAcknowledgment must have findMany');
    assert.ok(typeof prisma.processingActivity?.findUnique === 'function', 'prisma.processingActivity must have findUnique');
    assert.ok(typeof prisma.processingPurpose?.findUnique === 'function', 'prisma.processingPurpose must have findUnique');
    assert.ok(typeof prisma.processingDataCategoryPolicy?.findFirst === 'function', 'prisma.processingDataCategoryPolicy must have findFirst');
    assert.ok(typeof prisma.consentRecord?.upsert === 'function', 'prisma.consentRecord must have upsert');
    assert.ok(typeof prisma.consentAuditLog?.create === 'function', 'prisma.consentAuditLog must have create');
  });
});
