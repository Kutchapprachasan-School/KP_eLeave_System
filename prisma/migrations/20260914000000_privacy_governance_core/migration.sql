-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('PRIVACY_NOTICE', 'TERMS_OF_USE');

-- CreateEnum
CREATE TYPE "LegalBasisType" AS ENUM ('PUBLIC_TASK', 'LEGAL_OBLIGATION', 'CONTRACT', 'CONSENT', 'LEGITIMATE_INTEREST', 'VITAL_INTEREST');

-- CreateEnum
CREATE TYPE "Section26ConditionType" AS ENUM ('EXPLICIT_CONSENT', 'VITAL_INTEREST_EMERGENCY', 'NON_PROFIT_BODY_LEGITIMATE_ACTIVITY', 'MANIFESTLY_PUBLIC_DATA', 'LEGAL_CLAIMS_AND_DEFENSE', 'LABOR_AND_SOCIAL_SECURITY_LAW', 'STATUTORY_PUBLIC_HEALTH', 'SUBSTANTIAL_PUBLIC_INTEREST');

-- CreateEnum
CREATE TYPE "DataCategoryType" AS ENUM ('GENERAL_IDENTITY', 'CONTACT_INFO', 'EMPLOYMENT_RECORD', 'SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC', 'GEOLOCATION', 'DOCUMENT_ATTACHMENT', 'SYSTEM_AUDIT_LOG');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GIVEN', 'WITHDRAWN', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('POLICY_ACKNOWLEDGED', 'CONSENT_GIVEN', 'CONSENT_WITHDRAWN', 'CONSENT_REVOKED');

-- CreateEnum
CREATE TYPE "AuditSubjectType" AS ENUM ('POLICY_DOCUMENT', 'CONSENT_RECORD');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'MIGRATION');

-- CreateEnum
CREATE TYPE "WithdrawalReasonCode" AS ENUM ('USER_CHOICE', 'NO_LONGER_USING_FEATURE', 'DATA_MINIMIZATION_PREFERENCE');

