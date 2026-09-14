import { prisma } from "../db.ts";

export interface RopaDataCategoryPolicySummary {
  id: string;
  dataCategory: string;
  legalBasis: string;
  section26Condition: string | null;
  statutoryReference: string | null;
  isMandatoryForOperation: boolean;
}

export interface RopaPurposeSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requiresConsent: boolean;
  dataCategoryPolicies: RopaDataCategoryPolicySummary[];
}

export interface RopaActivitySummary {
  id: string;
  code: string;
  module: string;
  name: string;
  description: string | null;
  controllerName: string;
  dpoContact: string;
  dataSubjectCategory: string;
  retentionRuleType: string;
  retentionDurationMonths: number;
  retentionAuthority: string;
  disposalMethod: string;
  recipientsSummary: string;
  crossBorderTransfer: boolean;
  crossBorderDetails: string | null;
  purposes: RopaPurposeSummary[];
}

/**
 * Evaluates whether a set of data category policies under a processing purpose
 * requires and is eligible for data subject consent under PDPA Section 19/26.
 *
 * Pure consent rule:
 * - If policies is empty or has non-consent bases (e.g. PUBLIC_TASK, LEGAL_OBLIGATION), returns false.
 * - If relying on CONSENT, ensure all categories are consent-eligible:
 *   - Sensitive data (SENSITIVE_HEALTH, SENSITIVE_BIOMETRIC) requires legalBasis === 'CONSENT'
 *     with section26Condition === 'EXPLICIT_CONSENT'.
 *   - General data categories require legalBasis === 'CONSENT' with null/empty section26Condition.
 */
export function evaluatePurposeConsentRequirement(
  policies: Array<{
    legalBasis: string;
    section26Condition?: string | null;
    dataCategory: string;
  }> | null | undefined
): boolean {
  if (!policies || policies.length === 0) {
    return false;
  }

  // Pure consent rule: Any non-consent basis means this purpose is not governed by consent.
  // Consent must never be used to authorize or pollute processing governed by statutory obligations or public tasks.
  const hasNonConsentBasis = policies.some((p) => p.legalBasis !== "CONSENT");
  if (hasNonConsentBasis) {
    return false;
  }

  // Ensure all categories in this purpose are consent-eligible
  const allCategoriesEligible = policies.every((p) => {
    const isSensitive =
      p.dataCategory === "SENSITIVE_HEALTH" ||
      p.dataCategory === "SENSITIVE_BIOMETRIC";

    if (isSensitive) {
      return p.legalBasis === "CONSENT" && p.section26Condition === "EXPLICIT_CONSENT";
    }

    return p.legalBasis === "CONSENT" && !p.section26Condition;
  });

  return allCategoriesEligible;
}

/**
 * Checks if a specific processing purpose (by ID or Code) operates under consent
 * by fetching its active data category policies and evaluating them against pure consent rules.
 */
export async function isConsentApplicableForPurpose(purposeId: string): Promise<boolean> {
  const purpose = await prisma.processingPurpose.findFirst({
    where: {
      OR: [{ id: purposeId }, { code: purposeId }],
      active: true,
    },
    include: {
      dataCategoryPolicies: true,
    },
  });

  if (!purpose) {
    return false;
  }

  return evaluatePurposeConsentRequirement(purpose.dataCategoryPolicies);
}

/**
 * Queries all active Processing Activities along with their active purposes and policies,
 * returning structured, sanitized ROPA summaries suitable for public display and audit.
 */
export async function getPublicRopaSummary(): Promise<RopaActivitySummary[]> {
  const activities = await prisma.processingActivity.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    include: {
      purposes: {
        where: { active: true },
        orderBy: { code: "asc" },
        include: {
          dataCategoryPolicies: true,
        },
      },
    },
  });

  return activities.map((activity) => ({
    id: activity.id,
    code: activity.code,
    module: activity.module,
    name: activity.name,
    description: activity.description,
    controllerName: activity.controllerName,
    dpoContact: activity.dpoContact,
    dataSubjectCategory: activity.dataSubjectCategory,
    retentionRuleType: activity.retentionRuleType,
    retentionDurationMonths: activity.retentionDurationMonths,
    retentionAuthority: activity.retentionAuthority,
    disposalMethod: activity.disposalMethod,
    recipientsSummary: activity.recipientsSummary,
    crossBorderTransfer: activity.crossBorderTransfer,
    crossBorderDetails: activity.crossBorderDetails,
    purposes: activity.purposes.map((purpose) => ({
      id: purpose.id,
      code: purpose.code,
      name: purpose.name,
      description: purpose.description,
      requiresConsent: evaluatePurposeConsentRequirement(purpose.dataCategoryPolicies),
      dataCategoryPolicies: purpose.dataCategoryPolicies.map((p) => ({
        id: p.id,
        dataCategory: p.dataCategory,
        legalBasis: p.legalBasis,
        section26Condition: p.section26Condition,
        statutoryReference: p.statutoryReference,
        isMandatoryForOperation: p.isMandatoryForOperation,
      })),
    })),
  }));
}
