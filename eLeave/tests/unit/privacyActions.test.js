import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';

const { fetchCurrentPolicies, recordRegistrationPolicyAcknowledgments } = await import('../../../src/app/actions/privacy_actions.ts');

describe('privacy_actions', () => {
  it('fetchCurrentPolicies should return notice and terms', async () => {
    const policies = await fetchCurrentPolicies();
    assert.ok(policies);
    assert.ok(policies.notice);
    assert.ok(policies.terms);
    assert.equal(policies.notice.type, 'PRIVACY_NOTICE');
    assert.equal(policies.terms.type, 'TERMS_OF_USE');
  });

  it('recordRegistrationPolicyAcknowledgments should resolve user and acknowledge both policies', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'test_reg_ack@kpschool.ac.th' },
      update: {},
      create: {
        email: 'test_reg_ack@kpschool.ac.th',
        name: 'Test Acknowledger',
        role: 'TEACHER',
      },
    });

    const result = await recordRegistrationPolicyAcknowledgments({ email: testUser.email });
    assert.strictEqual(result.success, true);

    const acks = await prisma.policyAcknowledgment.findMany({
      where: { userId: testUser.id },
    });
    assert.ok(acks.length >= 2, 'Should have at least 2 policy acknowledgments');
  });

  after(async () => {
    try {
      if (pool) await pool.end();
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
});
