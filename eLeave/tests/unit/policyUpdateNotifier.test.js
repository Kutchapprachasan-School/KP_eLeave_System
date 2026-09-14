import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';
import { publishPolicyDocument } from '../../../src/lib/privacy/policy-service.ts';

const {
  fetchCurrentPolicies,
  checkUserPolicyAcknowledgmentStatus,
  acknowledgePolicyForCurrentUser,
} = await import('../../../src/app/actions/privacy_actions.ts');

const { computeLineDiff } = await import('../../../src/lib/privacy/diff-utils.ts');

describe('PolicyUpdateNotifier Server Actions', () => {
  let testUser;

  before(async () => {
    // Ensure default policies exist
    await fetchCurrentPolicies();

    // Create a test user
    const testEmail = `test_policy_banner_${Date.now()}@kpschool.ac.th`;
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Policy Banner Test User',
        role: 'TEACHER',
      },
    });
  });

  after(async () => {
    if (testUser) {
      await prisma.policyAcknowledgment.deleteMany({
        where: { userId: testUser.id },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
    // Clean up test documents and restore official 1.0 policies
    await prisma.policyDocument.deleteMany({
      where: { version: { contains: '_' } }
    });
    await fetchCurrentPolicies();
    await prisma.$disconnect();
    await pool.end();
  });

  it('checkUserPolicyAcknowledgmentStatus should return noticeNeedsAck: true and termsNeedsAck: true for new user without acknowledgments', async () => {
    assert.equal(typeof checkUserPolicyAcknowledgmentStatus, 'function', 'checkUserPolicyAcknowledgmentStatus must be exported');
    const status = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.ok(status);
    assert.strictEqual(status.noticeNeedsAck, true);
    assert.strictEqual(status.termsNeedsAck, true);
    assert.ok(status.currentNotice);
    assert.ok(status.currentTerms);
    assert.equal(status.currentNotice.type, 'PRIVACY_NOTICE');
    assert.equal(status.currentTerms.type, 'TERMS_OF_USE');
    // New user with no prior acknowledgments should have undefined previous markdown
    assert.strictEqual(status.previousNoticeMarkdown, undefined);
    assert.strictEqual(status.previousTermsMarkdown, undefined);
  });

  it('acknowledgePolicyForCurrentUser should record acknowledgment with source IN_APP_BANNER', async () => {
    assert.equal(typeof acknowledgePolicyForCurrentUser, 'function', 'acknowledgePolicyForCurrentUser must be exported');
    const { currentNotice } = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.ok(currentNotice);

    const result = await acknowledgePolicyForCurrentUser(currentNotice.id, testUser.id);
    assert.strictEqual(result.success, true);

    const ack = await prisma.policyAcknowledgment.findUnique({
      where: {
        userId_policyDocumentId: {
          userId: testUser.id,
          policyDocumentId: currentNotice.id,
        },
      },
    });
    assert.ok(ack, 'Acknowledgment record must exist');
    assert.strictEqual(ack.source, 'IN_APP_BANNER', 'Source must be IN_APP_BANNER');

    // Re-check status: notice should no longer need acknowledgment, but terms should still need it
    const status = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.strictEqual(status.noticeNeedsAck, false);
    assert.strictEqual(status.termsNeedsAck, true);
  });

  it('acknowledging remaining terms policy should result in both noticeNeedsAck: false and termsNeedsAck: false', async () => {
    const status = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.ok(status.currentTerms);

    const result = await acknowledgePolicyForCurrentUser(status.currentTerms.id, testUser.id);
    assert.strictEqual(result.success, true);

    const updatedStatus = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.strictEqual(updatedStatus.noticeNeedsAck, false);
    assert.strictEqual(updatedStatus.termsNeedsAck, false);
  });

  it('publishing a new policy version triggers re-acknowledgment and returns previousNoticeMarkdown for existing user', async () => {
    // User had already acknowledged version 1.0. Now publish version 1.1 of PRIVACY_NOTICE.
    const newNotice = await publishPolicyDocument({
      type: 'PRIVACY_NOTICE',
      version: `1.1_${Date.now()}`,
      title: 'ประกาศการคุ้มครองข้อมูลส่วนบุคคล (ฉบับปรับปรุงใหม่)',
      contentMarkdown: '# Updated Privacy Notice\n\nWe updated our terms.',
      effectiveAt: new Date(),
    });

    const status = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.strictEqual(status.noticeNeedsAck, true, 'User must need to re-acknowledge when a new version is published');
    assert.strictEqual(status.termsNeedsAck, false, 'Terms should still not need acknowledgment');
    assert.equal(status.currentNotice.id, newNotice.id);
    assert.equal(status.currentNotice.version, newNotice.version);
    assert.ok(status.previousNoticeMarkdown, 'Must provide previousNoticeMarkdown when older version acknowledged');
    assert.strictEqual(typeof status.previousNoticeMarkdown, 'string');
  });

  it('checkUserPolicyAcknowledgmentStatus returns previousTermsMarkdown when user acknowledged an older terms version', async () => {
    const newTerms = await publishPolicyDocument({
      type: 'TERMS_OF_USE',
      version: `2.0_${Date.now()}`,
      title: 'เงื่อนไขการใช้งานระบบสารสนเทศ (ฉบับปรับปรุงใหม่)',
      contentMarkdown: '# Updated Terms of Use\n\nNew terms rule.',
      effectiveAt: new Date(),
    });

    const status = await checkUserPolicyAcknowledgmentStatus(testUser.id);
    assert.strictEqual(status.termsNeedsAck, true, 'User must need to re-acknowledge new terms');
    assert.equal(status.currentTerms.id, newTerms.id);
    assert.ok(status.previousTermsMarkdown, 'Must provide previousTermsMarkdown when older version acknowledged');
    assert.strictEqual(typeof status.previousTermsMarkdown, 'string');
  });

  it('computeLineDiff accurately identifies added, removed, and unchanged lines for diff display', () => {
    const oldText = 'บรรทัด 1\nบรรทัด 2 เก่า\nบรรทัด 3';
    const newText = 'บรรทัด 1\nบรรทัด 2 ใหม่\nบรรทัด 3\nบรรทัด 4 เพิ่ม';

    const diff = computeLineDiff(oldText, newText);
    assert.ok(Array.isArray(diff));
    assert.deepEqual(diff[0], { type: 'unchanged', text: 'บรรทัด 1' });
    assert.deepEqual(diff[1], { type: 'removed', text: 'บรรทัด 2 เก่า' });
    assert.deepEqual(diff[2], { type: 'added', text: 'บรรทัด 2 ใหม่' });
    assert.deepEqual(diff[3], { type: 'unchanged', text: 'บรรทัด 3' });
    assert.deepEqual(diff[4], { type: 'added', text: 'บรรทัด 4 เพิ่ม' });
  });
});