-- CreateEnum
CREATE TYPE "RevocationReasonCode" AS ENUM ('ADMINISTRATIVE_DISCONTINUATION', 'SYSTEM_MIGRATION', 'STATUTORY_LEGAL_ORDER', 'ACCOUNT_DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "RetentionRuleType" AS ENUM ('EVENT_BASED', 'FISCAL_YEAR_BASED', 'STATUTORY_LOG_90_DAYS');

-- CreateEnum
CREATE TYPE "DisposalMethod" AS ENUM ('SECURE_DESTROY', 'PERMANENT_ANONYMIZE', 'TRANSFER_TO_NATIONAL_ARCHIVES');

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "canonicalEngineVersion" TEXT NOT NULL DEFAULT 'v1',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "policyVersionSnapshot" TEXT NOT NULL,
    "contentHashSnapshot" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEB_APP',
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PolicyAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingActivity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "controllerName" TEXT NOT NULL DEFAULT 'โรงเรียนกุดจับประชาสรรค์',
    "dpoContact" TEXT NOT NULL DEFAULT 'kpschool_dpo@obec.moe.go.th',
    "dataSubjectCategory" TEXT NOT NULL,
    "retentionRuleType" "RetentionRuleType" NOT NULL DEFAULT 'EVENT_BASED',
    "retentionDurationMonths" INTEGER NOT NULL,
    "retentionAuthority" TEXT NOT NULL,
    "disposalMethod" "DisposalMethod" NOT NULL DEFAULT 'SECURE_DESTROY',
    "recipientsSummary" TEXT NOT NULL,
    "crossBorderTransfer" BOOLEAN NOT NULL DEFAULT false,
    "crossBorderDetails" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingPurpose" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingPurpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingDataCategoryPolicy" (
    "id" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "dataCategory" "DataCategoryType" NOT NULL,
    "legalBasis" "LegalBasisType" NOT NULL,
    "section26Condition" "Section26ConditionType",
    "statutoryReference" TEXT,
    "isMandatoryForOperation" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProcessingDataCategoryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GIVEN',
    "consentFormVersion" TEXT NOT NULL,
    "privacyNoticeVersion" TEXT,
    "consentedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentAuditLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "subjectType" "AuditSubjectType" NOT NULL,
    "userId" TEXT NOT NULL,
    "policyDocumentId" TEXT,
    "policyVersionSnapshot" TEXT,
    "contentHashSnapshot" TEXT,
    "purposeId" TEXT,
    "purposeCodeSnapshot" TEXT,
    "consentRecordId" TEXT,
    "consentFormVersionSnapshot" TEXT,
    "actorType" "AuditActorType" NOT NULL DEFAULT 'USER',
    "actorId" TEXT,
    "source" TEXT NOT NULL,
    "withdrawalReason" "WithdrawalReasonCode",
    "revocationReason" "RevocationReasonCode",
    "reasonDetail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ConsentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyDocument_type_isCurrent_idx" ON "PolicyDocument"("type", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_type_version_key" ON "PolicyDocument"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "unique_current_policy_per_type" ON "PolicyDocument"("type") WHERE ("isCurrent" = true);

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_userId_idx" ON "PolicyAcknowledgment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgment_userId_policyDocumentId_key" ON "PolicyAcknowledgment"("userId", "policyDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingActivity_code_key" ON "ProcessingActivity"("code");

-- CreateIndex
CREATE INDEX "ProcessingActivity_module_active_idx" ON "ProcessingActivity"("module", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingPurpose_code_key" ON "ProcessingPurpose"("code");

-- CreateIndex
CREATE INDEX "ProcessingPurpose_activityId_active_idx" ON "ProcessingPurpose"("activityId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingDataCategoryPolicy_purposeId_dataCategory_legalBa_key" ON "ProcessingDataCategoryPolicy"("purposeId", "dataCategory", "legalBasis");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_status_idx" ON "ConsentRecord"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_userId_purposeId_key" ON "ConsentRecord"("userId", "purposeId");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_userId_occurredAt_idx" ON "ConsentAuditLog"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_eventType_occurredAt_idx" ON "ConsentAuditLog"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_correlationId_idx" ON "ConsentAuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_eventId_idx" ON "ConsentAuditLog"("eventId");

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "PolicyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingPurpose" ADD CONSTRAINT "ProcessingPurpose_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingDataCategoryPolicy" ADD CONSTRAINT "ProcessingDataCategoryPolicy_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "ProcessingPurpose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "ProcessingPurpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1. PostgreSQL Append-Only Trigger for ConsentAuditLog
CREATE OR REPLACE FUNCTION prevent_consent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consent_audit_log_immutable ON "ConsentAuditLog";

CREATE TRIGGER trg_consent_audit_log_immutable
BEFORE UPDATE OR DELETE ON "ConsentAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_consent_audit_log_mutation();

-- 2. Consent State Lifecycle CHECK Constraint
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "chk_consent_record_state_lifecycle" CHECK (
  (status = 'GIVEN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NULL AND "revokedAt" IS NULL) OR
  (status = 'WITHDRAWN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NOT NULL AND "revokedAt" IS NULL) OR
  (status = 'REVOKED' AND "revokedAt" IS NOT NULL)
);

-- 3. Section 26 Consistency CHECK Constraint
ALTER TABLE "ProcessingDataCategoryPolicy" ADD CONSTRAINT "chk_section26_consistency" CHECK (
  ("dataCategory" NOT IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NULL) OR
  ("dataCategory" IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NOT NULL)
);

-- 4. Audit Subject Exclusivity Constraint
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "chk_audit_subject_exclusivity" CHECK (
  ("subjectType" = 'POLICY_DOCUMENT' AND "policyDocumentId" IS NOT NULL AND "consentRecordId" IS NULL) OR
  ("subjectType" = 'CONSENT_RECORD' AND "consentRecordId" IS NOT NULL AND "purposeId" IS NOT NULL)
);
