"use server";

import { getCurrentPolicy, publishPolicyDocument, acknowledgePolicy } from "../../lib/privacy/policy-service.ts";
import { recordUserConsent, withdrawUserConsent } from "../../lib/privacy/consent-service.ts";
import { getPublicRopaSummary } from "../../lib/privacy/ropa-service.ts";
import { prisma } from "../../lib/db.ts";
import { PolicyType, WithdrawalReasonCode } from "@prisma/client";
import crypto from "crypto";

const DEFAULT_NOTICE = `
# ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)

ทางโรงเรียนตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลของท่าน และมุ่งมั่นที่จะปกป้องข้อมูลส่วนบุคคลของท่านตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)

## 1. ข้อมูลที่เราเก็บรวบรวม
เราเก็บรวบรวมข้อมูลส่วนบุคคลที่จำเป็นต่อการใช้งานระบบ เช่น ชื่อ-นามสกุล, อีเมล, ตำแหน่ง, รูปถ่าย

## 2. วัตถุประสงค์ในการประมวลผลข้อมูล
เพื่อใช้ในการยืนยันตัวตน และบันทึกประวัติการลาในระบบการจัดการการลาของโรงเรียน

## 3. สิทธิของเจ้าของข้อมูล
ท่านมีสิทธิในการขอเข้าถึง ขอแก้ไข หรือขอลบข้อมูลส่วนบุคคลของท่านออกจากระบบได้
`.trim();

const DEFAULT_TERMS = `
# เงื่อนไขการใช้งานระบบสารสนเทศ (Terms of Use)

เพื่อให้การใช้งานระบบสารสนเทศของโรงเรียนเป็นไปอย่างมีประสิทธิภาพและปลอดภัย ผู้ใช้งานต้องปฏิบัติตามเงื่อนไขดังต่อไปนี้:

1. ผู้ใช้งานต้องเก็บรักษารหัสผ่านของตนเองเป็นความลับ และไม่ยินยอมให้บุคคลอื่นเข้าถึงบัญชีผู้ใช้งานของตน
2. ข้อมูลที่นำเข้าสู่ระบบต้องเป็นความจริง และไม่ละเมิดสิทธิของบุคคลอื่น
3. ห้ามใช้ระบบเพื่อการกระทำที่ผิดกฎหมาย หรือละเมิดศีลธรรมอันดี
4. โรงเรียนขอสงวนสิทธิ์ในการระงับการใช้งานบัญชี หากพบว่ามีการฝ่าฝืนเงื่อนไขการใช้งาน
`.trim();

export async function fetchCurrentPolicies() {
  let notice = await getCurrentPolicy("PRIVACY_NOTICE");
  if (!notice) {
    notice = await publishPolicyDocument({
      type: "PRIVACY_NOTICE",
      version: "1.0",
      title: "ประกาศการคุ้มครองข้อมูลส่วนบุคคล",
      contentMarkdown: DEFAULT_NOTICE,
      effectiveAt: new Date(),
    });
  }

  let terms = await getCurrentPolicy("TERMS_OF_USE");
  if (!terms) {
    terms = await publishPolicyDocument({
      type: "TERMS_OF_USE",
      version: "1.0",
      title: "เงื่อนไขการใช้งานระบบสารสนเทศ",
      contentMarkdown: DEFAULT_TERMS,
      effectiveAt: new Date(),
    });
  }

  return { notice, terms };
}

