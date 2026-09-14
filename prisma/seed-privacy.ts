import { prisma } from "../src/lib/db.ts";
import {
  DataCategoryType,
  LegalBasisType,
  Section26ConditionType,
  RetentionRuleType,
  DisposalMethod,
  PrismaClient,
} from "@prisma/client";

export interface RopaSeedActivity {
  code: string;
  module: string;
  name: string;
  description: string;
  controllerName?: string;
  dpoContact?: string;
  dataSubjectCategory: string;
  retentionRuleType: RetentionRuleType;
  retentionDurationMonths: number;
  retentionAuthority: string;
  disposalMethod: DisposalMethod;
  recipientsSummary: string;
  crossBorderTransfer?: boolean;
  crossBorderDetails?: string | null;
  active?: boolean;
  purposes: Array<{
    code: string;
    name: string;
    description: string;
    active?: boolean;
    policies: Array<{
      dataCategory: DataCategoryType;
      legalBasis: LegalBasisType;
      section26Condition?: Section26ConditionType | null;
      statutoryReference?: string | null;
      isMandatoryForOperation?: boolean;
    }>;
  }>;
}

export const BASELINE_ROPA_ACTIVITIES: RopaSeedActivity[] = [
  {
    code: "PA_LEAVE_MANAGEMENT",
    module: "LEAVE",
    name: "การบริหารจัดการการลาของบุคลากร",
    description: "ประมวลผลข้อมูลคำขอลา อนุมัติการลา และประวัติวันลาตามระเบียบข้าราชการ",
    controllerName: "โรงเรียนกุดจับประชาสรรค์",
    dpoContact: "kpschool_dpo@obec.moe.go.th",
    dataSubjectCategory: "ข้าราชการครู บุคลากรทางการศึกษา และลูกจ้าง",
    retentionRuleType: RetentionRuleType.FISCAL_YEAR_BASED,
    retentionDurationMonths: 120,
    retentionAuthority: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555",
    disposalMethod: DisposalMethod.SECURE_DESTROY,
    recipientsSummary: "ผู้บังคับบัญชาตามสายงาน, ผู้อำนวยการสถานศึกษา, สพม.อุดรธานี",
    crossBorderTransfer: false,
    crossBorderDetails: null,
    active: true,
    purposes: [
      {
        code: "PURPOSE_LEAVE_APPLICATION",
        name: "การยื่นและพิจารณาอนุมัติคำขอลาตามระเบียบราชการ",
        description: "ตรวจสอบสิทธิวันลา บันทึกสถิติการปฏิบัติงาน และออกใบอนุญาตการลาตามระเบียบข้าราชการ",
        active: true,
        policies: [
          {
            dataCategory: DataCategoryType.GENERAL_IDENTITY,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: null,
            statutoryReference: "พ.ร.บ. ระเบียบข้าราชการครูและบุคลากรทางการศึกษา พ.ศ. 2547",
            isMandatoryForOperation: true,
          },
          {
            dataCategory: DataCategoryType.EMPLOYMENT_RECORD,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: null,
            statutoryReference: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555",
            isMandatoryForOperation: true,
          },
          {
            dataCategory: DataCategoryType.DOCUMENT_ATTACHMENT,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: null,
            statutoryReference: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (เอกสารหลักฐาน)",
            isMandatoryForOperation: false,
          },
          {
            dataCategory: DataCategoryType.SENSITIVE_HEALTH,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: Section26ConditionType.LABOR_AND_SOCIAL_SECURITY_LAW,
            statutoryReference: "มาตรา 26 (5) (ก) พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (กฎหมายแรงงานและการคุ้มครองทางสังคม)",
            isMandatoryForOperation: true,
          },
        ],
      },
    ],
  },
  {
    code: "PA_SARABAN",
    module: "SARABAN",
    name: "ระบบงานสารบรรณอิเล็กทรอนิกส์และส่งหนังสือราชการ",
    description: "การรับ-ส่ง ทะเบียนหนังสือราชการ การเวียนหนังสือ และการออกเลขหนังสือราชการ",
    controllerName: "โรงเรียนกุดจับประชาสรรค์",
    dpoContact: "kpschool_dpo@obec.moe.go.th",
    dataSubjectCategory: "ข้าราชการครู บุคลากรทางการศึกษา และบุคคลภายนอกผู้ติดต่อราชการ",
    retentionRuleType: RetentionRuleType.FISCAL_YEAR_BASED,
    retentionDurationMonths: 120,
    retentionAuthority: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม",
    disposalMethod: DisposalMethod.TRANSFER_TO_NATIONAL_ARCHIVES,
    recipientsSummary: "กลุ่มงานภายในสถานศึกษา, สพม.อุดรธานี, สพฐ., หน่วยงานราชการภายนอก",
    crossBorderTransfer: false,
    crossBorderDetails: null,
    active: true,
    purposes: [
      {
        code: "PURPOSE_OFFICIAL_DISPATCH",
        name: "การจัดทำ ทะเบียน และรับ-ส่งหนังสือราชการ",
        description: "ประมวลผลข้อมูลสารบรรณเพื่อประโยชน์ในการบริหารราชการแผ่นดินและการติดต่อราชการ",
        active: true,
        policies: [
          {
            dataCategory: DataCategoryType.GENERAL_IDENTITY,
            legalBasis: LegalBasisType.PUBLIC_TASK,
            section26Condition: null,
            statutoryReference: "พ.ร.บ. ระเบียบบริหารราชการกระทรวงศึกษาธิการ พ.ศ. 2546",
            isMandatoryForOperation: true,
          },
          {
            dataCategory: DataCategoryType.DOCUMENT_ATTACHMENT,
            legalBasis: LegalBasisType.PUBLIC_TASK,
            section26Condition: null,
            statutoryReference: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526",
            isMandatoryForOperation: true,
          },
        ],
      },
    ],
  },
  {
    code: "PA_ATTENDANCE",
    module: "ATTENDANCE",
    name: "ระบบลงเวลาปฏิบัติราชการและติดตามการมาทำงาน",
    description: "การบันทึกเวลาปฏิบัติงาน เข้า-ออกสถานศึกษา การตรวจจับพิกัด และการตรวจสอบการปฏิบัติราชการ",
    controllerName: "โรงเรียนกุดจับประชาสรรค์",
    dpoContact: "kpschool_dpo@obec.moe.go.th",
    dataSubjectCategory: "ข้าราชการครูและบุคลากรทางการศึกษา",
    retentionRuleType: RetentionRuleType.FISCAL_YEAR_BASED,
    retentionDurationMonths: 60,
    retentionAuthority: "ระเบียบกระทรวงศึกษาธิการว่าด้วยการลงเวลาปฏิบัติราชการ",
    disposalMethod: DisposalMethod.SECURE_DESTROY,
    recipientsSummary: "ฝ่ายบริหารสถานศึกษา, งานบุคคล, สพม.อุดรธานี",
    crossBorderTransfer: false,
    crossBorderDetails: null,
    active: true,
    purposes: [
      {
        code: "PURPOSE_TIME_ATTENDANCE",
        name: "การบันทึกและตรวจสอบเวลาปฏิบัติราชการ",
        description: "ตรวจสอบความถูกต้องของการปฏิบัติงานตามระเบียบวินัยทางราชการ",
        active: true,
        policies: [
          {
            dataCategory: DataCategoryType.GENERAL_IDENTITY,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: null,
            statutoryReference: "พ.ร.บ. ระเบียบข้าราชการครูและบุคลากรทางการศึกษา พ.ศ. 2547",
            isMandatoryForOperation: true,
          },
          {
            dataCategory: DataCategoryType.GEOLOCATION,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: null,
            statutoryReference: "ระเบียบว่าด้วยการควบคุมการลงเวลาปฏิบัติราชการ",
            isMandatoryForOperation: true,
          },
          {
            dataCategory: DataCategoryType.SYSTEM_AUDIT_LOG,
            legalBasis: LegalBasisType.LEGAL_OBLIGATION,
            section26Condition: null,
            statutoryReference: "พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550",
            isMandatoryForOperation: true,
          },
        ],
      },
    ],
  },
  {
    code: "PA_LINE_NOTIF",
    module: "NOTIFICATIONS",
    name: "ระบบแจ้งเตือนผ่านช่องทาง LINE",
    description: "บริการแจ้งเตือนสถานะคำขอลาและการอนุมัติหนังสือผ่านช่องทาง LINE Messaging API เพื่อความสะดวกของผู้ใช้งาน",
    controllerName: "โรงเรียนกุดจับประชาสรรค์",
    dpoContact: "kpschool_dpo@obec.moe.go.th",
    dataSubjectCategory: "ข้าราชการครูและบุคลากรทางการศึกษาที่สมัครใจใช้บริการแจ้งเตือน",
    retentionRuleType: RetentionRuleType.EVENT_BASED,
    retentionDurationMonths: 36,
    retentionAuthority: "ความยินยอมของเจ้าของข้อมูลส่วนบุคคล (PDPA Section 19)",
    disposalMethod: DisposalMethod.PERMANENT_ANONYMIZE,
    recipientsSummary: "LINE Corporation (Cloud Service Provider ภายใต้สัญญาประมวลผลข้อมูล), ผู้ใช้งานปลายทาง",
    crossBorderTransfer: false,
    crossBorderDetails: null,
    active: true,
    purposes: [
      {
        code: "PURPOSE_LINE_NOTIFICATION",
        name: "การส่งข้อมูลการแจ้งเตือนสถานะเอกสารผ่านแอปพลิเคชัน LINE",
        description: "เชื่อมต่อ LINE User ID เพื่อส่งการแจ้งเตือนส่วนบุคคลตามความสมัครใจ",
        active: true,
        policies: [
          {
            dataCategory: DataCategoryType.CONTACT_INFO,
            legalBasis: LegalBasisType.CONSENT,
            section26Condition: null,
            statutoryReference: "พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 มาตรา 19",
            isMandatoryForOperation: false,
          },
        ],
      },
    ],
  },
];

