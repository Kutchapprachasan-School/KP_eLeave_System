# แผนการปรับปรุงระบบแจ้งเตือนการลา: ป้องกันโควต้า LINE เต็มด้วยระบบ Web Push และ Admin Notification Policy Matrix (v1.3 / Rev. 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

### 📋 ตารางประวัติการแก้ไข (Revision History Table)

| Version / Rev | วันที่ / เวลา | การเปลี่ยนแปลงสำคัญ (Changelog) | สถานะ (Status) |
|---|---|---|---|
| `v1.0 (Rev. 0)` | 2026-10-27 16:35 | แผนร่างเริ่มต้นสำหรับการปรับปรุงระบบแจ้งเตือนการลา | Superseded |
| `v1.1 (Rev. 1)` | 2026-10-27 16:45 | เพิ่มจุดเฝ้าระวังเชิงเทคนิค 3 ข้อ และบรรจุบล็อกโค้ดพร้อมใช้งาน | Superseded |
| `v1.2 (Rev. 2)` | 2026-10-28 08:35 | ปรับปรุงโค้ดให้สอดคล้องกับ Codebase จริง 9 ประเด็น (Better-Auth, RecycleBin, ฟังก์ชัน LINE Push, ฯลฯ) | Superseded |
| `v1.3 (Rev. 3)` | 2026-10-28 08:40 | **เพิ่มจุดเฝ้าระวังข้อที่ 10 (Surgical Insertion ใน `settings/page.tsx`)** พร้อมออกแบบ `<NotificationPolicyMatrixTab />` ให้เป็น **Self-loading Component** เพื่อแทรกโค้ดแบบผ่าตัดเฉพาะจุด (~L4025-4030) โดยไม่กระทบ State เดิมของหน้าการตั้งค่าขนาด 11,000+ บรรทัด | Ready for Implementation |

---

## 🔍 ตารางจุดเฝ้าระวังเชิงเทคนิค 10 ข้อ (Pre-Flight Technical Safeguards)

| # | ประเด็นเฝ้าระวัง | ความเสี่ยงที่อาจพบ | แนวทางป้องกันที่ล็อกไว้ในโค้ด (Invariants) |
|---|---|---|---|
| **1** | **Authentication** | ใช้ `next-auth` แล้วหาโมดูลไม่เจอ | ใช้ `import { getSession } from "@/lib/auth-session"` (Better-Auth) |
| **2** | **สิทธิ์แอดมิน (RBAC)** | เช็กแค่ `role === "ADMIN"` ทำให้แอดมินตามตำแหน่งหลุด | ตรวจสอบผ่าน `verifySettingsAdminAccess` ครอบคลุมทั้ง Role, Position ("แอดมิน"), และ `userDutyAssignment` |
| **3** | **LINE Push Helper** | `sendLinePushMessage` ไม่มีอยู่จริงในระบบ | สร้างและ Export `sendLinePushMessage(to, msg)` ใน `src/lib/line-notify.ts` โดยดึง Token จาก `id: "default"` |
| **4** | **การลบใบลา** | ใช้ `prisma.delete` ข้ามถังขยะและติด `P2003` | คง `RecycleBinService.softDelete` เดิมไว้ 100% แล้วตัดเฉพาะ `sendLineNotify` ออก และเสริม Structured Forensic Log |
| **5** | **Revalidation Paths** | Revalidate แค่ `/leave` ทำให้ข้อมูลหน้าอื่นค้าง | สั่ง Revalidate ครบทั้ง 4 หน้าจริง: `/history`, `/dashboard`, `/approvals`, `/reports` |
| **6** | **Web Push Deep Link** | ชี้ไป `/leave?id=...` ซึ่ง redirect ไปหน้าเขียนใบลา | แยกชัดเจน: ผู้อนุมัติ (`SUBMIT`, `APPROVAL_STEP`) ไป `/approvals` ส่วนผู้ยื่นคำขอไป `/history` |
| **7** | **ไอคอนแจ้งเตือน** | ใช้ `/icons/icon-192x192.png` ซึ่งไม่มีไฟล์จริง | ใช้ `/icon.png` ที่มีอยู่จริงในโฟลเดอร์ `public/` |
| **8** | **Singleton `SystemSettings`** | ใช้ `findFirst()` แล้ว update ด้วย id ผิด | ใช้ Singleton `where: { id: "default" }` และ `upsert` เสมอ |
| **9** | **การรัน Unit Test** | รันด้วย `tsx` ซึ่งไม่มีใน dependencies | ใช้ `node --experimental-strip-types --test eLeave/tests/unit/leaveNotificationPolicy.test.js` ตาม `package.json` |
| **10** | **หน้า `/settings` ขนาดใหญ่** | เขียนทับโครงสร้างหน้าจอขนาด 11,000+ บรรทัด | ทำ `<NotificationPolicyMatrixTab />` เป็น **Self-loading** แล้วแทรกแบบผ่าตัดเฉพาะจุด (Surgical Insertion) ที่ ~L4025-4030 |

---

## 🎯 1. Goal, Architecture & Tech Stack

