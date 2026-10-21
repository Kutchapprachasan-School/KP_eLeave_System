import { prisma } from "@/lib/db";

/**
 * Send a LINE message using LINE Messaging API (LINE OA).
 * Requires lineChannelAccessToken and lineTargetGroupId from SystemSettings.
 */

/**
 * Resolves all recipient user IDs for leave submission notifications:
 * 1. เจ้าหน้าที่ตรวจสอบ (Inspector): defaultInspectorId, dutyType 'INSPECTOR', positions
 * 2. หัวหน้าบุคคล (HR Head): dutyType 'HR_HEAD', 'DIVISION_HEAD' with divisionScope 'PERSONNEL', positions
 * 3. ผู้อำนวยการ (Director): finalApproverUserIds, role 'DIRECTOR', positions
 * 4. แอดมิน (Admin): role 'ADMIN', positions
 */
export async function getLeaveApprovalChainUserIds(): Promise<string[]> {
  const targetUserIds = new Set<string>();

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { defaultInspectorId: true, finalApproverUserIds: true },
    });

    if (settings?.defaultInspectorId) {
      targetUserIds.add(settings.defaultInspectorId.trim());
    }

    if (settings?.finalApproverUserIds) {
      settings.finalApproverUserIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => targetUserIds.add(id));
    }

    // Active duty assignments for INSPECTOR, HR_HEAD, DIVISION_HEAD (PERSONNEL)
    const duties = await prisma.userDutyAssignment.findMany({
      where: {
        revokedAt: null,
        OR: [
          { dutyType: 'INSPECTOR' },
          { dutyType: 'HR_HEAD' },
          { dutyType: 'DIVISION_HEAD', divisionScope: 'PERSONNEL' },
        ],
      },
      select: { userId: true },
    });
    duties.forEach((d) => targetUserIds.add(d.userId));

    // Role & position matches for Admin, Director, HR Head, Inspector
    const users = await prisma.user.findMany({
      where: {
        isApproved: true,
        OR: [
          { role: { in: ['ADMIN', 'DIRECTOR'] } },
          {
            position: {
              in: [
                'แอดมิน',
                'ผู้ดูแลระบบ',
                'ผู้อำนวยการ',
                'รักษาการผู้อำนวยการ',
                'รักษาการในตำแหน่งผู้อำนวยการ',
                'ผู้อำนวยการโรงเรียน',
                'หัวหน้างานบุคคล',
                'หัวหน้าฝ่ายบุคคล',
                'หัวหน้ากลุ่มบริหารงานบุคคล',
                'ผู้ตรวจสอบ',
                'เจ้าหน้าที่ตรวจสอบ',
              ],
            },
          },
        ],
      },
      select: { id: true },
    });
    users.forEach((u) => targetUserIds.add(u.id));
  } catch (err) {
    console.error('[getLeaveApprovalChainUserIds] Error resolving chain:', err);
  }

  return Array.from(targetUserIds);
}

/**
 * Send targeted LINE notification for new leave submissions:
 * Only notifies Inspector, HR Head, Director, and Admin on their phones.
 * NEVER sends to the all-staff general group (lineTargetGroupId).
 */
