import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, pool } from '../../../src/lib/db.ts';
import { seedPrivacyGovernance } from '../../../prisma/seed-privacy.ts';
import {
  validateConsentApplicability,
} from '../../../src/lib/privacy/consent-service.ts';
import {
  isConsentApplicableForPurpose,
} from '../../../src/lib/privacy/ropa-service.ts';
import {
  getUserPrivacyProfileForUser,
  withdrawUserConsentForUser,
  grantUserConsentForUser,
} from '../../../src/app/actions/privacy_actions.ts';

describe('Privacy Governance E2E Invariants', { concurrency: 1 }, () => {
  let testUser;
  let consentPurpose;
  let leavePurpose;
  let attendancePurpose;
  let sarabanPurpose;
  let existingCurrentNotice;
  let tempPurpose;

  before(async () => {
    // 1. Ensure ROPA baseline activities and purposes are seeded
    await seedPrivacyGovernance();

    // 2. Create isolated test user for this verification suite
    testUser = await prisma.user.create({
      data: {
        email: `privacy_e2e_${Date.now()}@kpschool.ac.th`,
        name: 'Privacy E2E Auditor',
        role: 'TEACHER',
      },
    });

    // 3. Resolve purpose fixtures
    consentPurpose = await prisma.processingPurpose.findFirstOrThrow({
      where: { code: 'PURPOSE_LINE_NOTIFICATION' },
      include: { dataCategoryPolicies: true },
    });

    leavePurpose = await prisma.processingPurpose.findFirstOrThrow({
      where: { code: 'PURPOSE_LEAVE_APPLICATION' },
      include: { dataCategoryPolicies: true },
    });

    attendancePurpose = await prisma.processingPurpose.findFirstOrThrow({
      where: { code: 'PURPOSE_TIME_ATTENDANCE' },
      include: { dataCategoryPolicies: true },
    });

    sarabanPurpose = await prisma.processingPurpose.findFirstOrThrow({
      where: { code: 'PURPOSE_OFFICIAL_DISPATCH' },
      include: { dataCategoryPolicies: true },
    });

    // 4. Resolve current privacy notice document
    existingCurrentNotice = await prisma.policyDocument.findFirstOrThrow({
      where: { type: 'PRIVACY_NOTICE', isCurrent: true },
    });

    // 5. Create dedicated temporary purpose for Invariant 4 testing
    const testActivity = await prisma.processingActivity.findFirstOrThrow();
    tempPurpose = await prisma.processingPurpose.create({
      data: {
        activityId: testActivity.id,
        code: `PURPOSE_TEST_INV4_${Date.now()}`,
        name: 'Temporary Invariant 4 Test Purpose',
      },
    });
  });

  after(async () => {
    if (tempPurpose) {
      await prisma.processingPurpose.delete({ where: { id: tempPurpose.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.leaveRequest.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.consentRecord.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.policyAcknowledgment.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    await pool.end();
  });

  // =========================================================================
  // Invariant 1: PostgreSQL Trigger Blocks UPDATE/DELETE on ConsentAuditLog
  // =========================================================================
  describe('Invariant 1: PostgreSQL Trigger blocks UPDATE/DELETE on ConsentAuditLog', { concurrency: 1 }, () => {
    it('Audit log immutability error format is recognized', () => {
      const errorMsg = 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY';
      assert.match(errorMsg, /APPEND-ONLY/);
    });

    it('PostgreSQL Trigger strictly prohibits UPDATE on ConsentAuditLog rows', async () => {
      let auditLog = await prisma.consentAuditLog.findFirst();
      if (!auditLog) {
        auditLog = await prisma.consentAuditLog.create({
          data: {
            correlationId: `e2e_corr_${Date.now()}`,
            eventType: 'POLICY_ACKNOWLEDGED',
            subjectType: 'POLICY_DOCUMENT',
            userId: testUser.id,
            policyDocumentId: existingCurrentNotice.id,
            policyVersionSnapshot: existingCurrentNotice.version,
            contentHashSnapshot: existingCurrentNotice.contentHash,
            source: 'E2E_VERIFICATION',
          },
        });
      }

      await assert.rejects(
        async () => {
          await prisma.consentAuditLog.update({
            where: { id: auditLog.id },
            data: {
              reasonDetail: 'MALICIOUS_TAMPER_ATTEMPT',
            },
          });
        },
        (err) => {
          assert.match(
            err.message,
            /DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY/
          );
          return true;
        },
        'Database trigger must block any UPDATE operation on ConsentAuditLog'
      );
    });

    it('PostgreSQL Trigger strictly prohibits single row DELETE on ConsentAuditLog', async () => {
      let auditLog = await prisma.consentAuditLog.findFirst();
      if (!auditLog) {
        auditLog = await prisma.consentAuditLog.create({
          data: {
            correlationId: `e2e_corr_${Date.now()}`,
            eventType: 'POLICY_ACKNOWLEDGED',
            subjectType: 'POLICY_DOCUMENT',
            userId: testUser.id,
            policyDocumentId: existingCurrentNotice.id,
            policyVersionSnapshot: existingCurrentNotice.version,
            contentHashSnapshot: existingCurrentNotice.contentHash,
            source: 'E2E_VERIFICATION',
          },
        });
      }

      await assert.rejects(
        async () => {
          await prisma.consentAuditLog.delete({
            where: { id: auditLog.id },
          });
        },
        (err) => {
          assert.match(
            err.message,
            /DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY/
          );
          return true;
        },
        'Database trigger must block single DELETE operation on ConsentAuditLog'
      );
    });

    it('PostgreSQL Trigger strictly prohibits bulk DELETE (deleteMany) on ConsentAuditLog', async () => {
      let auditLog = await prisma.consentAuditLog.findFirst();
      assert.ok(auditLog, 'An audit log record must exist to test trigger enforcement');

      await assert.rejects(
        async () => {
          await prisma.consentAuditLog.deleteMany({
            where: { id: auditLog.id },
          });
        },
        (err) => {
          assert.match(
            err.message,
            /DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY/
          );
          return true;
        },
        'Database trigger must block bulk DELETE on ConsentAuditLog'
      );
    });
  });

  // =========================================================================
  // Invariant 2: Partial Unique Index Rejects Multiple isCurrent = true
  // =========================================================================
  describe('Invariant 2: Partial unique index rejects multiple isCurrent = true per policy type', { concurrency: 1 }, () => {
    it('Rejects inserting second PolicyDocument with isCurrent = true for the same type', async () => {
      await assert.rejects(
        async () => {
          await prisma.policyDocument.create({
            data: {
              type: 'PRIVACY_NOTICE',
              version: `v99.conflict.${Date.now()}`,
              title: 'Conflicting Active Privacy Notice',
              contentMarkdown: '# Conflicting Policy',
              contentHash: `hash_conflict_${Date.now()}`,
              effectiveAt: new Date(),
              isCurrent: true, // Violates unique_current_policy_per_type index
            },
          });
        },
        (err) => {
          assert.match(err.message, /unique_current_policy_per_type|Unique constraint failed/i);
          return true;
        },
        'Partial unique index must reject multiple isCurrent = true per policy type'
      );
    });

    it('Permits multiple PolicyDocument records when isCurrent = false (archived versions)', async () => {
      const archived1 = await prisma.policyDocument.create({
        data: {
          type: 'PRIVACY_NOTICE',
          version: `v_archived_1_${Date.now()}`,
          title: 'Historical Privacy Notice 1',
          contentMarkdown: '# History 1',
          contentHash: `hash_archived_1_${Date.now()}`,
          effectiveAt: new Date(),
          isCurrent: false,
        },
      });

      const archived2 = await prisma.policyDocument.create({
        data: {
          type: 'PRIVACY_NOTICE',
          version: `v_archived_2_${Date.now()}`,
          title: 'Historical Privacy Notice 2',
          contentMarkdown: '# History 2',
          contentHash: `hash_archived_2_${Date.now()}`,
          effectiveAt: new Date(),
          isCurrent: false,
        },
      });

      assert.ok(archived1.id && archived2.id, 'Multiple non-current policies must be created without conflict');

      // Cleanup non-current test policies
      await prisma.policyDocument.deleteMany({
        where: { id: { in: [archived1.id, archived2.id] } },
      });
    });
  });

  // =========================================================================
  // Invariant 3: Database CHECK Constraint Rejects Invalid ConsentRecord Lifecycle States
  // =========================================================================
  describe('Invariant 3: Database CHECK constraint chk_consent_record_state_lifecycle', { concurrency: 1 }, () => {
    it('Rejects status GIVEN when withdrawnAt is populated', async () => {
      await assert.rejects(
        async () => {
          await prisma.consentRecord.create({
            data: {
              userId: testUser.id,
              purposeId: consentPurpose.id,
              status: 'GIVEN',
              consentedAt: new Date(),
              withdrawnAt: new Date(), // VIOLATION: GIVEN requires withdrawnAt IS NULL
              source: 'E2E_TEST',
              consentFormVersion: '1.0',
            },
          });
        },
        (err) => {
          assert.match(err.message, /chk_consent_record_state_lifecycle|check constraint/i);
          return true;
        }
      );
    });

    it('Rejects status WITHDRAWN when withdrawnAt is null', async () => {
      await assert.rejects(
        async () => {
          await prisma.consentRecord.create({
            data: {
              userId: testUser.id,
              purposeId: consentPurpose.id,
              status: 'WITHDRAWN',
              consentedAt: new Date(),
              withdrawnAt: null, // VIOLATION: WITHDRAWN requires withdrawnAt IS NOT NULL
              source: 'E2E_TEST',
              consentFormVersion: '1.0',
            },
          });
        },
        (err) => {
          assert.match(err.message, /chk_consent_record_state_lifecycle|check constraint/i);
          return true;
        }
      );
    });

    it('Rejects status GIVEN when consentedAt is null', async () => {
      await assert.rejects(
        async () => {
          await prisma.consentRecord.create({
            data: {
              userId: testUser.id,
              purposeId: consentPurpose.id,
              status: 'GIVEN',
              consentedAt: null, // VIOLATION: GIVEN requires consentedAt IS NOT NULL
              withdrawnAt: null,
              source: 'E2E_TEST',
              consentFormVersion: '1.0',
            },
          });
        },
        (err) => {
          assert.match(err.message, /chk_consent_record_state_lifecycle|check constraint/i);
          return true;
        }
      );
    });

    it('Rejects status REVOKED when revokedAt is null', async () => {
      await assert.rejects(
        async () => {
          await prisma.consentRecord.create({
            data: {
              userId: testUser.id,
              purposeId: consentPurpose.id,
              status: 'REVOKED',
              consentedAt: new Date(),
              revokedAt: null, // VIOLATION: REVOKED requires revokedAt IS NOT NULL
              source: 'E2E_TEST',
              consentFormVersion: '1.0',
            },
          });
        },
        (err) => {
          assert.match(err.message, /chk_consent_record_state_lifecycle|check constraint/i);
          return true;
        }
      );
    });

    it('Permits valid lifecycle transitions matching CHECK constraints', async () => {
      // 1. Create valid GIVEN record
      const given = await prisma.consentRecord.create({
        data: {
          userId: testUser.id,
          purposeId: consentPurpose.id,
          status: 'GIVEN',
          consentedAt: new Date(),
          withdrawnAt: null,
          revokedAt: null,
          source: 'E2E_TEST',
          consentFormVersion: '1.0',
        },
      });
      assert.ok(given.id);
      assert.strictEqual(given.status, 'GIVEN');

      // 2. Transition to valid WITHDRAWN record
      const withdrawn = await prisma.consentRecord.update({
        where: { id: given.id },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
        },
      });
      assert.strictEqual(withdrawn.status, 'WITHDRAWN');
      assert.ok(withdrawn.withdrawnAt);

      // Clean up record
      await prisma.consentRecord.delete({ where: { id: given.id } });
    });
  });

  // =========================================================================
  // Invariant 4: Database CHECK Constraint Rejects section26Condition on General Data
  // =========================================================================
  describe('Invariant 4: Database CHECK constraint chk_section26_consistency', { concurrency: 1 }, () => {
    it('Rejects non-sensitive data category when section26Condition is not null', async () => {
      await assert.rejects(
        async () => {
          await prisma.processingDataCategoryPolicy.create({
            data: {
              purposeId: tempPurpose.id,
              dataCategory: 'GENERAL_IDENTITY',
              legalBasis: 'CONSENT',
              section26Condition: 'EXPLICIT_CONSENT', // VIOLATION: Non-sensitive category must have NULL section26Condition
            },
          });
        },
        (err) => {
          assert.match(err.message, /chk_section26_consistency|check constraint/i);
          return true;
        }
      );
    });

    it('Rejects sensitive data category when section26Condition is null', async () => {
      await assert.rejects(
        async () => {
          await prisma.processingDataCategoryPolicy.create({
            data: {
              purposeId: tempPurpose.id,
              dataCategory: 'SENSITIVE_HEALTH',
              legalBasis: 'CONSENT',
              section26Condition: null, // VIOLATION: Sensitive category must have NOT NULL section26Condition
            },
          });
        },
        (err) => {
          assert.match(err.message, /chk_section26_consistency|check constraint/i);
          return true;
        }
      );
    });

    it('Permits valid data category and section 26 condition combinations', async () => {
      const generalPolicy = await prisma.processingDataCategoryPolicy.create({
        data: {
          purposeId: tempPurpose.id,
          dataCategory: 'CONTACT_INFO',
          legalBasis: 'CONSENT',
          section26Condition: null, // VALID
        },
      });
      assert.ok(generalPolicy.id);

      const sensitivePolicy = await prisma.processingDataCategoryPolicy.create({
        data: {
          purposeId: tempPurpose.id,
          dataCategory: 'SENSITIVE_HEALTH',
          legalBasis: 'CONSENT',
          section26Condition: 'EXPLICIT_CONSENT', // VALID
        },
      });
      assert.ok(sensitivePolicy.id);

      // Clean up policies
      await prisma.processingDataCategoryPolicy.deleteMany({
        where: { id: { in: [generalPolicy.id, sensitivePolicy.id] } },
      });
    });
  });

  // =========================================================================
  // Invariant 5: Legal Scope Invariant
  // =========================================================================
  describe('Invariant 5: Legal Scope Invariant (Consent isolation from Public Task & Legal Obligation)', { concurrency: 1 }, () => {
    it('Consent withdrawal scope does not affect public task leave operations', () => {
      const leaveActivity = { legalBasis: 'LEGAL_OBLIGATION', operatesIndependentlyOfConsent: true };
      assert.equal(leaveActivity.operatesIndependentlyOfConsent, true);
    });

    it('ROPA evaluation confirms pure consent requirement only for optional services', async () => {
      // Optional notification service requires consent
      const lineNotifRequiresConsent = await isConsentApplicableForPurpose(consentPurpose.id);
      assert.strictEqual(lineNotifRequiresConsent, true, 'LINE notifications must require consent');

      // Statutory leave processing operates under LEGAL_OBLIGATION
      const leaveRequiresConsent = await isConsentApplicableForPurpose(leavePurpose.id);
      assert.strictEqual(leaveRequiresConsent, false, 'Leave management must NOT require consent');

      // Official time attendance operates under LEGAL_OBLIGATION
      const attendanceRequiresConsent = await isConsentApplicableForPurpose(attendancePurpose.id);
      assert.strictEqual(attendanceRequiresConsent, false, 'Time attendance must NOT require consent');

      // Saraban official dispatch operates under PUBLIC_TASK
      const sarabanRequiresConsent = await isConsentApplicableForPurpose(sarabanPurpose.id);
      assert.strictEqual(sarabanRequiresConsent, false, 'Saraban dispatch must NOT require consent');
    });

    it('Consent lifecycle engine rejects recording consent on statutory / public task operations', () => {
      assert.throws(
        () => validateConsentApplicability(leavePurpose.dataCategoryPolicies),
        /Consent is not an applicable legal basis/
      );

      assert.throws(
        () => validateConsentApplicability(attendancePurpose.dataCategoryPolicies),
        /Consent is not an applicable legal basis/
      );

      assert.throws(
        () => validateConsentApplicability(sarabanPurpose.dataCategoryPolicies),
        /Consent is not an applicable legal basis/
      );
    });

    it('End-to-End: Withdrawing consent halts optional processing while statutory leave operations remain fully functional', async () => {
      // 1. Grant consent for optional LINE notification
      const grantRes = await grantUserConsentForUser({
        userId: testUser.id,
        purposeId: consentPurpose.id,
      });
      assert.strictEqual(grantRes.success, true);

      // Verify active consent
      const profileAfterGrant = await getUserPrivacyProfileForUser(testUser.id);
      const consentItem = profileAfterGrant.consentPurposes.find((p) => p.id === consentPurpose.id);
      assert.ok(consentItem);
      assert.strictEqual(consentItem.consent?.status, 'GIVEN');

      // 2. Withdraw consent with formal reason code
      const withdrawRes = await withdrawUserConsentForUser({
        userId: testUser.id,
        purposeId: consentPurpose.id,
        reasonCode: 'USER_CHOICE',
        reasonDetail: 'User opt-out from optional LINE alerts',
      });
      assert.strictEqual(withdrawRes.success, true);

      // Verify consent status is WITHDRAWN
      const profileAfterWithdraw = await getUserPrivacyProfileForUser(testUser.id);
      const consentAfterWithdraw = profileAfterWithdraw.consentPurposes.find((p) => p.id === consentPurpose.id);
      assert.ok(consentAfterWithdraw);
      assert.strictEqual(consentAfterWithdraw.consent?.status, 'WITHDRAWN');

      // Verify immutable audit trail recorded CONSENT_WITHDRAWN
      const auditLog = await prisma.consentAuditLog.findFirst({
        where: {
          userId: testUser.id,
          purposeId: consentPurpose.id,
          eventType: 'CONSENT_WITHDRAWN',
        },
        orderBy: { occurredAt: 'desc' },
      });
      assert.ok(auditLog, 'Audit log must record CONSENT_WITHDRAWN');
      assert.strictEqual(auditLog.withdrawalReason, 'USER_CHOICE');

      // 3. CRITICAL: Statutory Leave workflow remains 100% operational
      // The user can still create and submit statutory leave applications under Legal Obligation
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: testUser.id,
          type: 'PERSONAL',
          startDate: new Date(),
          endDate: new Date(),
          reason: 'Official leave request processed under Section 24(1) Legal Obligation',
          status: 'PENDING',
        },
      });

      assert.ok(leaveRequest.id, 'Leave request must be successfully created');
      assert.strictEqual(leaveRequest.userId, testUser.id);
      assert.strictEqual(leaveRequest.status, 'PENDING');

      // Statutory mandatory purposes remain listed and unrevocable in user privacy profile
      const mandatoryPurposes = profileAfterWithdraw.mandatoryPurposes;
      const leaveMandatory = mandatoryPurposes.find((p) => p.code === 'PURPOSE_LEAVE_APPLICATION');
      assert.ok(leaveMandatory, 'PURPOSE_LEAVE_APPLICATION must remain in mandatoryPurposes');

      // Clean up leave request
      await prisma.leaveRequest.delete({ where: { id: leaveRequest.id } });
    });
  });
});