**Goal:** ป้องกันปัญหาโควต้าข้อความ LINE Official Account เต็มทุกเดือน โดยการเปลี่ยนกระบวนการแจ้งเตือนการลาให้รองรับ **Web Push Notifications (ฟรี ไม่จำกัดจำนวนครั้ง และแจ้งเตือนครบทุกขั้นตอน)** ควบคู่ไปกับการควบคุมข้อความ LINE ให้อยู่ในโหมดประหยัดโควต้า (ส่งเฉพาะคนละ 1 ข้อความต่อการลา และตัดการส่ง LINE เมื่อลบใบลาเปลี่ยนไปบันทึก Forensic Audit Log แทน) พร้อมทั้งมอบแผงควบคุม **Admin Notification Policy Matrix** ให้ผู้ดูแลระบบสามารถปรับแต่งช่องทาง ขั้นตอน และรูปแบบการแจ้งเตือนได้อย่างอิสระ

**Architecture:** สถาปัตยกรรม 3-Layer (`Presentation Component` -> `Notification Dispatcher Service` -> `Data Access / Gateway Providers`)
- **Gateway Provider:** แยกอิสระระหว่าง `LineGateway` (ควบคุมโควต้าและ Rate Limit) กับ `WebPushGateway` (ใช้ VAPID keys และ Service Worker)
- **Policy Engine:** ตรวจสอบสิทธิ์และการตั้งค่าจาก `SystemSettings.notificationConfig` ก่อนยิงข้อความในทุกกรณี
- **Forensic Audit Logger:** บันทึก Structured JSON ลงในตาราง `SystemLog` เมื่อเกิดการลบใบลาโดยผู้ดูแลระบบ

**Tech Stack:**
- Next.js 16 (App Router), React 19, TypeScript
- Prisma ORM 5.x + PostgreSQL (Neon)
- Better-Auth (`src/lib/auth-session.ts`)
- Web Push API (W3C Standard) + Library `web-push`
- Service Worker (`public/sw.js`) รองรับ Push Event และ Notification Click Deep-linking
- LINE Messaging API (Push Message & Multicast API)
- Tailwind CSS (ระบบโทนสี Slate / Indigo / Emerald ตามแนวทาง UI/UX Design System Guide)
- Unit Testing ด้วย Node.js Native Test Runner (`node:test`, `node:assert/strict`) ผ่าน `--experimental-strip-types`

---

## ⚠️ 2. Global Invariants & Absolute Red Lines

1. **ห้ามรัน `prisma migrate reset`** หรือคำสั่งทำลายข้อมูลบนฐานข้อมูลจริงเด็ดขาด ใช้ `prisma db push` หรือ migration ที่ไม่กระทบข้อมูลเดิม
2. **ห้ามเปิดอ่านไฟล์เกิน 100 บรรทัดแบบเต็มไฟล์** ให้ใช้พิกัดใน `CODEBASE_INDEX.md` และอ่านเฉพาะบรรทัดที่จำเป็น
3. **พัฒนาบนกิ่ง `dev` เท่านั้น** ห้ามสั่ง `git checkout main` บนไดรฟ์ Google Drive เพื่อป้องกัน index lock
4. **ห้าม Commit โฟลเดอร์ `scratch/`** หรือทิ้งข้อมูลทดสอบใน Database จริง
5. **ห้ามส่ง `Decimal` หรือ `BigInt` ข้าม Server/Client Boundary** โดยไม่แปลงเป็น Number/String
6. **หลังแก้ไข Schema หรือโค้ดเสร็จสิ้น บังคับรัน `npm run index:sync` ทุกครั้ง** ห้ามแก้ไขเลขบรรทัดใน `CODEBASE_INDEX.md` ด้วยมือ

---

## 🛠️ 3. บล็อกโค้ดพร้อมใช้งานระดับ Production (Production-Ready Code Blocks)

### 📌 1. ไฟล์ `public/sw.js` (แก้ไขไอคอนเป็น `/icon.png` และ Default URL เป็น `/history`)

```javascript
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "แจ้งเตือนระบบการลา";
    const options = {
      body: payload.body || "",
      icon: payload.icon || "/icon.png",
      badge: payload.badge || "/icon.png",
      tag: payload.tag || "leave-notification",
      requireInteraction: Boolean(payload.requireInteraction),
      silent: payload.soundEnabled === false,
      data: {
        url: payload.url || "/history",
        ...(payload.data || {}),
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[Service Worker] Push parse error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/history";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

---

### 📌 2. เพิ่มฟังก์ชัน `sendLinePushMessage` ใน `src/lib/line-notify.ts`

นำฟังก์ชันนี้ไปวางต่อท้ายไฟล์ `src/lib/line-notify.ts`:

```typescript
/**
 * ส่งข้อความ LINE Push Message รายบุคคล (1-on-1) สำหรับโหมดประหยัดโควต้า
 */