export async function sendLeaveSubmissionTargetedNotification(message: string, requesterUserId?: string) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: {
        lineChannelAccessToken: true,
        enableLineNotify: true,
        leaveApproverLineTargetGroupId: true,
      },
    });

    if (settings?.enableLineNotify === false) {
      return;
    }

    const token = settings?.lineChannelAccessToken?.trim();
    if (!token) {
      return;
    }

    // 1. Send to dedicated approver LINE group if configured
    const approverGroupId = (settings as any)?.leaveApproverLineTargetGroupId?.trim();
    if (approverGroupId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            to: approverGroupId,
            messages: [{ type: 'text', text: message }],
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error('[LINE OA Approver Group] Failed:', res.status, await res.text());
        }
      } catch (err) {
        console.error('[LINE OA Approver Group] Push error:', err);
      } finally {
        clearTimeout(timeout);
      }
    }

    // 2. Direct Push / Multicast to target approvers who have lineUserId linked
    const targetUserIds = await getLeaveApprovalChainUserIds();
    // Exclude requester so they don't get alerted about their own submission if they are an admin/approver
    const filteredUserIds = requesterUserId ? targetUserIds.filter(id => id !== requesterUserId) : targetUserIds;

    if (filteredUserIds.length > 0) {
      const approversWithLine = await prisma.user.findMany({
        where: {
          id: { in: filteredUserIds },
          lineUserId: { not: null },
        },
        select: { lineUserId: true },
      });

      const lineUserIds = Array.from(
        new Set(
          approversWithLine
            .map((u) => u.lineUserId?.trim())
            .filter((id): id is string => Boolean(id && id.length > 0))
        )
      );

      if (lineUserIds.length > 0) {
        for (let i = 0; i < lineUserIds.length; i += 500) {
          const chunk = lineUserIds.slice(i, i + 500);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          try {
            const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token,
              },
              body: JSON.stringify({
                to: chunk,
                messages: [{ type: 'text', text: message }],
              }),
              signal: controller.signal,
            });
            if (!res.ok) {
              console.error('[LINE Multicast Approvers] Failed:', res.status, await res.text());
            }
          } catch (err) {
            console.error('[LINE Multicast Approvers] Error:', err);
          } finally {
            clearTimeout(timeout);
          }
        }
      }
    }
  } catch (error) {
    console.error('[sendLeaveSubmissionTargetedNotification] Error:', error);
  }
}

/**
 * Send targeted LINE notification when a leave is approved or rejected:
 * Notifies the requester directly via personal LINE (if linked),
 * and notifies the approver group (if configured).
 */
export async function sendLeaveApprovalTargetedNotification(
  action: 'APPROVE' | 'REJECT',
  requesterUserId: string,
  message: string
) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: {
        lineChannelAccessToken: true,
        enableLineNotify: true,
        leaveApproverLineTargetGroupId: true,
      },
    });

    if (settings?.enableLineNotify === false) {
      return;
    }

    const token = settings?.lineChannelAccessToken?.trim();
    if (!token) {
      return;
    }

    // 1. Direct Push to requester if lineUserId is linked
    if (requesterUserId) {
      const requester = await prisma.user.findUnique({
        where: { id: requesterUserId },
        select: { lineUserId: true },
      });

      if (requester?.lineUserId?.trim()) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({
              to: requester.lineUserId.trim(),
              messages: [{ type: 'text', text: message }],
            }),
            signal: controller.signal,
          });
          if (!res.ok) {
            console.error('[LINE OA Requester Push] Failed:', res.status, await res.text());
          }
        } catch (err) {
          console.error('[LINE OA Requester Push] Error:', err);
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    // 2. Also notify the approver group if configured
    const approverGroupId = (settings as any)?.leaveApproverLineTargetGroupId?.trim();
    if (approverGroupId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            to: approverGroupId,
            messages: [{ type: 'text', text: message }],
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error('[LINE OA Approver Group] Failed:', res.status, await res.text());
        }
      } catch (err) {
        console.error('[LINE OA Approver Group] Push error:', err);
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (error) {
    console.error('[sendLeaveApprovalTargetedNotification] Error:', error);
  }
}

export async function sendLineNotify(message: string) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { lineChannelAccessToken: true, lineTargetGroupId: true, enableLineNotify: true },
    });

    if (settings?.enableLineNotify === false) {
      // LINE Notify disabled by toggle — skip silently
      return;
    }

    const token = settings?.lineChannelAccessToken;
    const targetId = settings?.lineTargetGroupId;
    
    if (!token || !targetId || token.trim() === "" || targetId.trim() === "") {
      // No token or target configured — skip silently
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[LINE OA] Failed:", res.status, await res.text());
    }
  } catch (error) {
    console.error("[LINE OA] Error:", error);
  }
}

/**
 * Helper to format a leave notification message in Thai.
 */
