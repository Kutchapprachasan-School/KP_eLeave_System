import { prisma } from "../db.ts";
import {
  ConsentStatus,
  WithdrawalReasonCode,
  RevocationReasonCode,
} from "@prisma/client";

/**
 * Validates that a purpose's data category policies strictly comply with PDPA Section 19/26
 * Pure Consent requirements:
 * - Throws error if empty or contains non-consent legal bases (e.g. PUBLIC_TASK, LEGAL_OBLIGATION).
 * - Throws error if sensitive data categories do not have EXPLICIT_CONSENT.
 * - Throws error if non-sensitive categories have Section 26 conditions.
 * - Returns true if valid pure consent.
 */
export function validateConsentApplicability(
  dataCategoryPolicies: Array<{
    dataCategory?: string;
    legalBasis: string;
    section26Condition?: string | null;
  }> | null | undefined
): boolean {
  if (!dataCategoryPolicies || dataCategoryPolicies.length === 0) {
    throw new Error(
      "Consent is not an applicable legal basis: Processing purpose has no configured data category policies"
    );
  }

  const hasNonConsentBasis = dataCategoryPolicies.some((p) => p.legalBasis !== "CONSENT");
  if (hasNonConsentBasis) {
    throw new Error(
      "Consent is not an applicable legal basis: Purpose contains non-consent legal bases. Consent cannot be recorded for purposes governed by statutory obligations or public task."
    );
  }

  const allCategoriesConsentEligible = dataCategoryPolicies.every((p) => {
    const isSensitive =
      p.dataCategory === "SENSITIVE_HEALTH" ||
      p.dataCategory === "SENSITIVE_BIOMETRIC";
    if (isSensitive) {
      return p.legalBasis === "CONSENT" && p.section26Condition === "EXPLICIT_CONSENT";
    }
    return p.legalBasis === "CONSENT" && !p.section26Condition;
  });

  if (!allCategoriesConsentEligible) {
    throw new Error(
      "Consent is not an applicable legal basis for all data categories under this purpose"
    );
  }
  return true;
}

/**
 * Records or updates a user's consent for a specific processing purpose.
 * Ensures pure consent applicability and records an immutable audit log atomically.
 */
