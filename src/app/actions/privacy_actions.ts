"use server";

import crypto from "crypto";
import { getCurrentPolicy, publishPolicyDocument, acknowledgePolicy, hasUserAcknowledgedCurrentPolicy } from "../../lib/privacy/policy-service.ts";
import { prisma } from "../../lib/db.ts";
import type { PolicyDocument, WithdrawalReasonCode } from "@prisma/client";
import { headers } from "next/headers";
import { auth } from "../../lib/auth.ts";
import { evaluatePurposeConsentRequirement, getPublicRopaSummary } from "../../lib/privacy/ropa-service.ts";
import { recordUserConsent, withdrawUserConsent } from "../../lib/privacy/consent-service.ts";

const DEFAULT_NOTICE = `
# ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)
## โรงเรียนกุดจับประชาสรรค์ สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี

โรงเรียนกุดจับประชาสรรค์ ตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลของข้าราชการครู บุคลากรทางการศึกษา ลูกจ้าง และบุคคลภายนอกผู้ติดต่อราชการ เพื่อให้การบริหารจัดการข้อมูลส่วนบุคคลของระบบสารสนเทศเพื่อการบริหารจัดการสถานศึกษา (KP e-Leave & School Operations Platform) เป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) จึงขอประกาศรายละเอียดและเงื่อนไขการประมวลผลข้อมูลส่วนบุคคล ดังต่อไปนี้:

---

### 1. ข้อมูลผู้ควบคุมข้อมูลส่วนบุคคลและเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล
* **ผู้ควบคุมข้อมูลส่วนบุคคล (Data Controller):** โรงเรียนกุดจับประชาสรรค์
  * ที่อยู่: 177 หมู่ 1 ตำบลเมืองเพีย อำเภอกุดจับ จังหวัดอุดรธานี 41250
  * สังกัด: สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) กระทรวงศึกษาธิการ
* **เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (Data Protection Officer - DPO):**
  * งานเทคโนโลยีสารสนเทศและคุ้มครองข้อมูลส่วนบุคคล โรงเรียนกุดจับประชาสรรค์
  * ช่องทางติดต่ออิเล็กทรอนิกส์: kpschool_dpo@obec.moe.go.th

---

### 2. ฐานทางกฎหมายและวัตถุประสงค์ในการประมวลผลข้อมูลส่วนบุคคล
ระบบสารสนเทศของโรงเรียนประมวลผลข้อมูลส่วนบุคคลตามฐานทางกฎหมายแห่ง พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ดังต่อไปนี้:

1. **ฐานการปฏิบัติหน้าที่ตามกฎหมาย (Legal Obligation - มาตรา 24 (6)):**
   * **การบริหารจัดการการลา (Leave Management):** ประมวลผลข้อมูลชื่อ-นามสกุล, ตำแหน่ง, ประวัติการปฏิบัติราชการ, และสถิติวันลา ตามพระราชบัญญัติระเบียบข้าราชการครูและบุคลากรทางการศึกษา พ.ศ. 2547 และระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
   * **การลงเวลาปฏิบัติราชการ (Attendance Tracking):** ตรวจสอบการมาปฏิบัติราชการ พิกัดสถานที่ (Geolocation) และเวลาเข้า-ออกงาน ตามระเบียบกระทรวงศึกษาธิการว่าด้วยการลงเวลาปฏิบัติราชการ
   * **การประมวลผลข้อมูลอ่อนไหว (Sensitive Data - มาตรา 26 (5) (ก)):** ข้อมูลสุขภาพ อาการป่วย หรือใบรับรองแพทย์ ประมวลผลเพื่อการลาป่วยตามกฎหมายว่าด้วยการคุ้มครองแรงงานและการคุ้มครองทางสังคม
   * *หมายเหตุสำคัญ:* การประมวลผลตามฐานกฎหมายนี้ถือเป็นหน้าที่ในการปฏิบัติราชการ **ไม่สามารถเพิกถอนหรือยกเลิกการประมวลผลได้**

2. **ฐานภารกิจเพื่อประโยชน์สาธารณะและการใช้อำนาจรัฐ (Public Task / Official Authority - มาตรา 24 (4)):**
   * **งานสารบรรณอิเล็กทรอนิกส์ (Saraban & Official Dispatch):** การรับ-ส่ง ทะเบียน และเวียนหนังสือราชการ ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และพระราชบัญญัติระเบียบบริหารราชการกระทรวงศึกษาธิการ พ.ศ. 2546

3. **ฐานความยินยอม (Consent - มาตรา 19):**
   * **บริการแจ้งเตือนเสริม (Notifications):** การเชื่อมต่อบัญชี LINE เพื่อรับการแจ้งเตือนสถานะใบลาหรือหนังสือราชการผ่าน LINE Messaging API
   * *สิทธิของท่าน:* ท่านสามารถเลือกที่จะให้หรือไม่ให้ความยินยอมก็ได้ และสามารถใช้สิทธิ **"ถอนความยินยอม" (Withdraw Consent)** ได้ตลอดเวลาผ่านระบบศูนย์คุ้มครองข้อมูลส่วนบุคคล (Privacy Center) โดยการถอนความยินยอมจะไม่ส่งผลกระทบต่อสิทธิวันลาหรือการปฏิบัติราชการหลักของท่าน

---

### 3. ประเภทของข้อมูลส่วนบุคคลที่เก็บรวบรวม
1. **ข้อมูลระบุตัวตนและข้อมูลส่วนบุคคลทั่วไป:** คำนำหน้า, ชื่อ, นามสกุล, เลขประจำตัวประชาชน (เฉพาะกรณีตรวจสอบสิทธิ์ตามระเบียบราชการ), วันเดือนปีเกิด, รูปถ่ายประจำตัว, ลายมือชื่ออิเล็กทรอนิกส์
2. **ข้อมูลการติดต่อและการทำงาน:** ตำแหน่ง, วิทยฐานะ, กลุ่มสาระการเรียนรู้, อีเมลของสถานศึกษา, หมายเลขโทรศัพท์
3. **ข้อมูลการปฏิบัติงานและสถิติ:** ประวัติการลาทุกประเภท, ข้อมูลบันทึกเวลาปฏิบัติงาน (GPS Geofence, Timestamp), ประวัติการอนุมัติ
4. **ข้อมูลสุขภาพและเอกสารประกอบ:** ใบรับรองแพทย์สำหรับคำขอลาป่วย, เอกสารตรวจรักษากรณีลาคลอดบุตรหรือลาช่วยเหลือภริยา
5. **ข้อมูลทางเทคนิคและการจราจรทางคอมพิวเตอร์:** หมายเลข IP Address, ชนิดเบราว์เซอร์, บันทึกการเข้าสู่ระบบ (System Audit Log) ตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550

---

### 4. ระยะเวลาในการเก็บรักษาข้อมูลส่วนบุคคล (Retention Period)
1. **ข้อมูลการลาและประวัติราชการ:** เก็บรักษาไว้ตลอดระยะเวลารับราชการ และต่อเนื่องเป็นเวลา 10 ปี (120 เดือน) ตามรอบปีงบประมาณ นับจากสิ้นสุดสภาพการเป็นบุคลากร เพื่อการตรวจสอบสิทธิบำเหน็จบำนาญ
2. **ข้อมูลเวลาปฏิบัติราชการ:** เก็บรักษาไว้เป็นเวลา 5 ปี (60 เดือน) ตามปีงบประมาณ
3. **ข้อมูลระบบสารบรรณและทะเบียนหนังสือ:** เก็บรักษาไว้เป็นเวลา 10 ปี หรือโอนย้ายไปยังหอจดหมายเหตุแห่งชาติตามระเบียบงานสารบรรณ
4. **บันทึกการตรวจสอบความยินยอม (Consent & Privacy Audit Log):** เก็บรักษาไว้แบบไม่สามารถแก้ไขหรือลบได้ (Append-Only) เป็นเวลา 10 ปี เพื่อเป็นพยานหลักฐานทางกฎหมาย

---

### 5. การเปิดเผยข้อมูลส่วนบุคคลต่อหน่วยงานภายนอก
โรงเรียนจะเปิดเผยข้อมูลส่วนบุคคลของท่านเฉพาะเท่าที่จำเป็นต่อหน่วยงานที่มีอำนาจตามกฎหมาย ได้แก่:
1. สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี (สพม.อด.)
2. สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) และกระทรวงศึกษาธิการ
3. กรมบัญชีกลาง (สำหรับระบบจ่ายตรงเงินเดือนและค่าตอบแทน)
4. สำนักงานการตรวจเงินแผ่นดิน (สตง.) หรือสำนักงาน ป.ป.ช. กรณีมีการตรวจสอบตามกฎหมาย

---

### 6. สิทธิของเจ้าของข้อมูลส่วนบุคคลตามกฎหมาย PDPA
ท่านมีสิทธิตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล ดังนี้:
1. **สิทธิในการขอเข้าถึงและขอรับสำเนา (Right of Access):** ขอทราบหรือรับสำเนาข้อมูลส่วนบุคคลของท่านที่อยู่ในความรับผิดชอบของโรงเรียน
2. **สิทธิในการขอให้แก้ไขข้อมูลให้ถูกต้อง (Right to Rectification):** ดำเนินการแก้ไขข้อมูลส่วนบุคคลของท่านให้ถูกต้อง สมบูรณ์ และเป็นปัจจุบัน
3. **สิทธิในการคัดค้านหรือขอให้ลบ/ทำลาย (Right to Object / Right to Erasure):** ขอให้ลบ ทำลาย หรือระงับการใช้ข้อมูลส่วนบุคคล (ยกเว้นกรณีที่โรงเรียนต้องเก็บรักษาไว้ตามกฎหมายหรือภารกิจรัฐ)
4. **สิทธิในการถอนความยินยอม (Right to Withdraw Consent):** ถอนความยินยอมสำหรับบริการที่อาศัยฐานความยินยอมได้ตลอดเวลาผ่านศูนย์คุ้มครองข้อมูลส่วนบุคคล
5. **สิทธิในการร้องเรียน (Right to Lodge a Complaint):** ยื่นข้อร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) หากพบว่ามีการฝ่าฝืนหรือไม่ปฏิบัติตามกฎหมาย

---

### 7. มาตรการรักษาความมั่นคงปลอดภัยของข้อมูล
ระบบจัดให้มีมาตรการรักษาความมั่นคงปลอดภัยทางเทคนิคและการบริหารจัดการที่เหมาะสม (Technical & Organizational Measures) เช่น การเข้ารหัสข้อมูล (Encryption), การยืนยันตัวตนสองขั้นตอน, การควบคุมสิทธิ์ตามบทบาทหน้าที่ (Role-Based Access Control) และการบันทึกประวัติการเข้าถึงข้อมูลที่ป้องกันการแก้ไขเปลี่ยนแปลง (Append-Only Audit Trail)
`.trim();