export function formatLeaveMessage(
  action: "CREATE" | "APPROVE" | "REJECT" | "CANCEL" | "DELETE",
  userName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason?: string,
  options?: {
    subjectGroup?: string;
    actorName?: string;
    statusText?: string;
    requestedDays?: number;
  }
): string {
  const typeMap: Record<string, string> = {
    SICK: "ลาป่วย",
    MATERNITY: "ลาคลอดบุตร",
    PATERNITY: "ลาช่วยเหลือภริยาคลอดบุตร",
    PERSONAL: "ลากิจส่วนตัว",
    VACATION: "ลาพักผ่อน",
    ORDINATION: "ลาอุปสมบท/ฮัจญ์",
    MILITARY: "ลาเข้ารับการตรวจเลือกหรือเตรียมพล",
    STUDY: "ลาศึกษาต่อ/ฝึกอบรม/ดูงาน",
    INTERNATIONAL: "ลาไปปฏิบัติงานในองค์การระหว่างประเทศ",
    SPOUSE: "ลาติดตามคู่สมรส",
    REHABILITATION: "ลาฟื้นฟูสมรรถภาพด้านอาชีพ",
  };
  const typeName = typeMap[leaveType] || leaveType;

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const fStart = formatThaiDate(startDate);
  const fEnd = formatThaiDate(endDate);
  
  const safeReason = reason ? reason.substring(0, 500) : undefined;
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://your-domain.com");

  if (action === "DELETE") {
    return `🚨 มีการลบข้อมูลใบลาที่อนุมัติแล้ว!
------------------
ชื่อครูผู้ลา: ${userName}
ประเภท: ${typeName}
วันที่ลา: ${fStart} ถึง ${fEnd}
สถานะก่อนลบ: ✅ อนุมัติแล้ว
ผู้ลบรายการ: ${options?.actorName || "แอดมิน"}
------------------
⚠️ แจ้งเตือนเพื่อความโปร่งใสในระบบ`;
  }

  if (action === "CREATE") {
    let header = `🔔 มีคำขอลาใหม่!`;
    if (options?.subjectGroup) {
      header += ` (รอหัวหน้างานบุคคลอนุมัติ)`;
    } else {
      header += ` (รอผู้อำนวยการอนุมัติ)`;
    }
    
    const daysLine = options?.requestedDays !== undefined ? `จำนวนวันลา: ${options.requestedDays} วัน\n` : '';
    
    return `${header}
------------------
ชื่อ: ${userName}
${options?.subjectGroup ? `กลุ่มสาระฯ: ${options.subjectGroup}\n` : ''}ประเภท: ${typeName}
${daysLine}วันที่ลา: ${fStart} ถึง ${fEnd}
เหตุผล: ${safeReason || "-"}
------------------
โปรดตรวจสอบในระบบ: ${appUrl}/approvals`;
  } else {
    return `📋 อัปเดตสถานะการลา
------------------
ชื่อ: ${userName}
ประเภท: ${typeName}
วันที่ลา: ${fStart} ถึง ${fEnd}
สถานะ: ${options?.statusText || (action === "APPROVE" ? "✅ อนุมัติเรียบร้อยแล้ว" : action === "REJECT" ? "❌ ปฏิเสธการลา" : "🚫 ยกเลิกการลา")}
ผู้ทำรายการ: ${options?.actorName || "-"}
------------------`;
  }
}

const CATEGORY_THAI_MAP: Record<string, string> = {
  ELECTRICAL: "ไฟฟ้า",
  PLUMBING: "ประปา",
  BUILDING: "อาคาร/โครงสร้าง",
  IT: "อุปกรณ์ IT",
  EQUIPMENT: "ครุภัณฑ์/เฟอร์นิเจอร์",
  OTHER: "อื่น ๆ",
};

/**
 * Helper to send LINE notification for Repair requests.
 */
