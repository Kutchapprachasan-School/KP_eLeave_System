import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma, pool } from '../../../src/lib/db.ts';

const {
  withdrawUserConsentAction,
  grantUserConsentAction,
  getUserPrivacyOverviewAction,
} = await import('../../../src/app/actions/privacy_actions.ts');

describe('PDPA End-to-End Invariant Audit Verification', () => {
  after(async () => {
    try {
      await pool.end();
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });

  it('Invariant 1: ConsentAuditLog append-only database trigger strictly forbids UPDATE and DELETE', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'pdpa_e2e_audit@kpschool.ac.th' },
      update: {},
      create: {
        email: 'pdpa_e2e_audit@kpschool.ac.th',
        name: 'PDPA Invariant Tester',
        role: 'TEACHER',
      },
    });

    const currentNotice = await prisma.policyDocument.findFirst({
      where: { type: 'PRIVACY_NOTICE', isCurrent: true },
    });
    assert.ok(currentNotice, 'Active PRIVACY_NOTICE document must exist in DB');

    const testCorrId = `test_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const logEntry = await prisma.consentAuditLog.create({
      data: {
        userId: testUser.id,
        eventType: 'POLICY_ACKNOWLEDGED',
        subjectType: 'POLICY_DOCUMENT',
        policyDocumentId: currentNotice.id,
        policyVersionSnapshot: currentNotice.version,
        contentHashSnapshot: currentNotice.contentHash,
        source: 'INVARIANT_TEST',
        correlationId: testCorrId,
      },
    });

    assert.ok(logEntry.id, 'Audit log must be created successfully');

    // Attempting UPDATE on ConsentAuditLog MUST be rejected by Postgres trigger
    await assert.rejects(
      async () => {
        await prisma.$executeRawUnsafe(
          'UPDATE "ConsentAuditLog" SET "source" = $1 WHERE "id" = $2',
          'MUTATED_SOURCE',
          logEntry.id
        );
      },
      (err) => {
        const msg = String(err.message || err).toLowerCase();
        return msg.includes('append-only') || msg.includes('p0001') || msg.includes('p2010');
      },
      'PostgreSQL trigger must reject UPDATE operations on ConsentAuditLog'
    );

    // Attempting DELETE on ConsentAuditLog MUST be rejected by Postgres trigger
    await assert.rejects(
      async () => {
        await prisma.$executeRawUnsafe(
          'DELETE FROM "ConsentAuditLog" WHERE "id" = $1',
          logEntry.id
        );
      },
      (err) => {
        const msg = String(err.message || err).toLowerCase();
        return msg.includes('append-only') || msg.includes('p0001') || msg.includes('p2010');
      },
      'PostgreSQL trigger must reject DELETE operations on ConsentAuditLog'
    );
  });

  it('Invariant 2: unique_current_policy_per_type partial unique index rejects duplicate active policies', async () => {
    // Current active policy for PRIVACY_NOTICE already exists in DB
    const currentNotice = await prisma.policyDocument.findFirst({
      where: { type: 'PRIVACY_NOTICE', isCurrent: true },
    });
    assert.ok(currentNotice, 'Active PRIVACY_NOTICE document must exist in DB');

    // Attempting to insert a second active policy with isCurrent = true must violate partial unique index
    await assert.rejects(
      async () => {
        await prisma.policyDocument.create({
          data: {
            type: 'PRIVACY_NOTICE',
            version: `99.99.${Date.now()}`,
            title: 'Illegal Duplicate Active Notice',
            contentMarkdown: '# Illegal Duplicate Active Notice',
            contentHash: crypto.randomBytes(32).toString('hex'),
            isCurrent: true, // Collision with currentNotice
            effectiveAt: new Date(),
          },
        });
      },
      (err) => {
        const msg = String(err.message || err);
        return msg.includes('unique_current_policy_per_type') || msg.includes('Unique constraint failed') || msg.includes('P2002');
      },
      'Partial unique index unique_current_policy_per_type must prevent multiple current policies of the same type'
    );
  });

  it('Invariant 3: Purpose-specific consent withdrawal leaves public/legal processing unaffected', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'pdpa_withdrawal_test@kpschool.ac.th' },
      update: {},
      create: {
        email: 'pdpa_withdrawal_test@kpschool.ac.th',
        name: 'PDPA Withdrawal Tester',
        role: 'TEACHER',
      },
    });

    // Find the seed PURPOSE_LINE_NOTIFICATION consent purpose
    const linePurpose = await prisma.processingPurpose.findFirst({
      where: { code: 'PURPOSE_LINE_NOTIFICATION' },
    });
    assert.ok(linePurpose, 'PURPOSE_LINE_NOTIFICATION must exist in DB');

    // 1. Grant consent
    const grantResult = await grantUserConsentAction({
      userId: testUser.id,
      purposeId: linePurpose.id,
    });
    assert.strictEqual(grantResult.success, true, 'Consent grant must succeed');

    let consentRecord = await prisma.consentRecord.findUnique({
      where: {
        userId_purposeId: {
          userId: testUser.id,
          purposeId: linePurpose.id,
        },
      },
    });
    assert.strictEqual(consentRecord?.status, 'GIVEN');

    // 2. Withdraw consent with formal reason code USER_CHOICE
    const withdrawResult = await withdrawUserConsentAction({
      userId: testUser.id,
      purposeId: linePurpose.id,
      reasonCode: 'USER_CHOICE',
      reasonDetail: 'User prefers email notifications only',
    });
    assert.strictEqual(withdrawResult.success, true, 'Consent withdrawal must succeed');

    consentRecord = await prisma.consentRecord.findUnique({
      where: {
        userId_purposeId: {
          userId: testUser.id,
          purposeId: linePurpose.id,
        },
      },
    });
    assert.strictEqual(consentRecord?.status, 'WITHDRAWN');
    assert.ok(consentRecord?.withdrawnAt, 'withdrawnAt must be recorded');

    // 3. Verify user privacy overview reflects withdrawal
    const overview = await getUserPrivacyOverviewAction(testUser.id);
    assert.strictEqual(overview.success, true);
    const userConsent = overview.consents.find((c) => c.purposeId === linePurpose.id);
    assert.strictEqual(userConsent?.status, 'WITHDRAWN');

    // 4. Verify that non-consent purpose (e.g. PURPOSE_LEAVE_APPLICATION) has legalBasis = LEGAL_OBLIGATION
    const leavePurpose = await prisma.processingPurpose.findFirst({
      where: { code: 'PURPOSE_LEAVE_APPLICATION' },
      include: { dataCategoryPolicies: true },
    });
    assert.ok(leavePurpose, 'PURPOSE_LEAVE_APPLICATION must exist in DB');
    const hasLegalObligation = leavePurpose.dataCategoryPolicies.some((p) => p.legalBasis === 'LEGAL_OBLIGATION');
    assert.strictEqual(hasLegalObligation, true, 'Official statutory leave processing remains governed by LEGAL_OBLIGATION');
  });
});
