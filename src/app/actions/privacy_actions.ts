"use server";

import { getCurrentPolicy, publishPolicyDocument, acknowledgePolicy } from "../../lib/privacy/policy-service.ts";
import { prisma } from "../../lib/db.ts";
import { PolicyType } from "@prisma/client";

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