export async function sendRepairLineNotify(
  action: "CREATE" | "ASSIGN" | "START" | "COMPLETE" | "CANCEL",
  repair: {
    repairNo: string;
    title: string;
    description?: string;
    location: string;
    requesterName?: string;
    category?: string;
    categoryName?: string;
    urgency?: string;
    assigneeName?: string;
    resolutionNote?: string;
    cancelReason?: string;
  }
) {
  // Check dynamic settings toggle for repair notifications
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { rolePermissions: true },
    });
    if (settings?.rolePermissions) {
      const parsed = JSON.parse(settings.rolePermissions);
      if (action === "CREATE" && parsed.repairNotifyOnCreate === false) return;
      if (action === "ASSIGN" && parsed.repairNotifyOnAssign === false) return;
      if (action === "START" && parsed.repairNotifyOnStart === false) return;
      if (action === "COMPLETE" && parsed.repairNotifyOnComplete === false) return;
      if (action === "CANCEL" && parsed.repairNotifyOnCancel === false) return;
    }
  } catch (e) {
    console.error("Failed to check repair notification settings:", e);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://e-leave-system-kappa.vercel.app");

  const catText = repair.categoryName || (repair.category ? CATEGORY_THAI_MAP[repair.category] || repair.category : "-");

  let msg = "";
  if (action === "CREATE") {
    msg = `🛠️ มีคำขอแจ้งซ่อมใหม่!
------------------
เลขที่คำขอ: ${repair.repairNo}
หัวข้อ: ${repair.title}
ประเภท: ${catText}
สถานที่/ห้อง: ${repair.location}
ผู้แจ้ง: ${repair.requesterName || "-"}
รายละเอียดปัญหา: ${repair.description || "-"}
ความเร่งด่วน: ${repair.urgency || "ปกติ"}
------------------
โปรดตรวจสอบและมอบหมายช่างในระบบ: ${appUrl}/repair`;
  } else if (action === "ASSIGN") {
    msg = `👨‍🔧 อัปเดตการมอบหมายงานซ่อม!
------------------
เลขที่คำขอ: ${repair.repairNo}
หัวข้อ: ${repair.title}
ประเภท: ${catText}
สถานที่/ห้อง: ${repair.location}
ผู้แจ้ง: ${repair.requesterName || "-"}
ช่างผู้รับผิดชอบ: ${repair.assigneeName || "-"}
สถานะ: มอบหมายงานเรียบร้อย
------------------
เข้าดูรายการซ่อม: ${appUrl}/repair`;
  } else if (action === "START") {
    msg = `🔧 ช่างเริ่มดำเนินการซ่อมแซมแล้ว!
------------------
เลขที่คำขอ: ${repair.repairNo}
หัวข้อ: ${repair.title}
ผู้แจ้ง: ${repair.requesterName || "-"}
ช่างผู้ซ่อม: ${repair.assigneeName || "-"}
สถานะ: กำลังดำเนินการซ่อม
------------------`;
  } else if (action === "COMPLETE") {
    msg = `✅ ดำเนินการซ่อมแซมเสร็จสิ้น!
------------------
เลขที่คำขอ: ${repair.repairNo}
หัวข้อ: ${repair.title}
ผู้แจ้ง: ${repair.requesterName || "-"}
ช่างผู้ซ่อม: ${repair.assigneeName || "-"}
ผลการซ่อม: ${repair.resolutionNote || "เสร็จสิ้นเรียบร้อย"}
สถานะ: เสร็จสิ้น
------------------
ดูรายละเอียดในระบบ: ${appUrl}/repair`;
  } else if (action === "CANCEL") {
    msg = `🚫 ยกเลิกคำขอแจ้งซ่อม
------------------
เลขที่คำขอ: ${repair.repairNo}
หัวข้อ: ${repair.title}
ผู้แจ้ง: ${repair.requesterName || "-"}
เหตุผลที่ยกเลิก: ${repair.cancelReason || "-"}
สถานะ: ยกเลิกคำขอ
------------------`;
  }

  if (msg) {
    await sendRepairLineMessage(msg);
  }
}

/**
 * Send a LINE message using repair-specific LINE OA credentials.
 * Falls back to the shared leave LINE OA if repair-specific ones are not configured.
 */
async function sendRepairLineMessage(message: string) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        repairLineChannelAccessToken: true,
        repairLineTargetGroupId: true,
        enableRepairLineNotify: true,
        lineChannelAccessToken: true,
        lineTargetGroupId: true,
      },
    });

    if (settings?.enableRepairLineNotify === false) return;

    // Use repair-specific tokens; fall back to shared leave tokens
    const token = settings?.repairLineChannelAccessToken?.trim() || settings?.lineChannelAccessToken?.trim();
    const targetId = settings?.repairLineTargetGroupId?.trim() || settings?.lineTargetGroupId?.trim();

    if (!token || !targetId) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: "text", text: message }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[LINE OA Repair] Failed:", res.status, await res.text());
    }
  } catch (error) {
    console.error("[LINE OA Repair] Error:", error);
  }
}
