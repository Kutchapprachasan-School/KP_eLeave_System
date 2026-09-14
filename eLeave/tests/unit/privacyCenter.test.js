import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';
import { seedPrivacyGovernance } from '../../../prisma/seed-privacy.ts';

// Dynamic import to test functions that are about to be implemented
const {
  getUserPrivacyProfile,
  withdrawUserConsentAction,
  grantUserConsentAction,
  getPublicPrivacyData,
} = await import('../../../src/app/actions/privacy_actions.ts');

describe('Privacy Self-Service Center & Public Actions', () => {
  let testUser;
  let consentPurpose;
  let mandatoryPurpose;

  before(async () => {
    // Ensure ROPA activities and purposes are seeded
    await seedPrivacyGovernance();

    // Create a dedicated test user
    testUser = await prisma.user.create({
      data: {
        email: `privacy_test_${Date.now()}@kpschool.ac.th`,
        name: 'Privacy Center Tester',
        role: 'TEACHER',
      },
    });

    consentPurpose = await prisma.processingPurpose.findFirstOrThrow({
      where: { code: 'PURPOSE_LINE_NOTIFICATION' },
      include: { dataCategoryPolicies: true },
    });

    mandatoryPurpose = await prisma.processingPurpose.findFirstOrThrow({
      where: { code: 'PURPOSE_LEAVE_APPLICATION' },
      include: { dataCategoryPolicies: true },
    });
  });

  after(async () => {
    if (testUser) {
      await prisma.consentRecord.deleteMany({ where: { userId: testUser.id } });
      await prisma.policyAcknowledgment.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    await pool.end();
  });

  it('getUserPrivacyProfile should return categorized purposes, current policies, and acknowledgments', async () => {
    assert.strictEqual(typeof getUserPrivacyProfile, 'function', 'getUserPrivacyProfile must be a function');

    const profile = await getUserPrivacyProfile(testUser.id);
    assert.ok(profile);
    assert.strictEqual(profile.userId, testUser.id);
    assert.ok(Array.isArray(profile.acknowledgments));
    assert.ok(profile.currentPolicies);
    assert.ok(profile.currentPolicies.notice);
    assert.ok(profile.currentPolicies.terms);

    // Consent purposes must only contain purposes requiring consent
    assert.ok(Array.isArray(profile.consentPurposes));
    const foundConsent = profile.consentPurposes.find((p) => p.code === 'PURPOSE_LINE_NOTIFICATION');
    assert.ok(foundConsent, 'PURPOSE_LINE_NOTIFICATION should be in consentPurposes');
    assert.strictEqual(foundConsent.consent, null, 'Initial consent should be null');

    // Mandatory purposes must contain statutory/public task purposes
    assert.ok(Array.isArray(profile.mandatoryPurposes));
    const foundMandatory = profile.mandatoryPurposes.find((p) => p.code === 'PURPOSE_LEAVE_APPLICATION');
    assert.ok(foundMandatory, 'PURPOSE_LEAVE_APPLICATION should be in mandatoryPurposes');
  });

  it('grantUserConsentAction should grant consent for optional consent-based purpose', async () => {
    assert.strictEqual(typeof grantUserConsentAction, 'function', 'grantUserConsentAction must be a function');

    const res = await grantUserConsentAction({
      purposeId: consentPurpose.id,
      userId: testUser.id,
    });
    assert.strictEqual(res.success, true);

    const record = await prisma.consentRecord.findUnique({
      where: {
        userId_purposeId: {
          userId: testUser.id,
          purposeId: consentPurpose.id,
        },
      },
    });
    assert.ok(record);
    assert.strictEqual(record.status, 'GIVEN');
    assert.ok(record.consentedAt);

    // Verify updated profile reflects the given consent
    const updatedProfile = await getUserPrivacyProfile(testUser.id);
    const purposeInProfile = updatedProfile.consentPurposes.find((p) => p.id === consentPurpose.id);
    assert.ok(purposeInProfile);
    assert.ok(purposeInProfile.consent);
    assert.strictEqual(purposeInProfile.consent.status, 'GIVEN');
  });

  it('grantUserConsentAction should fail if purpose is mandatory non-consent purpose', async () => {
    const res = await grantUserConsentAction({
      purposeId: mandatoryPurpose.id,
      userId: testUser.id,
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error || '', /Consent is not an applicable legal basis/);
  });

  it('withdrawUserConsentAction should withdraw an active consent with reason code and detail', async () => {
    assert.strictEqual(typeof withdrawUserConsentAction, 'function', 'withdrawUserConsentAction must be a function');

    const res = await withdrawUserConsentAction({
      purposeId: consentPurpose.id,
      reasonCode: 'USER_CHOICE',
      reasonDetail: 'Testing consent withdrawal from privacy center',
      userId: testUser.id,
    });
    assert.strictEqual(res.success, true);

    const record = await prisma.consentRecord.findUnique({
      where: {
        userId_purposeId: {
          userId: testUser.id,
          purposeId: consentPurpose.id,
        },
      },
    });
    assert.ok(record);
    assert.strictEqual(record.status, 'WITHDRAWN');
    assert.ok(record.withdrawnAt);

    // Verify audit log
    const audit = await prisma.consentAuditLog.findFirst({
      where: {
        userId: testUser.id,
        purposeId: consentPurpose.id,
        eventType: 'CONSENT_WITHDRAWN',
      },
    });
    assert.ok(audit);
    assert.strictEqual(audit.withdrawalReason, 'USER_CHOICE');
    assert.strictEqual(audit.reasonDetail, 'Testing consent withdrawal from privacy center');
    assert.strictEqual(audit.source, 'PRIVACY_CENTER');
  });

  it('withdrawUserConsentAction should fail if consent is already withdrawn', async () => {
    const res = await withdrawUserConsentAction({
      purposeId: consentPurpose.id,
      reasonCode: 'USER_CHOICE',
      userId: testUser.id,
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error || '', /conflict|not in GIVEN state|already withdrawn/i);
  });

  it('getPublicPrivacyData should return notice, ropaSummary, and settings', async () => {
    assert.strictEqual(typeof getPublicPrivacyData, 'function', 'getPublicPrivacyData must be a function');

    const publicData = await getPublicPrivacyData();
    assert.ok(publicData);
    assert.ok(publicData.notice);
    assert.ok(publicData.notice.contentMarkdown);
    assert.ok(Array.isArray(publicData.ropaSummary));
    assert.ok(publicData.ropaSummary.length > 0);
    assert.ok(publicData.settings);
  });
});