export async function recordRegistrationPolicyAcknowledgments(params: { userId?: string; email?: string }) {
  try {
    let resolvedUserId = params.userId;
    if (!resolvedUserId && params.email) {
      const user = await prisma.user.findFirst({
        where: { email: params.email },
      });
      if (user) {
        resolvedUserId = user.id;
      }
    }

    if (!resolvedUserId) {
      return { success: false, error: "User not found" };
    }

    const { notice, terms } = await fetchCurrentPolicies();
    
    let getHeaders: any;
    try {
      const mod = await import("next/headers");
      getHeaders = mod.headers;
    } catch (e) {
      // Fallback for test environment
      getHeaders = () => new Map([
        ['x-forwarded-for', '127.0.0.1'],
        ['user-agent', 'Test Agent']
      ]);
    }
    
    const headersList = typeof getHeaders === "function" ? getHeaders() : (await (getHeaders as any)());
    
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    const resolvedHeaders = await Promise.resolve(headersList);
    
    ipAddress = resolvedHeaders.get("x-forwarded-for") || resolvedHeaders.get("x-real-ip") || undefined;
    if (ipAddress && ipAddress.includes(",")) {
      ipAddress = ipAddress.split(",")[0].trim();
    }
    userAgent = resolvedHeaders.get("user-agent") || undefined;

    if (notice) {
      await acknowledgePolicy({
        userId: resolvedUserId,
        policyDocumentId: notice.id,
        source: "REGISTRATION",
        ipAddress,
        userAgent,
      });
    }

    if (terms) {
      await acknowledgePolicy({
        userId: resolvedUserId,
        policyDocumentId: terms.id,
        source: "REGISTRATION",
        ipAddress,
        userAgent,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to record policy acknowledgments:", error);
    return { success: false, error: error.message };
  }
}

async function getClientRequestMeta() {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;
  try {
    const mod = await import("next/headers");
    const headersList = await mod.headers();
    ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined;
    if (ipAddress && ipAddress.includes(",")) {
      ipAddress = ipAddress.split(",")[0].trim();
    }
    userAgent = headersList.get("user-agent") || undefined;
  } catch {
    ipAddress = "127.0.0.1";
    userAgent = "App Runtime";
  }
  return { ipAddress, userAgent };
}

/**
 * Checks if the given user has acknowledged the latest versions of Notice & Terms.
 * Used by PolicyUpdateNotifier to display a non-coercive notification banner in layout.
 */
export async function checkUserPolicyStatusAction(userId: string) {
  try {
    const { notice, terms } = await fetchCurrentPolicies();

    let unacknowledgedNotice: any = null;
    let unacknowledgedTerms: any = null;

    if (notice) {
      const ack = await prisma.policyAcknowledgment.findUnique({
        where: {
          userId_policyDocumentId: {
            userId,
            policyDocumentId: notice.id,
          },
        },
      });
      if (!ack) {
        unacknowledgedNotice = notice;
      }
    }

    if (terms) {
      const ack = await prisma.policyAcknowledgment.findUnique({
        where: {
          userId_policyDocumentId: {
            userId,
            policyDocumentId: terms.id,
          },
        },
      });
      if (!ack) {
        unacknowledgedTerms = terms;
      }
    }

    const hasUnacknowledged = !!(unacknowledgedNotice || unacknowledgedTerms);
    return {
      success: true,
      hasUnacknowledged,
      pendingNotice: unacknowledgedNotice,
      pendingTerms: unacknowledgedTerms,
    };
  } catch (error: any) {
    console.error("Error checking user policy status:", error);
    return { success: false, hasUnacknowledged: false, error: error.message };
  }
}

/**
 * Acknowledges a specific policy document for the logged-in user.
 */
export async function acknowledgeUserPolicyAction(params: {
  userId: string;
  policyDocumentId: string;
  source?: string;
}) {
  try {
    const { ipAddress, userAgent } = await getClientRequestMeta();
    const ack = await acknowledgePolicy({
      userId: params.userId,
      policyDocumentId: params.policyDocumentId,
      source: params.source || "ACTIVE_APP_BANNER",
      ipAddress,
      userAgent,
    });
    return { success: true, acknowledgmentId: ack.id };
  } catch (error: any) {
    console.error("Failed to acknowledge policy:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches user privacy overview: acknowledgments, active consents, and available consent purposes.
 */
export async function getUserPrivacyOverviewAction(userId: string) {
  try {
    const acknowledgments = await prisma.policyAcknowledgment.findMany({
      where: { userId },
      include: {
        policyDocument: {
          select: {
            id: true,
            type: true,
            version: true,
            title: true,
            effectiveAt: true,
            publishedAt: true,
          },
        },
      },
      orderBy: { acknowledgedAt: "desc" },
    });

    const consents = await prisma.consentRecord.findMany({
      where: { userId },
      include: {
        purpose: {
          include: {
            activity: true,
            dataCategoryPolicies: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Fetch all active purposes that require/support consent
    const allActivities = await prisma.processingActivity.findMany({
      where: { active: true },
      include: {
        purposes: {
          where: { active: true },
          include: {
            dataCategoryPolicies: true,
          },
        },
      },
    });

    const consentPurposes: Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      activityName: string;
      categories: string[];
    }> = [];

    for (const act of allActivities) {
      for (const pur of act.purposes) {
        const isConsentOnly = pur.dataCategoryPolicies.length > 0 &&
          pur.dataCategoryPolicies.every((p) => p.legalBasis === "CONSENT");
        if (isConsentOnly) {
          consentPurposes.push({
            id: pur.id,
            code: pur.code,
            name: pur.name,
            description: pur.description,
            activityName: act.name,
            categories: pur.dataCategoryPolicies.map((p) => p.dataCategory),
          });
        }
      }
    }

    return {
      success: true,
      acknowledgments,
      consents,
      consentPurposes,
    };
  } catch (error: any) {
    console.error("Error fetching user privacy overview:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Withdraws user consent for a specific purpose.
 */
export async function withdrawUserConsentAction(params: {
  userId: string;
  purposeId: string;
  reasonCode: WithdrawalReasonCode;
  reasonDetail?: string;
}) {
  try {
    const { ipAddress, userAgent } = await getClientRequestMeta();
    const correlationId = `wit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    
    const record = await withdrawUserConsent({
      userId: params.userId,
      purposeId: params.purposeId,
      reasonCode: params.reasonCode,
      reasonDetail: params.reasonDetail,
      source: "PRIVACY_CENTER",
      correlationId,
      ipAddress,
      userAgent,
    });

    return { success: true, record };
  } catch (error: any) {
    console.error("Error withdrawing user consent:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Grants or updates user consent for a specific purpose.
 */
export async function grantUserConsentAction(params: {
  userId: string;
  purposeId: string;
  consentFormVersion?: string;
}) {
  try {
    const { ipAddress, userAgent } = await getClientRequestMeta();
    const correlationId = `gnt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const { notice } = await fetchCurrentPolicies();

    const record = await recordUserConsent({
      userId: params.userId,
      purposeId: params.purposeId,
      consentFormVersion: params.consentFormVersion || "1.0",
      privacyNoticeVersion: notice ? notice.version : "1.0",
      source: "PRIVACY_CENTER",
      correlationId,
      ipAddress,
      userAgent,
    });

    return { success: true, record };
  } catch (error: any) {
    console.error("Error granting user consent:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches public institutional privacy disclosure data (Privacy Notice, Terms, and full ROPA summary).
 */
export async function getPublicPrivacyInfoAction() {
  try {
    const { notice, terms } = await fetchCurrentPolicies();
    const ropaActivities = await getPublicRopaSummary();

    return {
      success: true,
      notice,
      terms,
      ropaActivities,
    };
  } catch (error: any) {
    console.error("Error fetching public privacy info:", error);
    return { success: false, error: error.message };
  }
}