export async function sendLinePushMessage(
  lineUserId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!lineUserId || !message) {
    return { success: false, error: "MISSING_TARGET_OR_MESSAGE" };
  }

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        enableLineNotify: true,
        lineChannelAccessToken: true,
      },
    });

    if (settings?.enableLineNotify === false) {
      return { success: false, error: "LINE_NOTIFY_DISABLED" };
    }

    const token =
      settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!token) {
      return { success: false, error: "MISSING_CHANNEL_ACCESS_TOKEN" };
    }

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({
        to: lineUserId.trim(),
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("[sendLinePushMessage] LINE API Error:", response.status, errBody);
      return { success: false, error: `LINE_API_${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[sendLinePushMessage] Unexpected error:", error);
    return { success: false, error: "NETWORK_ERROR" };
  }
}
```

---

### 📌 3. ไฟล์ `src/lib/push-notification.ts` (ใช้ `id: "default"` และ `upsert`)

```typescript
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  soundEnabled?: boolean;
  data?: Record<string, unknown>;
}

export async function generateOrGetVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
  subject: string;
}> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      vapidPublicKey: true,
      vapidPrivateKey: true,
      vapidSubject: true,
    },
  });

  if (settings?.vapidPublicKey && settings?.vapidPrivateKey) {
    return {
      publicKey: settings.vapidPublicKey,
      privateKey: settings.vapidPrivateKey,
      subject: settings.vapidSubject || "mailto:admin@school.local",
    };
  }

  const generated = webpush.generateVAPIDKeys();
  const subject = settings?.vapidSubject || "mailto:admin@school.local";

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {
      vapidPublicKey: generated.publicKey,
      vapidPrivateKey: generated.privateKey,
      vapidSubject: subject,
    },
    create: {
      id: "default",
      vapidPublicKey: generated.publicKey,
      vapidPrivateKey: generated.privateKey,
      vapidSubject: subject,
    },
  });

  return {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  };
}

export async function sendWebPushNotification(
  userIds: string[],
  payload: WebPushPayload
): Promise<{ successCount: number; failureCount: number }> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: uniqueUserIds } },
  });

  if (subscriptions.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const { publicKey, privateKey, subject } = await generateOrGetVapidKeys();
  webpush.setVapidDetails(subject, publicKey, privateKey);

  let successCount = 0;
  let failureCount = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            ...payload,
            icon: payload.icon || "/icon.png",
            badge: payload.badge || "/icon.png",
          })
        );
        successCount++;
      } catch (err: unknown) {
        failureCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: expiredIds } } })
      .catch(() => {});
  }

  return { successCount, failureCount };
}
```

---

### 📌 4. ไฟล์ `src/services/notification.service.ts` (Smart Deep-linking แยก `/approvals` และ `/history`)

```typescript
import { prisma } from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/push-notification";
import { sendLinePushMessage, sendLineNotify } from "@/lib/line-notify";

export type LeaveNotificationEvent =
  | "SUBMIT"
  | "APPROVAL_STEP"
  | "FINAL_APPROVE"
  | "REJECT"
  | "CANCEL"
  | "DELETE";

export interface NotificationPolicyConfig {
  line: {
    enabled: boolean;
    quotaSaverMode: boolean;
    stages: {
      onSubmit: boolean;
      onApprovalStep: boolean;
      onFinalApproval: boolean;
      onReject: boolean;
      onCancel: boolean;
      onDelete: boolean;
    };
    targets: {
      notifyRequester: boolean;
      notifyNextApproverOnly: boolean;
      notifyApproverGroup: boolean;
      notifyGeneralGroup: boolean;
    };
  };
  push: {
    enabled: boolean;
    stages: {
      onSubmit: boolean;
      onApprovalStep: boolean;
      onFinalApproval: boolean;
      onReject: boolean;
      onCancel: boolean;
      onDelete: boolean;
    };
    display: {
      includeReason: boolean;
      soundEnabled: boolean;
      requireInteraction: boolean;
    };
  };
}

export const DEFAULT_NOTIFICATION_POLICY: NotificationPolicyConfig = {
  line: {
    enabled: true,
    quotaSaverMode: true,
    stages: {
      onSubmit: true,
      onApprovalStep: false,
      onFinalApproval: true,
      onReject: true,
      onCancel: false,
      onDelete: false,
    },
    targets: {
      notifyRequester: true,
      notifyNextApproverOnly: true,
      notifyApproverGroup: false,
      notifyGeneralGroup: false,
    },
  },
  push: {
    enabled: true,
    stages: {
      onSubmit: true,
      onApprovalStep: true,
      onFinalApproval: true,
      onReject: true,
      onCancel: true,
      onDelete: true,
    },
    display: {
      includeReason: false,
      soundEnabled: true,
      requireInteraction: true,
    },
  },
};

export interface DispatchLeaveNotificationInput {
  event: LeaveNotificationEvent;
  leaveRequestId: string;
  requesterUserId: string;
  actorUserId: string;
  nextApproverUserId?: string;
  leaveDetails: {
    userName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    requestedDays: number;
    reason?: string;
  };
  metadata?: Record<string, unknown>;
}

const EVENT_TO_STAGE_KEY: Record<
  LeaveNotificationEvent,
  keyof NotificationPolicyConfig["line"]["stages"]
> = {
  SUBMIT: "onSubmit",
  APPROVAL_STEP: "onApprovalStep",
  FINAL_APPROVE: "onFinalApproval",
  REJECT: "onReject",
  CANCEL: "onCancel",
  DELETE: "onDelete",
};

export function hasUserReceivedLineForLeave(
  notifiedEntries: string[],
  userId: string
): boolean {
  return notifiedEntries.some(
    (entry) => entry === userId || entry.endsWith(`:${userId}`)
  );
}

export function evaluateLineDispatchDecision(params: {
  event: LeaveNotificationEvent;
  policy: NotificationPolicyConfig;
  candidateUserIds: string[];
  alreadyNotifiedEntries: string[];
}): {
  shouldSendLine: boolean;
  allowedUserIds: string[];
  updatedNotifiedEntries: string[];
} {
  const { event, policy, candidateUserIds, alreadyNotifiedEntries } = params;

  if (event === "DELETE" || !policy.line.enabled) {
    return {
      shouldSendLine: false,
      allowedUserIds: [],
      updatedNotifiedEntries: [...alreadyNotifiedEntries],
    };
  }

  const stageKey = EVENT_TO_STAGE_KEY[event];
  if (!policy.line.stages[stageKey]) {
    return {
      shouldSendLine: false,
      allowedUserIds: [],
      updatedNotifiedEntries: [...alreadyNotifiedEntries],
    };
  }

  const uniqueCandidates = Array.from(new Set(candidateUserIds.filter(Boolean)));
  const allowedUserIds = policy.line.quotaSaverMode
    ? uniqueCandidates.filter(
        (uid) => !hasUserReceivedLineForLeave(alreadyNotifiedEntries, uid)
      )
    : uniqueCandidates;

  const newEntries = allowedUserIds.map((uid) => `${event}:${uid}`);

  return {
    shouldSendLine: allowedUserIds.length > 0,
    allowedUserIds,
    updatedNotifiedEntries: [...alreadyNotifiedEntries, ...newEntries],
  };
}

export function evaluateWebPushDispatchDecision(
  event: LeaveNotificationEvent,
  policy: NotificationPolicyConfig
): boolean {
  if (!policy.push.enabled) return false;
  const stageKey = EVENT_TO_STAGE_KEY[event];
  return Boolean(policy.push.stages[stageKey]);
}

export function buildLeaveNotificationText(
  input: DispatchLeaveNotificationInput,
  includeReason: boolean
): { title: string; body: string } {
  const { event, leaveDetails } = input;
  const dateRange = `${leaveDetails.startDate} ถึง ${leaveDetails.endDate} (${leaveDetails.requestedDays} วัน)`;
  const reasonSuffix =
    includeReason && leaveDetails.reason ? ` | เหตุผล: ${leaveDetails.reason}` : "";

  switch (event) {
    case "SUBMIT":
      return {
        title: "📄 มีคำขอลาใหม่รอการพิจารณา",
        body: `${leaveDetails.userName} ยื่น${leaveDetails.leaveType} วันที่ ${dateRange}${reasonSuffix}`,
      };
    case "APPROVAL_STEP":
      return {
        title: "✅ ใบลาผ่านการตรวจสอบตามสายงาน",
        body: `คำขอ${leaveDetails.leaveType}ของ ${leaveDetails.userName} (${dateRange}) อยู่ระหว่างเสนอพิจารณาขั้นถัดไป`,
      };
    case "FINAL_APPROVE":
      return {
        title: "🎉 ใบลาได้รับการอนุมัติเรียบร้อยแล้ว",
        body: `คำขอ${leaveDetails.leaveType}ของ ${leaveDetails.userName} (${dateRange}) ได้รับอนุมัติขั้นสุดท้าย`,
      };
    case "REJECT":
      return {
        title: "⚠️ คำขอลาไม่ได้รับการอนุมัติ",
        body: `คำขอ${leaveDetails.leaveType}ของ ${leaveDetails.userName} (${dateRange}) ไม่ได้รับการอนุมัติ${reasonSuffix}`,
      };
    case "CANCEL":
      return {
        title: "🔄 มีการยกเลิกคำขอลา",
        body: `${leaveDetails.userName} ยกเลิกคำขอ${leaveDetails.leaveType} (${dateRange})`,
      };
    case "DELETE":
      return {
        title: "🗑️ รายการใบลาถูกย้ายไปยังถังขยะโดยผู้ดูแลระบบ",
        body: `รายการ${leaveDetails.leaveType}ของ ${leaveDetails.userName} (${dateRange}) ถูกลบและบันทึกใน Audit Log`,
      };
  }
}

export async function getSystemNotificationPolicy(): Promise<NotificationPolicyConfig> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: { notificationConfig: true },
  });

  if (!settings?.notificationConfig || typeof settings.notificationConfig !== "object") {
    return DEFAULT_NOTIFICATION_POLICY;
  }

  const raw = settings.notificationConfig as Partial<NotificationPolicyConfig>;
  return {
    line: {
      ...DEFAULT_NOTIFICATION_POLICY.line,
      ...(raw.line || {}),
      stages: {
        ...DEFAULT_NOTIFICATION_POLICY.line.stages,
        ...(raw.line?.stages || {}),
        onDelete: false,
      },
      targets: {
        ...DEFAULT_NOTIFICATION_POLICY.line.targets,
        ...(raw.line?.targets || {}),
      },
    },
    push: {
      ...DEFAULT_NOTIFICATION_POLICY.push,
      ...(raw.push || {}),
      stages: {
        ...DEFAULT_NOTIFICATION_POLICY.push.stages,
        ...(raw.push?.stages || {}),
      },
      display: {
        ...DEFAULT_NOTIFICATION_POLICY.push.display,
        ...(raw.push?.display || {}),
      },
    },
  };
}

export async function dispatchLeaveNotification(
  input: DispatchLeaveNotificationInput
): Promise<void> {
  const policy = await getSystemNotificationPolicy();

  // 1. Web Push Dispatch: แยก URL ตามบทบาท (ผู้อนุมัติไป /approvals, ผู้ยื่นไป /history)
  if (evaluateWebPushDispatchDecision(input.event, policy)) {
    const { title, body } = buildLeaveNotificationText(
      input,
      policy.push.display.includeReason
    );

    const commonPushOptions = {
      title,
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      tag: `leave-${input.leaveRequestId}-${input.event}`,
      requireInteraction: policy.push.display.requireInteraction,
      soundEnabled: policy.push.display.soundEnabled,
    };

    if (input.event === "SUBMIT" && input.nextApproverUserId) {
      await sendWebPushNotification([input.nextApproverUserId], {
        ...commonPushOptions,
        url: "/approvals",
      }).catch((err) => console.error("[WebPush Approver Error]:", err));
    } else if (input.event === "APPROVAL_STEP") {
      if (input.nextApproverUserId) {
        await sendWebPushNotification([input.nextApproverUserId], {
          ...commonPushOptions,
          url: "/approvals",
        }).catch((err) => console.error("[WebPush NextApprover Error]:", err));
      }
      await sendWebPushNotification([input.requesterUserId], {
        ...commonPushOptions,
        url: "/history",
      }).catch((err) => console.error("[WebPush Requester Error]:", err));
    } else {
      await sendWebPushNotification([input.requesterUserId], {
        ...commonPushOptions,
        url: "/history",
      }).catch((err) => console.error("[WebPush Requester Error]:", err));
    }
  }

  // 2. LINE Quota Throttled Dispatch
  if (input.event === "DELETE") return;

  const leaveRecord = await prisma.leaveRequest.findUnique({
    where: { id: input.leaveRequestId },
    select: { lineNotifiedUserIds: true },
  });

  const existingEntries = Array.isArray(leaveRecord?.lineNotifiedUserIds)
    ? (leaveRecord.lineNotifiedUserIds as string[])
    : [];

  const lineCandidateUserIds: string[] = [];
  if (
    (input.event === "SUBMIT" || input.event === "APPROVAL_STEP") &&
    policy.line.targets.notifyNextApproverOnly &&
    input.nextApproverUserId
  ) {
    lineCandidateUserIds.push(input.nextApproverUserId);
  }
  if (
    (input.event === "FINAL_APPROVE" || input.event === "REJECT") &&
    policy.line.targets.notifyRequester
  ) {
    lineCandidateUserIds.push(input.requesterUserId);
  }

  const lineDecision = evaluateLineDispatchDecision({
    event: input.event,
    policy,
    candidateUserIds: lineCandidateUserIds,
    alreadyNotifiedEntries: existingEntries,
  });

  if (lineDecision.shouldSendLine && lineDecision.allowedUserIds.length > 0) {
    const recipients = await prisma.user.findMany({
      where: {
        id: { in: lineDecision.allowedUserIds },
        lineUserId: { not: null },
      },
      select: { id: true, lineUserId: true },
    });

    const { title, body } = buildLeaveNotificationText(
      input,
      policy.push.display.includeReason
    );
    const fullLineText = `${title}\n${body}`;

    await Promise.all(
      recipients.map((r) =>
        r.lineUserId
          ? sendLinePushMessage(r.lineUserId, fullLineText).catch(() => {})
          : Promise.resolve()
      )
    );

    await prisma.leaveRequest
      .update({
        where: { id: input.leaveRequestId },
        data: { lineNotifiedUserIds: lineDecision.updatedNotifiedEntries },
      })
      .catch(() => {});
  }

  if (
    policy.line.stages[EVENT_TO_STAGE_KEY[input.event]] &&
    (policy.line.targets.notifyApproverGroup || policy.line.targets.notifyGeneralGroup)
  ) {
    const { title, body } = buildLeaveNotificationText(
      input,
      policy.push.display.includeReason
    );
    await sendLineNotify(`${title}\n${body}`).catch(() => {});
  }
}
```

---

### 📌 5. ไฟล์ `src/app/actions/push-subscription.ts` และ `src/app/actions/notification-settings.ts`

```typescript
// src/app/actions/push-subscription.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-session";
import { generateOrGetVapidKeys } from "@/lib/push-notification";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export async function getPublicVapidKeyAction(): Promise<string> {
  const { publicKey } = await generateOrGetVapidKeys();
  return publicKey;
}

export async function savePushSubscriptionAction(input: PushSubscriptionInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      userId: session.user.id,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
    create: {
      userId: session.user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
  });

  return { success: true };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  });

  return { success: true };
}
```

```typescript
// src/app/actions/notification-settings.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import webpush from "web-push";
import {
  getSystemNotificationPolicy,
  type NotificationPolicyConfig,
} from "@/services/notification.service";
import { sendWebPushNotification } from "@/lib/push-notification";

async function verifySettingsAdminAccess() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      position: true,
    },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  const isRoleOrPositionAdmin =
    user.role === "ADMIN" || user.position === "แอดมิน";

  if (!isRoleOrPositionAdmin) {
    const dutyCount = await prisma.userDutyAssignment
      .count({
        where: {
          userId: user.id,
          duty: { code: { in: ["ADMIN", "SUPER_ADMIN", "HR_ADMIN"] } },
        },
      })
      .catch(() => 0);

    if (dutyCount === 0) {
      throw new Error("FORBIDDEN");
    }
  }

  return session;
}

export async function getNotificationSettingsForAdminAction() {
  await verifySettingsAdminAccess();

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      vapidPublicKey: true,
      vapidPrivateKey: true,
      vapidSubject: true,
    },
  });

  const policy = await getSystemNotificationPolicy();

  return {
    policy,
    vapidPublicKey: settings?.vapidPublicKey || null,
    hasVapidPrivateKey: Boolean(settings?.vapidPrivateKey),
    vapidSubject: settings?.vapidSubject || "mailto:admin@school.local",
  };
}

export async function saveNotificationPolicyAction(
  policy: NotificationPolicyConfig
) {
  await verifySettingsAdminAccess();
  policy.line.stages.onDelete = false;

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: { notificationConfig: policy as unknown as object },
    create: {
      id: "default",
      notificationConfig: policy as unknown as object,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function regenerateVapidKeysAction() {
  await verifySettingsAdminAccess();
  const keys = webpush.generateVAPIDKeys();

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {
      vapidPublicKey: keys.publicKey,
      vapidPrivateKey: keys.privateKey,
    },
    create: {
      id: "default",
      vapidPublicKey: keys.publicKey,
      vapidPrivateKey: keys.privateKey,
    },
  });

  revalidatePath("/settings");
  return { success: true, publicKey: keys.publicKey };
}

export async function sendTestWebPushAction() {
  const session = await verifySettingsAdminAccess();

  const result = await sendWebPushNotification([session.user.id], {
    title: "🔔 ทดสอบระบบแจ้งเตือน Web Push สำเร็จ!",
    body: "ระบบแจ้งเตือนการลาพร้อมทำงานแบบเรียลไทม์โดยไม่ใช้โควต้า LINE",
    icon: "/icon.png",
    badge: "/icon.png",
    url: "/settings",
    requireInteraction: false,
  });

  return { success: true, ...result };
}
```

---

### 📌 6. การแก้ไข `adminDeleteLeaveRequest` ใน `src/app/actions/leave.ts`

```typescript
// ใน src/app/actions/leave.ts บรรทัด ~1583-1618:
const deleteResult = await RecycleBinService.softDelete({
  type: "LEAVE",
  id,
  user: { userId: session.user.id, userRole: user.role || "ADMIN" },
});
if (!deleteResult.success) {
  return { error: deleteResult.error || "ไม่สามารถลบข้อมูลได้" };
}

const startDateStr = request.startDate.toISOString().split("T")[0];
const endDateStr = request.endDate.toISOString().split("T")[0];
const safeRequestedDays = Number(request.requestedDays ?? 0);

await writeLog(
  "DELETE_LEAVE",
  JSON.stringify({
    event: "ADMIN_DELETE_LEAVE",
    deletedBy: {
      id: session.user.id,
      name: user.name,
      role: user.role || "ADMIN",
    },
    targetLeave: {
      id: request.id,
      ownerId: request.userId,
      ownerName: request.user?.name ?? "ไม่ระบุชื่อ",
      type: request.type,
      dates: `${startDateStr} ถึง ${endDateStr}`,
      requestedDays: safeRequestedDays,
      reason: request.reason ?? null,
      statusBeforeDelete: request.status,
    },
    deletedAt: new Date().toISOString(),
  }),
  session.user.id
);

await dispatchLeaveNotification({
  event: "DELETE",
  leaveRequestId: request.id,
  requesterUserId: request.userId,
  actorUserId: session.user.id,
  leaveDetails: {
    userName: request.user?.name || "บุคลากร",
    leaveType: request.type,
    startDate: startDateStr,
    endDate: endDateStr,
    requestedDays: safeRequestedDays,
    reason: request.reason ?? undefined,
  },
}).catch((err) => {
  console.error("[adminDeleteLeaveRequest] Notification dispatch error:", err);
});

revalidatePath("/history");
revalidatePath("/dashboard");
revalidatePath("/approvals");
revalidatePath("/reports");
```

---

### 📌 7. Self-Loading Component & การแทรกเฉพาะจุด (Surgical Insertion) ใน `src/app/(app)/settings/page.tsx`

#### 7.1 ไฟล์ `src/app/(app)/settings/_components/NotificationPolicyMatrixTab.tsx`

```tsx
"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  DEFAULT_NOTIFICATION_POLICY,
  type NotificationPolicyConfig,
} from "@/services/notification.service";
import {
  getNotificationSettingsForAdminAction,
  saveNotificationPolicyAction,
  regenerateVapidKeysAction,
  sendTestWebPushAction,
} from "@/app/actions/notification-settings";

interface Props {
  initialPolicy?: NotificationPolicyConfig;
  initialVapidPublicKey?: string | null;
  initialHasVapidPrivateKey?: boolean;
}

const STAGE_ROWS: Array<{
  key: keyof NotificationPolicyConfig["line"]["stages"];
  label: string;
  desc: string;
  lockLineOff?: boolean;
}> = [
  { key: "onSubmit", label: "1. ยื่นคำขอลา (Submit)", desc: "เมื่อครูส่งใบลาเข้าระบบ" },
  {
    key: "onApprovalStep",
    label: "2. ผ่านการตรวจตามสายงาน (Step Approve)",
    desc: "หัวหน้ากลุ่มสาระ / รอง ผอ. ลงความเห็น",
  },
  {
    key: "onFinalApproval",
    label: "3. อนุมัติขั้นสุดท้าย (Final Approve)",
    desc: "ผู้อำนวยการลงนามอนุมัติใบลา",
  },
  { key: "onReject", label: "4. ไม่อนุมัติ (Reject)", desc: "ใบลาถูกปฏิเสธหรือตีกลับ" },
  { key: "onCancel", label: "5. ขอยกเลิกใบลา (Cancel)", desc: "ผู้ยื่นขอยกเลิกใบลาด้วยตนเอง" },
  {
    key: "onDelete",
    label: "6. แอดมินลบใบลา (Delete)",
    desc: "บันทึก Forensic Audit Log อัตโนมัติ",
    lockLineOff: true,
  },
];

export default function NotificationPolicyMatrixTab({
  initialPolicy,
  initialVapidPublicKey,
  initialHasVapidPrivateKey,
}: Props) {
  const [policy, setPolicy] = useState<NotificationPolicyConfig>(
    initialPolicy || DEFAULT_NOTIFICATION_POLICY
  );
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(
    initialVapidPublicKey || null
  );
  const [hasVapidPrivateKey, setHasVapidPrivateKey] = useState<boolean>(
    initialHasVapidPrivateKey || false
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Self-loading เมื่อไม่ได้ส่ง Props มาจาก parent
  useEffect(() => {
    if (!initialPolicy) {
      getNotificationSettingsForAdminAction()
        .then((data) => {
          setPolicy(data.policy);
          setVapidPublicKey(data.vapidPublicKey);
          setHasVapidPrivateKey(data.hasVapidPrivateKey);
        })
        .catch((err) => console.error("Failed to load notification policy:", err));
    }
  }, [initialPolicy]);

  const toggleStage = (
    channel: "line" | "push",
    stageKey: keyof NotificationPolicyConfig["line"]["stages"]
  ) => {
    if (channel === "line" && stageKey === "onDelete") return;
    setPolicy((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        stages: {
          ...prev[channel].stages,
          [stageKey]: !prev[channel].stages[stageKey],
        },
      },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveNotificationPolicyAction(policy);
      setFeedback(
        res.success
          ? "✅ บันทึกตารางนโยบายการแจ้งเตือนเรียบร้อยแล้ว"
          : "❌ เกิดข้อผิดพลาดในการบันทึก"
      );
    });
  };

  const handleGenerateVapid = () => {
    startTransition(async () => {
      const res = await regenerateVapidKeysAction();
      if (res.success && res.publicKey) {
        setVapidPublicKey(res.publicKey);
        setHasVapidPrivateKey(true);
        setFeedback("🔑 สร้างชุดกุญแจ VAPID ใหม่สำเร็จ");
      }
    });
  };

  const handleTestPush = () => {
    startTransition(async () => {
      const res = await sendTestWebPushAction();
      if (res.success) {
        setFeedback(
          `🔔 ส่งแจ้งเตือนทดสอบแล้ว (สำเร็จ ${res.successCount} อุปกรณ์)`
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Quota Optimization Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-slate-800 dark:text-slate-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              💡 โหมดประหยัดโควต้า LINE (LINE Quota Saver Mode)
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              จำกัดการส่ง LINE เหลือเพียงคนละไม่เกิน 1 ข้อความต่อ 1 วงจรการลา และตัดการส่งเมื่อลบใบลา ช่วยลดการใช้โควต้าลงกว่า 85%
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPolicy((p) => ({
                ...p,
                line: { ...p.line, quotaSaverMode: !p.line.quotaSaverMode },
              }))
            }
            className={`h-11 shrink-0 rounded-xl px-4 font-medium transition ${
              policy.line.quotaSaverMode
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {policy.line.quotaSaverMode ? "เปิดประหยัดโควต้าอยู่" : "ปิดโหมดประหยัดโควต้า"}
          </button>
        </div>
      </div>

      {/* 2. Notification Channels Matrix Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          ตารางควบคุมช่องทางการแจ้งเตือน (Notification Policy Matrix)
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          กำหนดขั้นตอนที่ต้องการให้ระบบส่งข้อความแยกตามช่องทาง LINE OA และ Web Push
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <th className="py-3 pr-4">ขั้นตอนของวงจรการลา (Lifecycle Stage)</th>
                <th className="px-4 py-3 text-center">Web Push (ฟรี 100%)</th>
                <th className="px-4 py-3 text-center">LINE OA (คิดโควต้า)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
              {STAGE_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="py-3.5 pr-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {row.label}
                    </div>
                    <div className="text-xs text-slate-500">{row.desc}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleStage("push", row.key)}
                      className={`h-11 rounded-xl px-4 text-xs font-semibold transition ${
                        policy.push.stages[row.key]
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}
                    >
                      {policy.push.stages[row.key] ? "แจ้งเตือน" : "ปิด"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.lockLineOff ? (
                      <span className="inline-flex h-11 items-center rounded-xl bg-slate-100 px-3 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Audit Log Only
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleStage("line", row.key)}
                        className={`h-11 rounded-xl px-4 text-xs font-semibold transition ${
                          policy.line.stages[row.key]
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        }`}
                      >
                        {policy.line.stages[row.key] ? "ส่ง LINE" : "งดส่ง"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PDPA & VAPID Studio */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          ความเป็นส่วนตัว (PDPA) และกุญแจความปลอดภัย VAPID
        </h3>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              แสดงเหตุผลการลาในข้อความแจ้งเตือน (`includeReason`)
            </p>
            <p className="text-xs text-slate-500">
              แนะนำให้ปิดไว้เพื่อคุ้มครองข้อมูลส่วนบุคคลกรณีลาป่วย
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPolicy((p) => ({
                ...p,
                push: {
                  ...p.push,
                  display: {
                    ...p.push.display,
                    includeReason: !p.push.display.includeReason,
                  },
                },
              }))
            }
            className={`h-11 rounded-xl px-4 text-sm font-medium ${
              policy.push.display.includeReason
                ? "bg-amber-500 text-white"
                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {policy.push.display.includeReason ? "แสดงเหตุผลการลา" : "ซ่อนเหตุผลการลา (PDPA Safe)"}
          </button>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            สถานะ VAPID Key:{" "}
            <span className="font-semibold text-emerald-600">
              {vapidPublicKey && hasVapidPrivateKey ? "พร้อมใช้งาน" : "ยังไม่ได้สร้าง"}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleGenerateVapid}
              className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700"
            >
              สร้างชุดกุญแจ VAPID ใหม่
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleTestPush}
              className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
            >
              ส่งแจ้งเตือนทดสอบเข้าอุปกรณ์นี้
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="h-11 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white hover:bg-emerald-600"
            >
              บันทึกการตั้งค่าทั้งหมด
            </button>
          </div>
          {feedback && (
            <p className="mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {feedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 7.2 จุดแทรกใน `src/app/(app)/settings/page.tsx` (~L4025-4030)

1. เพิ่ม Import ด้านบน:
```tsx
import NotificationPolicyMatrixTab from "./_components/NotificationPolicyMatrixTab";
```

2. วางคอมโพเนนต์ต่อท้ายการตั้งค่า LINE เดิม:
```tsx
<div className="mt-6">
  <NotificationPolicyMatrixTab />
</div>
```

---

### 📌 8. ไฟล์ Unit Test ตามมาตรฐาน Node.js Native Runner

ไฟล์ `eLeave/tests/unit/leaveNotificationPolicy.test.js`:

```javascript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOTIFICATION_POLICY,
  evaluateLineDispatchDecision,
  evaluateWebPushDispatchDecision,
  buildLeaveNotificationText,
} from "../../src/services/notification.service.ts";

describe("Leave Notification Policy & Quota Saver Invariants", () => {
  it("1. เมื่อเกิด Event DELETE ต้องไม่ส่ง LINE Notify เด็ดขาด", () => {
    const mutated = structuredClone(DEFAULT_NOTIFICATION_POLICY);
    mutated.line.stages.onDelete = true;

    const decision = evaluateLineDispatchDecision({
      event: "DELETE",
      policy: mutated,
      candidateUserIds: ["user-01"],
      alreadyNotifiedEntries: [],
    });

    assert.equal(decision.shouldSendLine, false);
    assert.deepEqual(decision.allowedUserIds, []);
  });

  it("2. เมื่อเปิด quotaSaverMode ผู้ใช้ที่เคยได้รับ LINE ในใบลานี้แล้ว ต้องไม่ถูกส่งซ้ำอีก", () => {
    const policy = structuredClone(DEFAULT_NOTIFICATION_POLICY);

    const step1 = evaluateLineDispatchDecision({
      event: "SUBMIT",
      policy,
      candidateUserIds: ["approver-01"],
      alreadyNotifiedEntries: [],
    });
    assert.equal(step1.shouldSendLine, true);
    assert.deepEqual(step1.allowedUserIds, ["approver-01"]);

    const step2 = evaluateLineDispatchDecision({
      event: "FINAL_APPROVE",
      policy,
      candidateUserIds: ["approver-01", "requester-01"],
      alreadyNotifiedEntries: step1.updatedNotifiedEntries,
    });
    assert.equal(step2.shouldSendLine, true);
    assert.deepEqual(step2.allowedUserIds, ["requester-01"]);
  });

  it("3. Web Push ต้องเปิดส่งทุกขั้นตอนตามค่าเริ่มต้น รวมถึงเมื่อลบใบลา (DELETE)", () => {
    const policy = structuredClone(DEFAULT_NOTIFICATION_POLICY);
    for (const evt of ["SUBMIT", "APPROVAL_STEP", "FINAL_APPROVE", "REJECT", "CANCEL", "DELETE"]) {
      assert.equal(evaluateWebPushDispatchDecision(evt, policy), true);
    }
  });

  it("4. ซ่อนเหตุผลการลาเมื่อ includeReason เป็น false (PDPA Safe)", () => {
    const msg = buildLeaveNotificationText(
      {
        event: "SUBMIT",
        leaveRequestId: "leave-1",
        requesterUserId: "u-1",
        actorUserId: "u-1",
        leaveDetails: {
          userName: "ครูสมชาย",
          leaveType: "ลาป่วย",
          startDate: "2026-10-28",
          endDate: "2026-10-29",
          requestedDays: 2,
          reason: "ข้อมูลสุขภาพส่วนบุคคล",
        },
      },
      false
    );
    assert.equal(msg.body.includes("ข้อมูลสุขภาพส่วนบุคคล"), false);
  });
});
```

---

### 📌 9. Verification Checklist

```bash
# 1. รันเทสต์ Invariant ประหยัดโควต้า LINE และ Web Push
node --experimental-strip-types --test eLeave/tests/unit/leaveNotificationPolicy.test.js

# 2. ตรวจสอบ TypeScript ทั่วทั้งระบบ
npx tsc -p tsconfig.json --noEmit

# 3. ซิงก์ดัชนีโค้ดตามกฎเหล็ก AGENTS.md
npm run index:sync
```