const DEFAULT_TERMS = `
# เงื่อนไขและข้อกำหนดการใช้งานระบบสารสนเทศ (Terms of Use)
## โรงเรียนกุดจับประชาสรรค์

ยินดีต้อนรับสู่ระบบสารสนเทศเพื่อการบริหารจัดการสถานศึกษา โรงเรียนกุดจับประชาสรรค์ (KP e-Leave & School Operations Platform) การเข้าใช้งานระบบนี้ถือว่าท่านตกลงผูกพันและปฏิบัติตามเงื่อนไขและข้อตกลงการใช้งาน ดังต่อไปนี้:

---

### 1. ความรับผิดชอบในการรักษาความมั่นคงปลอดภัยของบัญชีผู้ใช้
1. ผู้ใช้งานต้องรับผิดชอบในการเก็บรักษารหัสผ่านและข้อมูลรับรองตัวตน (Credentials) เป็นความลับ ห้ามเปิดเผยหรือยินยอมให้บุคคลอื่นนำบัญชีไปใช้งานแทน
2. การกระทำใดๆ ที่เกิดขึ้นภายใต้บัญชีผู้ใช้งานของท่าน ให้ถือว่าเป็นการกระทำของท่านเองในฐานะเจ้าของบัญชี
3. หากพบว่าบัญชีของท่านถูกเข้าถึงโดยไม่ได้รับอนุญาต ต้องแจ้งต่อผู้ดูแลระบบของโรงเรียนในทันที

---

### 2. ข้อกำหนดการใช้งานและจริยธรรมในการปฏิบัติราชการ
1. ผู้ใช้งานต้องใช้ระบบเพื่อประโยชน์ในการปฏิบัติหน้าที่ทางราชการและการจัดการศึกษาของสถานศึกษาเท่านั้น
2. ห้ามมิให้นำข้อมูลเท็จ เอกสารปลอมแปลง หรือข้อมูลที่บิดเบือนเข้าสู่ระบบโดยเด็ดขาด
3. การยื่นคำขอลา การลงเวลาปฏิบัติราชการ และการลงนามในหนังสือราชการอิเล็กทรอนิกส์ ต้องเป็นไปตามความเป็นจริงและระเบียบวินัยของทางราชการ
4. การปลอมแปลงลายมือชื่ออิเล็กทรอนิกส์หรือนำลายมือชื่อของผู้อื่นไปใช้โดยมิชอบ มีความผิดทั้งทางวินัยและทางอาญา

---

### 3. การคุ้มครองข้อมูลความลับและข้อมูลส่วนบุคคล
1. ข้อมูลส่วนบุคคลของนักเรียน ผู้ปกครอง ครู และบุคลากรที่ปรากฏในระบบ ถือเป็นข้อมูลที่ได้รับการคุ้มครองตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
2. ผู้ใช้งานที่มีสิทธิ์เข้าถึงข้อมูล ต้องรักษาความลับและห้ามนำข้อมูลออกไปเผยแพร่ ทำซ้ำ ถ่ายภาพหน้าจอ หรือส่งต่อให้แก่บุคคลภายนอกโดยปราศจากอำนาจหน้าที่ตามกฎหมาย
3. ผู้ใดฝ่าฝืนทำให้ข้อมูลส่วนบุคคลรั่วไหล จะต้องรับผิดชอบตามกฎหมาย PDPA และระเบียบวินัยข้าราชการ

---

### 4. กฎหมายว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์
1. ระบบมีการบันทึกข้อมูลการจราจรทางคอมพิวเตอร์ (Log files) ตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 และที่แก้ไขเพิ่มเติม
2. ห้ามพยายามเจาะระบบ ขัดขวางการทำงาน หรือกระทำการใดๆ ที่ส่งผลให้ระบบไม่สามารถให้บริการได้ตามปกติ
3. การละเมิดข้อห้ามจะถูกดำเนินคดีตามกฎหมายอย่างเด็ดขาด

---

### 5. การระงับและการยกเลิกการให้บริการ
โรงเรียนกุดจับประชาสรรค์ขอสงวนสิทธิ์ในการระงับ ปิดกั้น หรือเพิกถอนสิทธิ์การเข้าใช้งานระบบของผู้ใช้งาน หากพบว่ามีการกระทำผิดเงื่อนไขการใช้งาน ฉ้อฉล ละเมิดวินัย หรือสิ้นสุดสภาพการเป็นบุคลากรของโรงเรียน
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

async function getSessionUserId(): Promise<string> {
  try {
    const headerList = await headers();
    if (headerList) {
      const session = await auth.api.getSession({ headers: headerList });
      if (session?.user?.id) {
        return session.user.id;
      }
    }
  } catch {
    // Outside request scope
  }
  throw new Error("Unauthorized: User session required");
}

async function getClientContext() {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  try {
    const resolvedHeaders = await headers();
    if (resolvedHeaders) {
      ipAddress = resolvedHeaders.get("x-forwarded-for") || resolvedHeaders.get("x-real-ip") || undefined;
      if (ipAddress && ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = resolvedHeaders.get("user-agent") || undefined;
    }
  } catch {
    // Outside request scope
  }

  return { ipAddress, userAgent };
}

export async function getUserPrivacyProfileForUser(userId: string) {
  if (!userId) {
    throw new Error("Unauthorized: User session required");
  }

  const acknowledgments = await prisma.policyAcknowledgment.findMany({
    where: { userId },
    include: {
      policyDocument: true,
    },
    orderBy: {
      acknowledgedAt: "desc",
    },
  });

  const currentPolicies = await fetchCurrentPolicies();

  const purposes = await prisma.processingPurpose.findMany({
    where: { active: true },
    include: {
      activity: true,
      dataCategoryPolicies: true,
    },
    orderBy: { code: "asc" },
  });

  const consentRecords = await prisma.consentRecord.findMany({
    where: { userId },
  });
  const consentRecordMap = new Map(consentRecords.map((c) => [c.purposeId, c]));

  const consentPurposes: Array<any> = [];
  const mandatoryPurposes: Array<any> = [];

  for (const purpose of purposes) {
    const requiresConsent = evaluatePurposeConsentRequirement(purpose.dataCategoryPolicies);
    const userConsent = consentRecordMap.get(purpose.id) || null;
    const item = {
      ...purpose,
      consent: userConsent,
    };
    if (requiresConsent) {
      consentPurposes.push(item);
    } else {
      mandatoryPurposes.push(item);
    }
  }

  return {
    userId,
    acknowledgments,
    currentPolicies,
    consentPurposes,
    mandatoryPurposes,
  };
}

export async function getUserPrivacyProfile() {
  const userId = await getSessionUserId();
  return await getUserPrivacyProfileForUser(userId);
}

export async function withdrawUserConsentForUser(params: {
  userId: string;
  purposeId: string;
  reasonCode: WithdrawalReasonCode;
  reasonDetail?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!params.userId) {
      return { success: false, error: "Unauthorized: User session required" };
    }

    await withdrawUserConsent({
      userId: params.userId,
      purposeId: params.purposeId,
      reasonCode: params.reasonCode,
      reasonDetail: params.reasonDetail,
      source: "PRIVACY_CENTER",
      correlationId: crypto.randomUUID(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("withdrawUserConsentForUser failed:", error);
    return { success: false, error: error.message };
  }
}

export async function withdrawUserConsentAction(params: {
  purposeId: string;
  reasonCode: WithdrawalReasonCode;
  reasonDetail?: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await getSessionUserId();
  const { ipAddress, userAgent } = await getClientContext();

  return await withdrawUserConsentForUser({
    userId,
    purposeId: params.purposeId,
    reasonCode: params.reasonCode,
    reasonDetail: params.reasonDetail,
    ipAddress,
    userAgent,
  });
}

export async function grantUserConsentForUser(params: {
  userId: string;
  purposeId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!params.userId) {
      return { success: false, error: "Unauthorized: User session required" };
    }

    const { notice } = await fetchCurrentPolicies();

    await recordUserConsent({
      userId: params.userId,
      purposeId: params.purposeId,
      consentFormVersion: "1.0",
      privacyNoticeVersion: notice.version,
      source: "PRIVACY_CENTER",
      correlationId: crypto.randomUUID(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { success: true };
  } catch (error: any) {
    console.error("grantUserConsentForUser failed:", error);
    return { success: false, error: error.message };
  }
}

export async function grantUserConsentAction(params: {
  purposeId: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await getSessionUserId();
  const { ipAddress, userAgent } = await getClientContext();

  return await grantUserConsentForUser({
    userId,
    purposeId: params.purposeId,
    ipAddress,
    userAgent,
  });
}

export async function getPublicPrivacyData() {
  const { notice } = await fetchCurrentPolicies();
  const ropaSummary = await getPublicRopaSummary();
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    settings = await prisma.systemSettings.findFirst();
  }

  // Query registered administrator to provide dynamic IT / DPO contact email
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { email: true, name: true }
  });

  const adminEmail = adminUser?.email || "kpschool_dpo@obec.moe.go.th";
  const adminName = adminUser?.name || "เจ้าหน้าที่สารสนเทศและคุ้มครองข้อมูลส่วนบุคคล";

  const safeSettings = settings
    ? {
        schoolName: settings.schoolName,
        subheader: settings.subheader,
        affiliation: settings.affiliation,
        logoUrl: settings.logoUrl,
        footerText: settings.footerText,
        adminEmail,
        adminName,
      }
    : {
        schoolName: "โรงเรียนกุดจับประชาสรรค์",
        subheader: "ระบบบริหารจัดการสถานศึกษา",
        affiliation: "สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี",
        logoUrl: "",
        footerText: "",
        adminEmail,
        adminName,
      };

  // Dynamically resolve template variables so notice matches active school settings and admin email
  const resolvedNotice = notice
    ? {
        ...notice,
        contentMarkdown: notice.contentMarkdown
          .replaceAll("kpschool_dpo@obec.moe.go.th", adminEmail)
          .replaceAll("โรงเรียนกุดจับประชาสรรค์", safeSettings.schoolName)
          .replaceAll("สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี", safeSettings.affiliation)
          .replaceAll("KP e-Leave & School Operations Platform", `${safeSettings.schoolName} (${safeSettings.subheader || "ระบบบริหารจัดการสถานศึกษา"})`),
      }
    : null;

  return {
    notice: resolvedNotice,
    ropaSummary,
    settings: safeSettings,
  };
}