export async function seedPrivacyGovernance(client: PrismaClient = prisma) {
  console.log("🔒 Seeding School Operations ROPA Registry & Purpose Governance...");

  for (const act of BASELINE_ROPA_ACTIVITIES) {
    const activity = await client.processingActivity.upsert({
      where: { code: act.code },
      update: {
        module: act.module,
        name: act.name,
        description: act.description,
        controllerName: act.controllerName ?? "โรงเรียนกุดจับประชาสรรค์",
        dpoContact: act.dpoContact ?? "kpschool_dpo@obec.moe.go.th",
        dataSubjectCategory: act.dataSubjectCategory,
        retentionRuleType: act.retentionRuleType,
        retentionDurationMonths: act.retentionDurationMonths,
        retentionAuthority: act.retentionAuthority,
        disposalMethod: act.disposalMethod,
        recipientsSummary: act.recipientsSummary,
        crossBorderTransfer: act.crossBorderTransfer ?? false,
        crossBorderDetails: act.crossBorderDetails,
        active: act.active ?? true,
      },
      create: {
        code: act.code,
        module: act.module,
        name: act.name,
        description: act.description,
        controllerName: act.controllerName ?? "โรงเรียนกุดจับประชาสรรค์",
        dpoContact: act.dpoContact ?? "kpschool_dpo@obec.moe.go.th",
        dataSubjectCategory: act.dataSubjectCategory,
        retentionRuleType: act.retentionRuleType,
        retentionDurationMonths: act.retentionDurationMonths,
        retentionAuthority: act.retentionAuthority,
        disposalMethod: act.disposalMethod,
        recipientsSummary: act.recipientsSummary,
        crossBorderTransfer: act.crossBorderTransfer ?? false,
        crossBorderDetails: act.crossBorderDetails,
        active: act.active ?? true,
      },
    });

    for (const purp of act.purposes) {
      const purpose = await client.processingPurpose.upsert({
        where: { code: purp.code },
        update: {
          activityId: activity.id,
          name: purp.name,
          description: purp.description,
          active: purp.active ?? true,
        },
        create: {
          activityId: activity.id,
          code: purp.code,
          name: purp.name,
          description: purp.description,
          active: purp.active ?? true,
        },
      });

      for (const pol of purp.policies) {
        await client.processingDataCategoryPolicy.upsert({
          where: {
            purposeId_dataCategory_legalBasis: {
              purposeId: purpose.id,
              dataCategory: pol.dataCategory,
              legalBasis: pol.legalBasis,
            },
          },
          update: {
            section26Condition: pol.section26Condition ?? null,
            statutoryReference: pol.statutoryReference ?? null,
            isMandatoryForOperation: pol.isMandatoryForOperation ?? true,
          },
          create: {
            purposeId: purpose.id,
            dataCategory: pol.dataCategory,
            legalBasis: pol.legalBasis,
            section26Condition: pol.section26Condition ?? null,
            statutoryReference: pol.statutoryReference ?? null,
            isMandatoryForOperation: pol.isMandatoryForOperation ?? true,
          },
        });
      }
    }
  }

  console.log("✅ Seeded ROPA activities, purposes, and data category policies successfully.");
}

// Allow direct execution: node --experimental-strip-types prisma/seed-privacy.ts
if (process.argv[1]?.includes("seed-privacy")) {
  seedPrivacyGovernance()
    .then(() => {
      console.log("🎉 Privacy seeding finished.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Privacy seeding error:", error);
      process.exit(1);
    });
}