export async function recordUserConsent(params: {
  userId: string;
  purposeId: string;
  consentFormVersion: string;
  privacyNoticeVersion: string;
  source: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const purpose = await prisma.processingPurpose.findFirst({
    where: {
      OR: [{ id: params.purposeId }, { code: params.purposeId }],
      active: true,
    },
    include: { dataCategoryPolicies: true },
  });

  if (!purpose) {
    throw new Error("Processing purpose not found or inactive");
  }

  // Validate that Consent is actually applicable for this purpose according to data category rules
  validateConsentApplicability(purpose.dataCategoryPolicies);

  return await prisma.$transaction(async (tx) => {
    const record = await tx.consentRecord.upsert({
      where: {
        userId_purposeId: {
          userId: params.userId,
          purposeId: purpose.id,
        },
      },
      create: {
        userId: params.userId,
        purposeId: purpose.id,
        status: "GIVEN",
        consentedAt: new Date(),
        withdrawnAt: null,
        revokedAt: null,
        consentFormVersion: params.consentFormVersion,
        privacyNoticeVersion: params.privacyNoticeVersion,
        source: params.source,
      },
      update: {
        status: "GIVEN",
        consentedAt: new Date(),
        withdrawnAt: null,
        revokedAt: null,
        consentFormVersion: params.consentFormVersion,
        privacyNoticeVersion: params.privacyNoticeVersion,
        source: params.source,
      },
    });

    await tx.consentAuditLog.create({
      data: {
        correlationId: params.correlationId,
        eventType: "CONSENT_GIVEN",
        subjectType: "CONSENT_RECORD",
        userId: params.userId,
        purposeId: purpose.id,
        purposeCodeSnapshot: purpose.code,
        consentRecordId: record.id,
        consentFormVersionSnapshot: params.consentFormVersion,
        actorType: "USER",
        actorId: params.userId,
        source: params.source,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return record;
  });
}

/**
 * Withdraws a user's consent using atomic CAS (Compare-And-Swap) locking on status = 'GIVEN'
 * to prevent double-withdrawal race conditions.
 * Only appends the immutable audit log upon successful state transition.
 */
export async function withdrawUserConsent(params: {
  userId: string;
  purposeId: string;
  reasonCode: WithdrawalReasonCode;
  reasonDetail?: string;
  source: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const purpose = await prisma.processingPurpose.findFirst({
    where: {
      OR: [{ id: params.purposeId }, { code: params.purposeId }],
    },
    select: { id: true, code: true },
  });

  const targetPurposeId = purpose ? purpose.id : params.purposeId;

  return await prisma.$transaction(async (tx) => {
    // CAS (Compare-And-Swap) atomic update: only update if status is currently GIVEN (prevents concurrent double-withdraw race)
    const result = await tx.consentRecord.updateMany({
      where: {
        userId: params.userId,
        purposeId: targetPurposeId,
        status: "GIVEN", // CAS atomic guard
      },
      data: {
        status: "WITHDRAWN",
        withdrawnAt: new Date(),
        revokedAt: null,
      },
    });

    if (result.count === 0) {
      throw new Error("Consent record state conflict: record is not in GIVEN state or already withdrawn");
    }

    const updated = await tx.consentRecord.findUniqueOrThrow({
      where: {
        userId_purposeId: {
          userId: params.userId,
          purposeId: targetPurposeId,
        },
      },
      include: { purpose: true },
    });

    // Audit event is created ONLY when state transition successfully occurred!
    await tx.consentAuditLog.create({
      data: {
        correlationId: params.correlationId,
        eventType: "CONSENT_WITHDRAWN",
        subjectType: "CONSENT_RECORD",
        userId: params.userId,
        purposeId: updated.purpose.id,
        purposeCodeSnapshot: updated.purpose.code,
        consentRecordId: updated.id,
        consentFormVersionSnapshot: updated.consentFormVersion,
        actorType: "USER",
        actorId: params.userId,
        withdrawalReason: params.reasonCode,
        reasonDetail: params.reasonDetail,
        source: params.source,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return updated;
  });
}

/**
 * Revokes a user's consent by administrative or system authority with mandatory audit reasoning.
 */
export async function revokeConsentByAdmin(params: {
  userId: string;
  purposeId: string;
  reasonCode: RevocationReasonCode;
  reasonDetail?: string;
  adminId: string;
  source: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const purpose = await prisma.processingPurpose.findFirst({
    where: {
      OR: [{ id: params.purposeId }, { code: params.purposeId }],
    },
    select: { id: true, code: true },
  });

  const targetPurposeId = purpose ? purpose.id : params.purposeId;

  return await prisma.$transaction(async (tx) => {
    // CAS (Compare-And-Swap) atomic update: only revoke if not already revoked
    const result = await tx.consentRecord.updateMany({
      where: {
        userId: params.userId,
        purposeId: targetPurposeId,
        status: { not: "REVOKED" }, // CAS guard: only revoke if not already revoked
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        withdrawnAt: null,
      },
    });

    if (result.count === 0) {
      throw new Error("Consent record state conflict: record is already revoked or does not exist");
    }

    const updated = await tx.consentRecord.findUniqueOrThrow({
      where: {
        userId_purposeId: {
          userId: params.userId,
          purposeId: targetPurposeId,
        },
      },
      include: { purpose: true },
    });

    await tx.consentAuditLog.create({
      data: {
        correlationId: params.correlationId,
        eventType: "CONSENT_REVOKED",
        subjectType: "CONSENT_RECORD",
        userId: params.userId,
        purposeId: updated.purpose.id,
        purposeCodeSnapshot: updated.purpose.code,
        consentRecordId: updated.id,
        consentFormVersionSnapshot: updated.consentFormVersion,
        actorType: "ADMIN",
        actorId: params.adminId,
        revocationReason: params.reasonCode,
        reasonDetail: params.reasonDetail,
        source: params.source,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return updated;
  });
}

/**
 * Retrieves all consent records for a user, including processing purposes, activities,
 * and data category policies.
 */
export async function getUserConsents(userId: string) {
  return await prisma.consentRecord.findMany({
    where: { userId },
    include: {
      purpose: {
        include: {
          activity: true,
          dataCategoryPolicies: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type ConsentItem = Awaited<ReturnType<typeof getUserConsents>>[number];
