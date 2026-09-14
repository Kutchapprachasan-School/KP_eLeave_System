"use server";

import { getCurrentPolicy, publishPolicyDocument, acknowledgePolicy, hasUserAcknowledgedCurrentPolicy } from "../../lib/privacy/policy-service.ts";
import { prisma } from "../../lib/db.ts";
import { PolicyType } from "@prisma/client";
import type { PolicyDocument } from "@prisma/client";
import { headers } from "next/headers";
import { auth } from "../../lib/auth.ts";

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
    let resolvedUserId: string | undefined;

    // 1. Attempt to resolve identity via authenticated session
    try {
      const headerList = await headers();
      if (headerList) {
        const session = await auth.api.getSession({ headers: headerList });
        if (session?.user?.id) {
          resolvedUserId = session.user.id;
        }
      }
    } catch {
      // Outside request scope (e.g. unit test runner)
    }

    // 2. If no session (e.g. immediate registration callback or unit test),
    // verify params.email: ensure user exists and was created recently (createdAt >= 5m ago),
    // preventing forgery against arbitrary existing accounts.
    if (!resolvedUserId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (params.email) {
        const recentUser = await prisma.user.findFirst({
          where: {
            email: params.email,
            createdAt: {
              gte: fiveMinutesAgo,
            },
          },
        });
        if (recentUser) {
          resolvedUserId = recentUser.id;
        }
      } else if (params.userId) {
        const recentUser = await prisma.user.findFirst({
          where: {
            id: params.userId,
            createdAt: {
              gte: fiveMinutesAgo,
            },
          },
        });
        if (recentUser) {
          resolvedUserId = recentUser.id;
        }
      }
    }

    if (!resolvedUserId) {
      return { success: false, error: "User not found, unauthenticated, or account creation window expired" };
    }

    const { notice, terms } = await fetchCurrentPolicies();

    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    try {
      const resolvedHeaders = await headers();
      ipAddress = resolvedHeaders.get("x-forwarded-for") || resolvedHeaders.get("x-real-ip") || undefined;
      if (ipAddress && ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = resolvedHeaders.get("user-agent") || undefined;
    } catch {
      // Outside request scope
    }

    const acks: Promise<any>[] = [];
    if (notice) {
      acks.push(
        acknowledgePolicy({
          userId: resolvedUserId,
          policyDocumentId: notice.id,
          source: "REGISTRATION",
          ipAddress,
          userAgent,
        })
      );
    }

    if (terms) {
      acks.push(
        acknowledgePolicy({
          userId: resolvedUserId,
          policyDocumentId: terms.id,
          source: "REGISTRATION",
          ipAddress,
          userAgent,
        })
      );
    }

    await Promise.all(acks);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to record policy acknowledgments:", error);
    return { success: false, error: error.message };
  }
}

export async function checkUserPolicyAcknowledgmentStatus(userId?: string): Promise<{
  noticeNeedsAck: boolean;
  termsNeedsAck: boolean;
  currentNotice?: PolicyDocument;
  currentTerms?: PolicyDocument;
  previousNoticeMarkdown?: string;
  previousTermsMarkdown?: string;
  previousNoticeVersion?: string;
  previousTermsVersion?: string;
}> {
  try {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      try {
        const headerList = await headers();
        if (headerList) {
          const session = await auth.api.getSession({ headers: headerList });
          if (session?.user?.id) {
            resolvedUserId = session.user.id;
          }
        }
      } catch {
        // Outside request scope
      }
    }

    if (!resolvedUserId) {
      return {
        noticeNeedsAck: false,
        termsNeedsAck: false,
      };
    }

    const { notice, terms } = await fetchCurrentPolicies();

    const noticeAck = await hasUserAcknowledgedCurrentPolicy(resolvedUserId, "PRIVACY_NOTICE");
    const termsAck = await hasUserAcknowledgedCurrentPolicy(resolvedUserId, "TERMS_OF_USE");

    const currentNotice = noticeAck.currentPolicy || notice || undefined;
    const currentTerms = termsAck.currentPolicy || terms || undefined;

    let previousNoticeMarkdown: string | undefined;
    let previousNoticeVersion: string | undefined;
    let previousTermsMarkdown: string | undefined;
    let previousTermsVersion: string | undefined;

    if (!noticeAck.hasAcknowledged && currentNotice) {
      const prevNoticeAck = await prisma.policyAcknowledgment.findFirst({
        where: {
          userId: resolvedUserId,
          policyDocumentId: { not: currentNotice.id },
          policyDocument: {
            type: "PRIVACY_NOTICE",
          },
        },
        orderBy: {
          acknowledgedAt: "desc",
        },
        include: {
          policyDocument: true,
        },
      });

      if (prevNoticeAck?.policyDocument) {
        previousNoticeMarkdown = prevNoticeAck.policyDocument.contentMarkdown;
        previousNoticeVersion = prevNoticeAck.policyDocument.version || prevNoticeAck.policyVersionSnapshot;
      }
    }

    if (!termsAck.hasAcknowledged && currentTerms) {
      const prevTermsAck = await prisma.policyAcknowledgment.findFirst({
        where: {
          userId: resolvedUserId,
          policyDocumentId: { not: currentTerms.id },
          policyDocument: {
            type: "TERMS_OF_USE",
          },
        },
        orderBy: {
          acknowledgedAt: "desc",
        },
        include: {
          policyDocument: true,
        },
      });

      if (prevTermsAck?.policyDocument) {
        previousTermsMarkdown = prevTermsAck.policyDocument.contentMarkdown;
        previousTermsVersion = prevTermsAck.policyDocument.version || prevTermsAck.policyVersionSnapshot;
      }
    }

    return {
      noticeNeedsAck: !noticeAck.hasAcknowledged,
      termsNeedsAck: !termsAck.hasAcknowledged,
      currentNotice,
      currentTerms,
      previousNoticeMarkdown,
      previousTermsMarkdown,
      previousNoticeVersion,
      previousTermsVersion,
    };
  } catch (error) {
    console.error("Error in checkUserPolicyAcknowledgmentStatus:", error);
    return {
      noticeNeedsAck: false,
      termsNeedsAck: false,
    };
  }
}

export async function acknowledgePolicyForCurrentUser(
  policyDocumentId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      try {
        const headerList = await headers();
        if (headerList) {
          const session = await auth.api.getSession({ headers: headerList });
          if (session?.user?.id) {
            resolvedUserId = session.user.id;
          }
        }
      } catch {
        // Outside request scope
      }
    }

    if (!resolvedUserId) {
      return { success: false, error: "Unauthorized: No active user session" };
    }

    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    try {
      const resolvedHeaders = await headers();
      ipAddress = resolvedHeaders.get("x-forwarded-for") || resolvedHeaders.get("x-real-ip") || undefined;
      if (ipAddress && ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = resolvedHeaders.get("user-agent") || undefined;
    } catch {
      // Outside request scope
    }

    await acknowledgePolicy({
      userId: resolvedUserId,
      policyDocumentId,
      source: "IN_APP_BANNER",
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to acknowledge policy for current user:", error);
    return { success: false, error: error.message };
  }
}

