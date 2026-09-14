import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';

const { fetchCurrentPolicies, recordRegistrationPolicyAcknowledgments } = await import('../../../src/app/actions/privacy_actions.ts');

describe('privacy_actions', () => {
  after(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it('fetchCurrentPolicies should return notice and terms', async () => {
    const policies = await fetchCurrentPolicies();
    assert.ok(policies);
    assert.ok(policies.notice);
    assert.ok(policies.terms);
    assert.equal(policies.notice.type, 'PRIVACY_NOTICE');
    assert.equal(policies.terms.type, 'TERMS_OF_USE');
  });

  it('recordRegistrationPolicyAcknowledgments should resolve user and acknowledge both policies for recently created user', async () => {
    const testEmail = `test_reg_ack_${Date.now()}@kpschool.ac.th`;
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test Acknowledger',
        role: 'TEACHER',
        createdAt: new Date(),
      },
    });

    const result = await recordRegistrationPolicyAcknowledgments({ email: testUser.email });
    assert.strictEqual(result.success, true);

    const acks = await prisma.policyAcknowledgment.findMany({
      where: { userId: testUser.id },
    });
    assert.ok(acks.length >= 2, 'Should have at least 2 policy acknowledgments');
  });

  it('recordRegistrationPolicyAcknowledgments should reject unauthenticated acknowledgment for old account', async () => {
    const oldEmail = `test_old_user_${Date.now()}@kpschool.ac.th`;
    const oldUser = await prisma.user.create({
      data: {
        email: oldEmail,
        name: 'Old User',
        role: 'TEACHER',
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (> 5m threshold)
      },
    });

    const result = await recordRegistrationPolicyAcknowledgments({ email: oldUser.email });
    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /User not found|expired/);
  });
});
