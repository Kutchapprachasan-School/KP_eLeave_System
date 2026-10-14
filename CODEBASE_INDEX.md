# KP e-Leave & School Enterprise System — Codebase Navigation Index

> **อัปเดตล่าสุด:** 2026-10-14  
> **⚠️ กฎ:** ทุกครั้งที่สร้าง/ลบ/ย้ายไฟล์ หรือเพิ่ม/ลบ/เปลี่ยนชื่อ function สำคัญ → ต้องอัปเดตไฟล์นี้ทันที

---

## 📁 โครงสร้าง Root Directory

```
├── .agent/              # Agent rules & skills
│   ├── rules/           # Mandatory agent rules
│   └── skills/          # Agent skills (handoff, grill-doc, ui-ux-pro-max, etc.)
├── .github/workflows/   # GitHub Actions (mirror-to-school.yml)
├── docs/                # Documentation (ADRs, handoff, superpowers)
├── prisma/              # Prisma schema & migrations
├── public/              # Static assets
├── scripts/             # Utility scripts
├── src/                 # Main source code
│   ├── app/             # Next.js App Router
│   ├── components/      # Shared UI components
│   ├── constants/       # Constants (permissions, etc.)
│   ├── core/            # Core domain (events, modules)
│   ├── events/          # Event catalog
│   ├── features/        # Feature modules (Clean Architecture)
│   ├── lib/             # Shared libraries & utilities
│   ├── repositories/    # Data repositories
│   ├── services/        # Business services & engines
│   ├── styles/          # Global styles
│   └── workers/         # Web Workers
├── AGENTS.md            # Root agent rules
└── CODEBASE_INDEX.md    # ← ไฟล์นี้
```

---

## 🗂️ Agent Rules & Skills (`.agent/`)

| ไฟล์ | หน้าที่ |
|---|---|
| `.agent/rules/handoff.md` | Session Handoff & System Architectural Rulebook v3.0 |
| `.agent/rules/plan-versioning.md` | กฎการกำกับ Version/Revision ทุกแผนงาน |
| `.agent/rules/test-data-and-account-safety.md` | กฎห้ามทิ้งบัญชีทดสอบค้างใน DB |
| `.agent/rules/token-efficiency.md` | กฎประหยัด Token & ป้องกัน Quadratic Context Explosion |

---

## 🌐 App Routes (`src/app/`)

### Authentication & Public Routes

| Route | ไฟล์ | หน้าที่ |
|---|---|---|
| `/login` | `src/app/login/` | หน้า Login |
| `/reset-password` | `src/app/reset-password/` | รีเซ็ตรหัสผ่าน |
| `/verify` | `src/app/verify/` | ยืนยันตัวตน |
| `/v` | `src/app/v/` | Verify shortlink |
| `/privacy` | `src/app/privacy/` | หน้า Privacy Policy สาธารณะ |
| `/supervision` | `src/app/supervision/` | ระบบนิเทศ (standalone) |
| `/print` | `src/app/print/` | หน้าพิมพ์เอกสาร |

### Main App Routes (`src/app/(app)/`)

| Route | ไฟล์ | หน้าที่ |
|---|---|---|
| App Layout & Navigation | `(app)/layout.tsx` | โครงสร้างหลัก (Sidebar ดีไซน์ใหม่สไตล์ SMS ตามแบบระบบจัดการชั้นเรียน: โลโก้/ชื่อโรงเรียนกุดจับประชาสรรค์, ปุ่มปิด X, เมนูคลีนเรียบหรูพร้อมแบดจ์ Admin และตัวเลขนับ, ปุ่มออกจากระบบขอบน้ำเงิน, Top Header Bar สไตล์ SMS: วันที่ภาษาไทยไดนามิก/ภาคเรียน, ค้นหานักเรียน, T ขนาดฟอนต์, TH ภาษา, สลับธีม, เต็มจอ, กระดิ่งแจ้งเตือนแม่นยำไม่ขึ้นหลอก 3 รายการพร้อมป็อปอัปตอบสนองมือถือ, แคปซูลโปรไฟล์ผู้ใช้ขวาสุด) |
| `/dashboard` | `(app)/dashboard/page.tsx` | Dashboard หลัก — ศูนย์รวม All-in-One KPI Hub รวมทุกระบบย่อย (การลา, สารบรรณ, ซ่อมบำรุง, ทรัพยากร, ผู้เรียน) |
| `(app)/dashboard/_components/` | Sub-components | ExecutiveLeaveDashboardView (All-in-One KPI Hub), SMSHeroBanner, SubsystemQuickHub, ExecutiveLeaveStatCards (11 Modular KPI Cards), SMSLearningOutcomeChart, SMSAttendanceDonutCard, SMSOperationsStrip, ExecutiveLeaveCharts, ExecutiveStudentLeaveOverview, SMSAnnouncementsCard, SMSAcademicCalendarCard, ExecutiveApprovalQueue, MonthlyTrendChart, DashboardWidgetCustomizerModal, DashboardShell, SystemSelector |
| `/leave` | `(app)/leave/page.tsx` | ระบบการลา (UI หลัก) |
| `/request` | `(app)/request/page.tsx` | ยื่นคำขอลา |
| `/approvals` | `(app)/approvals/page.tsx` | อนุมัติคำขอลา |
| `/history` | `(app)/history/page.tsx` | ประวัติการลา |
| `/reports` | `(app)/reports/page.tsx` | รายงาน |
| `/attendance` | `(app)/attendance/page.tsx` | ระบบลงเวลา |
| `/users` | `(app)/users/page.tsx` | จัดการผู้ใช้ |
| `/settings` | `(app)/settings/page.tsx` | ตั้งค่าระบบ |
| `/settings/privacy` | `(app)/settings/privacy/page.tsx` | ตั้งค่า Privacy |
| `/profile` | `(app)/profile/page.tsx` | โปรไฟล์ผู้ใช้ |
| `/logs` | `(app)/logs/page.tsx` | System Logs |
| `/manual` | `(app)/manual/page.tsx` | คู่มือการใช้งาน |
| `/calendar` | `(app)/calendar/page.tsx` | ปฏิทินกิจกรรมสถานศึกษา (School Activities & Events Calendar) ดีไซน์เดียวกับระบบจัดการชั้นเรียน ซิงค์ข้อมูลผ่าน schoolCalendarSyncService |
| `/archive` | `(app)/archive/page.tsx` | ข้อมูลย้อนหลัง/สำรอง |

### Document Module (`(app)/document/`)

| Route | หน้าที่ |
|---|---|
| `document/page.tsx` | รายการหนังสือราชการ |
| `document/new/page.tsx` | สร้างหนังสือราชการใหม่ |
| `document/settings/page.tsx` | ตั้งค่าระบบหนังสือ |
| `document/incoming/[id]/page.tsx` | รายละเอียดหนังสือเข้า |
| `document/_components/designer/` | PDF Designer (font, QR, signature) |

### Repair Module (`(app)/repair/`)

| Route | หน้าที่ |
|---|---|
| `repair/page.tsx` | รายการแจ้งซ่อม |
| `repair/[id]/page.tsx` | รายละเอียดแจ้งซ่อม |
| `repair/new/page.tsx` | แจ้งซ่อมใหม่ |
| `repair/dashboard/page.tsx` | Dashboard ซ่อมบำรุง |
| `repair/summary/page.tsx` | รายงานสรุป |
| `repair/_components/` | RepairDashboardPage, RepairDetailPage, RepairListPage, etc. |

### Academic Module (`(app)/academic/`)

| Route | หน้าที่ |
|---|---|
| `academic/page.tsx` | หน้าหลักงานวิชาการ |
| `academic/supervision/page.tsx` | นิเทศการสอน |
| `academic/timetable/page.tsx` | ตารางสอน |
| `academic/substitute/page.tsx` | จัดครูแทน |
| `academic/settings/page.tsx` | ตั้งค่าวิชาการ |
| `academic/exam/page.tsx` | ข้อสอบ/สอบ |
| `academic/exam/omr/` | OMR (กระดาษคำตอบ) — create, scan |
| `academic/exam/analysis/[id]/page.tsx` | วิเคราะห์ข้อสอบ |
| `academic/exam/review/[id]/page.tsx` | ตรวจข้อสอบ |
| `academic/competency/page.tsx` | สมรรถนะ PA/PD |
| `academic/facility/page.tsx` | ทรัพยากร/สถานที่ (จากวิชาการ) |
| `academic/planning/` | แผนงาน — curriculum, versions, sandbox, workload, readiness-rules, workflow-config, calendar, resources, reports |

### Facility Module (`(app)/facility/`)

| Route | หน้าที่ |
|---|---|
| `facility/page.tsx` | จองสถานที่/ยานพาหนะ |
| `facility/settings/page.tsx` | ตั้งค่าระบบจอง |
| `facility/_components/` | FacilityBookingForm, FacilityApprovalView, FacilityUnifiedCalendar, etc. |

### HR Module (`(app)/hr/`)

| Route | หน้าที่ |
|---|---|
| `hr/competency/page.tsx` | สมรรถนะ (HR view) |
| `hr/attendance/page.tsx` | ลงเวลา (HR view) |
| `hr/leave/page.tsx` | การลา (HR view) |
| `hr/leave/request/page.tsx` | ยื่นคำขอลา (HR) |
| `hr/leave/history/page.tsx` | ประวัติ (HR) |
| `hr/leave/approvals/page.tsx` | อนุมัติ (HR) |
| `hr/leave/reports/page.tsx` | รายงาน (HR) |

### Other Routes

| Route | หน้าที่ |
|---|---|
| `budget/page.tsx` | ระบบงบประมาณ |
| `personnel/settings/page.tsx` | ตั้งค่าบุคลากร |
| `admin/recycle-bin/page.tsx` | ถังขยะ (Recycle Bin) |
| `general/facility/page.tsx` | จองทั่วไป |
| `general/document/page.tsx` | หนังสือทั่วไป |
| `general/repair/page.tsx` | แจ้งซ่อมทั่วไป |

---

## 📡 API Routes (`src/app/api/`)

| Path | หน้าที่ |
|---|---|
| `api/auth/` | Authentication (Better Auth) |
| `api/cron/` | Cron jobs |
| `api/repair/` | Repair API |
| `api/signatures/` | Signature upload/verification |
| `api/omr/` | OMR processing API |
| `api/print-legacy/` | Legacy print endpoint |
| `api/amss-test/` | AMSS integration test |

---

## ⚡ Server Actions (`src/app/actions/`)

### leave.ts (~2535 บรรทัด) — ระบบการลา
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `submitLeaveRequest` | L197 | ยื่นคำขอลา |
| `getPaginatedLeaveHistory` | L376 | ประวัติการลา (paginated) |
| `getDashboardStats` | L572 | สถิติ Dashboard |
| `getPendingApprovals` | L917 | รายการรออนุมัติ |
| `approveLeaveRequest` | L982 | อนุมัติคำขอลา |
| `rejectLeaveRequest` | L1250 | ไม่อนุมัติคำขอลา |
| `cancelLeaveRequest` | L1412 | ยกเลิกคำขอลา |
| `editLeaveRequest` | L1446 | แก้ไขคำขอ |
| `getLeaveRequestForPrint` | L1719 | ข้อมูลสำหรับพิมพ์ |
| `getBatchLeaveRequestsForPrint` | L2017 | พิมพ์แบบ Batch |
| `uploadLeavePdf` | L2336 | Upload PDF ไป Drive |
| `getCalendarLeaves` | L2493 | ข้อมูลปฏิทินการลา |
| `calculateLeaveDays` | L61 | คำนวณวันลา |
| `getMyLeaveUsageForCurrentCycle` | L1660 | สรุปการใช้วันลาในรอบปัจจุบัน |
| `adminDeleteLeaveRequest` | L1487 | Admin ลบคำขอ |
| `getSystemLogs` | L1584 | ดึง System Logs |
| `pruneSystemLogs` | L1639 | ลบ Logs เก่า |
| `getStaffList` | L520 | รายชื่อบุคลากร |

### document.ts (~1677 บรรทัด) — หนังสือราชการ
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `saveDocDraft` | L112 | บันทึกร่างหนังสือ |
| `quickIssueDoc` | L186 | ออกเลขหนังสือแบบด่วน |
| `issueDocNumber` | L211 | ออกเลขหนังสือ |
| `cancelDoc` | L365 | ยกเลิกหนังสือ |
| `restoreDoc` | L415 | กู้คืนหนังสือ |
| `softDeleteDoc` | L462 | Soft delete |
| `updateOutboundDoc` | L500 | แก้ไขหนังสือส่ง |
| `requestDocAction` | L569 | ขออนุมัติ/ลงนาม |
| `approveDocRequest` | L627 | อนุมัติคำขอหนังสือ |
| `rejectDocRequest` | L691 | ไม่อนุมัติคำขอ |
| `getDocumentsList` | L842 | รายการหนังสือ |
| `getDocumentDetails` | L826 | รายละเอียดหนังสือ |
| `issueActivityCertificatesBatch` | L1019 | ออกเกียรติบัตรแบบ Batch |
| `verifyCertificatePublic` | L1322 | ตรวจสอบเกียรติบัตร (Public) |
| `saveCertificateTemplateAction` | L1360 | บันทึก Template เกียรติบัตร |

### facility.ts (~1909 บรรทัด) — จองสถานที่/ยานพาหนะ
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `reserveFacilityAction` | L240 | จองสถานที่/รถ |
| `reviewFacilityReservationHeadAction` | L589 | หัวหน้าตรวจสอบ |
| `approveFacilityReservationDirectorAction` | L717 | ผอ.อนุมัติ |
| `rejectFacilityReservationAction` | L812 | ไม่อนุมัติ |
| `cancelFacilityReservationAction` | L855 | ยกเลิก |
| `completeVehicleTripAction` | L951 | ปิดงานรถ |
| `getFacilityResourcesAction` | L1009 | ดึงรายการทรัพยากร |
| `getFacilityReservationsAction` | L1046 | ดึงรายการจอง |
| `createFacilityResourceAction` | L1227 | สร้างทรัพยากรใหม่ |
| `updateFacilityResourceAction` | L1363 | แก้ไขทรัพยากร |
| `getFacilitySettingsAction` | L1802 | ดึงการตั้งค่า |

### omr.ts (~1852 บรรทัด) — ระบบข้อสอบ OMR
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `createExamPaperAction` | L113 | สร้างกระดาษข้อสอบ |
| `updateExamPaperAction` | L181 | แก้ไขข้อสอบ |
| `configureAnswerKeyAction` | L275 | ตั้งเฉลย |
| `ingestExamSubmissionAction` | L1086 | นำเข้ากระดาษคำตอบ |
| `listExamPapersAction` | L892 | รายการข้อสอบ |
| `getExamPaperDetailsAction` | L977 | รายละเอียดข้อสอบ |
| `generatePrintedSheetsAction` | L1523 | พิมพ์กระดาษคำตอบ |
| `calculateExamItemAnalysisAction` | L1579 | วิเคราะห์ข้อสอบ |
| `createRegradeJobAction` | L438 | สร้างงาน Regrade |

### incoming.ts (~1317 บรรทัด) — หนังสือเข้า
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `addRoutingStep` | L494 | เพิ่มขั้นตอนเดินเรื่อง |
| `resolveRoutingStep` | L541 | ปิดขั้นตอน |
| `skipRoutingStep` | L624 | ข้ามขั้นตอน |
| `getMyPendingRouting` | L667 | รายการรอดำเนินการ |
| `getIncomingDocsList` | L691 | รายการหนังสือเข้า |
| `getIncomingDocDetails` | L730 | รายละเอียดหนังสือเข้า |
| `syncAMSSDocumentsFromHtml` | L788 | Sync จาก AMSS |

### attendance.ts (~1077 บรรทัด) — ระบบลงเวลา
> (ดู function index ด้วย `Select-String` — ไฟล์นี้ export ผ่าน pattern ที่ไม่ใช่ standard)

### settings.ts (~1102 บรรทัด) — ตั้งค่าระบบ
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `getSystemSettings` | L148 | ดึงการตั้งค่า |
| `updateSystemSettings` | L395 | อัปเดตการตั้งค่า |
| `getLeaveConfigs` | L800 | ดึงกฎวันลา |
| `updateLeaveConfig` | L826 | อัปเดตกฎวันลา |
| `updateLeaveRules` | L682 | อัปเดตเงื่อนไขลา |
| `getEligibleInspectors` | L325 | ดึงรายชื่อผู้ตรวจ |
| `updateDefaultInspector` | L357 | ตั้งผู้ตรวจเริ่มต้น |
| `setImpersonationCookie` | L850 | Impersonate (dev/debug) |
| `updateAppointedDuties` | L969 | จัดการมอบหมายงาน |
| `getSimpleUsersList` | L902 | รายชื่อผู้ใช้ (แบบย่อ) |

### admin.ts (~1007 บรรทัด) — บริหารจัดการ
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `getNotifications` | L86 | ดึงการแจ้งเตือน |
| `getAllUsers` | L171 | ดึงรายชื่อผู้ใช้ทั้งหมด |
| `updateUserProfile` | L310 | แก้ไขโปรไฟล์ผู้ใช้ |
| `approveUser` | L372 | อนุมัติผู้ใช้ |
| `suspendUser` | L384 | ระงับผู้ใช้ |
| `deleteUser` | L400 | ลบผู้ใช้ |
| `getMonthlyReport` | L477 | รายงานรายเดือน |
| `getCycleReport` | L512 | รายงานรอบการประเมิน |
| `getCanonicalLeaveReportDTO` | L587 | รายงานการลา (Canonical) |
| `resetUserPasswordByAdmin` | L779 | รีเซ็ตรหัสผ่าน |
| `createUserByAdmin` | L799 | สร้างผู้ใช้ใหม่ |
| `importUsersByAdmin` | L874 | Import ผู้ใช้จากไฟล์ |

### holiday.ts (~810 บรรทัด) — วันหยุด
> จัดการวันหยุดราชการ, import/export, ตรวจสอบวันหยุด

### archive.ts (~732 บรรทัด) — สำรอง/กู้คืน
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `archiveCurrentCycle` | L42 | Archive รอบปัจจุบัน |
| `backupSettings` | L136 | สำรองการตั้งค่า |
| `restoreBackup` | L177 | กู้คืนจาก Backup |
| `exportLeaveBackup` | L270 | Export ข้อมูลการลา |
| `importLeaveBackup` | L351 | Import ข้อมูลการลา |

### project-budget.ts (~776 บรรทัด) — งบประมาณ
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `createProjectAction` | L335 | สร้างโครงการ |
| `createActivityAction` | L335 | สร้างกิจกรรม |
| `recordExpenseAction` | L431 | บันทึกค่าใช้จ่าย |
| `approveExpenseAction` | L487 | อนุมัติค่าใช้จ่าย |
| `transferBudgetAction` | L521 | โอนงบ |
| `getFiscalYearDashboardAction` | L545 | Dashboard ปีงบ |
| `simplifiedDisburseBudgetAction` | L752 | เบิกจ่ายงบ |

### privacy_actions.ts (~675 บรรทัด) — PDPA/Privacy
| Function | บรรทัด | หน้าที่ |
|---|---|---|
| `fetchCurrentPolicies` | L127 | ดึงนโยบาย |
| `recordRegistrationPolicyAcknowledgments` | L153 | บันทึกการยอมรับ |
| `checkUserPolicyAcknowledgmentStatus` | L256 | ตรวจสอบสถานะ |
| `acknowledgePolicyForCurrentUser` | L368 | ยอมรับนโยบาย |
| `getUserPrivacyProfileForUser` | L460 | ดึงโปรไฟล์ Privacy |
| `withdrawUserConsentForUser` | L524 | ถอนความยินยอม |

### Other Action Files
| ไฟล์ | บรรทัด | หน้าที่ |
|---|---|---|
| `dashboard-widgets.ts` | ~478 | Widget data สำหรับ Dashboard |
| `curriculum-workflow.ts` | ~481 | Workflow หลักสูตร |
| `recycle-bin.ts` | ~423 | ถังขยะ (soft delete/restore) |
| `attendance-stats.ts` | ~305 | สถิติการลงเวลา |
| `academic-planning.ts` | ~288 | แผนวิชาการ |
| `workload-policy.ts` | ~264 | นโยบายภาระงาน |
| `user.ts` | ~255 | จัดการผู้ใช้ |
| `document-settings.ts` | ~231 | ตั้งค่าหนังสือ |
| `logs.ts` | ~151 | ระบบ Logs |
| `competency.ts` | ~119 | สมรรถนะ |
| `exam.ts` | ~110 | ข้อสอบ (ทั่วไป) |
| `upload.ts` | ~91 | Upload ไฟล์ |
| `monitoring.ts` | ~91 | Monitoring/Telemetry |
| `attendance-leave-sync.ts` | ~41 | Sync ลงเวลา-การลา |
| `auth_actions.ts` | ~39 | Auth helpers |
| `telemetry.ts` | ~18 | Telemetry |

---

## 🧩 Components (`src/components/`)

| Directory | หน้าที่ |
|---|---|
| `components/ui/` | Shadcn/UI base components |
| `components/shared-ui/` | Shared composite components |
| `components/providers/` | React context providers |
| `components/omr/` | OMR-specific components |
| `components/privacy/` | Privacy/consent components |
| `components/layout/` | Layout components |

---

## 🏗️ Feature Modules (`src/features/`) — Clean Architecture

### `features/supervision/` — นิเทศการสอน
| ไฟล์ | หน้าที่ |
|---|---|
| `manifest.ts` | Module manifest |
| `domain/schemas/supervision-rubric.schema.ts` | Rubric schema |
| `domain/schemas/outbox-event.schema.ts` | Outbox event schema |
| `domain/types/supervision.types.ts` | Type definitions |
| `application/use-cases/director-sign.use-case.ts` | Use case: ผอ.ลงนาม |
| `ui/actions/supervision-actions.ts` | Server actions |
| `ui/components/supervision-matrix-grid.tsx` | Matrix grid UI |

### `features/document/` — หนังสือราชการ (Clean Arch)
| ไฟล์ | หน้าที่ |
|---|---|
| `manifest.ts` | Module manifest |
| `application/use-cases/acknowledge-and-report.use-case.ts` | รับทราบ-รายงาน |
| `application/use-cases/create-executive-directive.use-case.ts` | สร้างคำสั่ง |
| `application/use-cases/issue-outbound-doc.use-case.ts` | ออกหนังสือส่ง |
| `application/services/certificate-upload.service.ts` | Upload เกียรติบัตร |
| `application/services/certificate-verification.service.ts` | ตรวจสอบเกียรติบัตร |
| `domain/events/document-action-submitted.event.ts` | Domain event |
| `domain/types/document.types.ts` | Type definitions |
| `domain/utils/thai-date.ts` | วันที่ภาษาไทย |
| `ui/actions/incoming-actions.ts` | Server actions (หนังสือเข้า) |
| `ui/components/` | cert-qr-code, incoming-directive-modal, print-container, routing-timeline, slide-over-sheet, forms/, settings/ |
| `ui/hooks/` | use-document-data, use-document-filters |
| `ui/modals/` | cancel-doc-modal, confirm-action-modal |
| `ui/views/` | cert-view, inbound-view, outbound-view, outbound-history-view |

---

## 📚 Libraries (`src/lib/`)

### Core Utilities
| ไฟล์ | หน้าที่ |
|---|---|
| `auth.ts` | Authentication config (Better Auth) |
| `auth-session.ts` | Session management |
| `auth-client.ts` | Auth client-side |
| `db.ts` | Database connection |
| `prisma.ts` | Prisma client singleton |
| `utils.ts` | General utilities |
| `crypto.ts` | Cryptographic utilities |
| `permissions.ts` / `permissions.js` | Permission checks |
| `feature-flags.ts` | Feature flags |
| `i18n.tsx` | Internationalization |

### Leave & Attendance
| ไฟล์ | หน้าที่ |
|---|---|
| `cycle.ts` | วงรอบการลา (ต.ค.-ก.ย.) |
| `date-format.ts` | จัดรูปแบบวันที่ |
| `sla.ts` | SLA calculations |
| `attendance-utils.ts` | Attendance helpers |
| `academicYearUtils.ts` | ปีการศึกษา |

### Document & Media
| ไฟล์ | หน้าที่ |
|---|---|
| `document-utils.ts` | Document helpers |
| `sequence.ts` | Running number sequence |
| `line-notify.ts` | LINE notification |
| `notifications.ts` | Notification system |
| `upload-with-progress.ts` | Upload with progress |
| `client-image-compression.ts` | Client-side image compression |
| `vector-signature.ts` | Vector signature handling |
| `signature-token.ts` / `.js` | Signature token generation |
| `svg-sanitizer.ts` | SVG sanitization |
| `report-export.ts` | Report export |
| `attachment-utils.ts` | Attachment utilities |
| `storage-resolver.ts` | Storage resolution |

### AMSS Integration
| ไฟล์ | หน้าที่ |
|---|---|
| `amss-parser.ts` | AMSS data parser |
| `amss-list-parser.ts` | AMSS list parser |

### Sub-libraries
| Path | หน้าที่ |
|---|---|
| `lib/services/timetableService.js` | ตารางสอน |
| `lib/services/recommendationService.js` | ระบบแนะนำ |
| `lib/services/substituteWorkflowService.js` | จัดครูแทน |
| `lib/services/excelImportService.js` | Import Excel |
| `lib/services/printTemplateService.js` | Template พิมพ์ |
| `lib/services/sropCoreService.js` | SROP core |
| `lib/services/academicSettingsService.ts` | ตั้งค่าวิชาการ |
| `lib/services/examService.ts` | ข้อสอบ |
| `lib/services/competencyService.ts` | สมรรถนะ |
| `lib/services/facilityReservationService.ts` | จองสถานที่ |
| `lib/services/budgetDisbursementEngine.js` | เบิกจ่ายงบ |
| `lib/services/omrTemplateService.ts` | OMR Template |
| `lib/timetable/` | Timetable solver (types, constraints, solvers) |
| `lib/srop/types.ts` | SROP types |
| `lib/omr/` | OMR engine, template geometry, grid, forensic, marker detector |
| `lib/privacy/` | consent-service, policy-service, ropa-service, diff-utils |
| `lib/facility/FacilityKpiContract.ts` | Facility KPI |

---

## ⚙️ Services (`src/services/`)

| ไฟล์ | หน้าที่ |
|---|---|
| `supervisionService.js` | ระบบนิเทศ |
| `archive.service.ts` | สำรอง/กู้คืน |
| `audit.service.ts` | Audit trail |
| `photo.service.ts` | จัดการรูปภาพ |
| `repair.service.ts` | แจ้งซ่อม |
| `report.service.ts` | รายงาน |
| `readinessEngine.ts` | ตรวจความพร้อม |
| `workflowEngine.ts` | Workflow engine |
| `academicCalendarEngine.ts` | ปฏิทินวิชาการ |
| `resourceCapacityEngine.ts` | วิเคราะห์กำลังทรัพยากร |
| `planningSandboxEngine.ts` | Sandbox แผนงาน |
| `curriculumPublishingService.ts` | เผยแพร่หลักสูตร |
| `etuCalculator.ts` | คำนวณ ETU |
| `project-budget.service.ts` | งบประมาณโครงการ |

---

## 🗃️ Database (Prisma)

- **Schema:** `prisma/schema.prisma`
- **Models:** ~130 models (User, LeaveRequest, Attendance, DocumentRecord, FacilityReservation, ExamPaper, ExamSubmission, Project, BudgetSource, Student, etc.)
- **Key models for leave:** User, LeaveRequest, LeaveConfig, LeaveArchive, Holiday
- **Key models for document:** DocumentRecord, DocumentTemplate, IncomingDocument, DocumentRouting, CertificateIssuedItem
- **Key models for facility:** FacilityResource, FacilityReservation, ReservationResourceAssignment, FacilityApprovalStep
- **Key models for academic:** ExamPaper, ExamSubmission, ExamAnswerKey, TimetableSlot, SupervisionSession
- **Key models for budget:** FiscalYear, BudgetSource, Project, ProjectActivity, ActivityExpense

---

## 📦 Other Directories

| Path | หน้าที่ |
|---|---|
| `scripts/` | Utility/migration scripts |
| `eLeave/` | Legacy leave-specific files |
| `public/` | Static assets (images) |
| `backups/` | Backup files |
| `scratch/` | Temporary scratch files |
| `docs/adr/` | Architecture Decision Records |
| `docs/handoff/` | Handoff documents (UI/UX Guide) |
| `src/constants/permissions.ts` | Permission constants |
| `src/core/` | Core domain (event-publisher, module-manifest, domain-event) |
| `src/events/eventCatalog.ts` | Event catalog |
| `src/repositories/` | photo.repository, repair.repository |
| `src/workers/omrScanner.worker.ts` | OMR scanner Web Worker |

---

## 🎯 Structural Line Anchor Hints (พิกัดโครงสร้างคร่าวๆ สำหรับไฟล์แกนหลัก)
> **แนวทางปฏิบัติ:** เลขบรรทัดในตารางนี้คือ **"พิกัดคร่าวๆ (Structural Hints)"** สำหรับช่วยจัดวางขอบเขต ไม่ใช่ความจริงสัมบูรณ์ (เพราะอาจเลื่อนได้หลังการแก้ไข) หากต้องการหาจุดนิยามหรือ Caller ที่แน่นอน ให้ใช้ Single-line search (`Select-String`) เสมอ ก่อนเปิดอ่านแบบ Read-Minimum with Dependencies

### 1. `src/app/(app)/layout.tsx` (1,783 บรรทัด)
| ส่วนประกอบ / ฟังก์ชัน | บรรทัด | หน้าที่ |
|---|---|---|
| Imports, Types & Permission Consts | L1–L60 | Lucide icons, hooks, DEFAULT_PERMISSIONS |
| `NotificationBell` Component | L61–L244 | กระดิ่งแจ้งเตือน, Badge นับจริง, Modal แจ้งเตือน Responsive |
| `UserAvatarDropdown` Component | L245–L351 | แคปซูลโปรไฟล์ผู้ใช้ขวาสุด, เมนูโปรไฟล์, PDPA, ปุ่มออกจากระบบ |
| `DEFAULT_PERMISSIONS` Object | L352–L362 | สิทธิ์พื้นฐานรายโมดูล |
| `CollapsibleGroup` Component | L363–L485 | กลุ่มเมนูพับได้ใน Sidebar (สไตล์ SMS ภาพที่ 2) |
| `AppLayout` Shell & State Hooks | L486–L560 | สถานะ Sidebar, Theme, Language, Fullscreen |
| Settings & Duty Loaders | L561–L850 | ดึงชื่อ/โลโก้โรงเรียน, สิทธิ์หน้าที่, AMSS |
| User Role Resolution | L855–L908 | คำนวณ `effectiveUser`, `isAdmin`, `isApprover` |
| SubItems Nav Configuration | L909–L1060 | เมนูย่อย: การลา, สารบรรณ, แจ้งซ่อม, ทรัพยากร, วิชาการ, งบ |
| `renderNavItem` Function | L1061–L1140 | เรนเดอร์ปุ่มเมนู Sidebar (สไตล์ SMS มินิมอล, แบดจ์ Admin สีม่วง) |
| Access Control & Mobile Nav Items | L1141–L1180 | `checkPermission`, แถบเมนูด้านล่างบนมือถือ |
| Impersonation Mode Banner | L1181–L1215 | แถบสีส้มจำลองสิทธิ์ผู้ใช้ |
| Sidebar Shell & Overlay | L1216–L1233 | `<aside>` desktop 256/72px & mobile drawer |
| Sidebar Brand Header | L1234–L1275 | โลโก้, ร.ร.กุดจับประชาสรรค์, ปุ่มปิด `[✕]` |
| Sidebar Top Home Link | L1276–L1300 | ปุ่ม "หน้าหลัก" แคปซูลสีน้ำเงิน (`Home` icon, ไม่มีลูกศร) |
| Classroom Portal Shortcut | L1301–L1315 | ลิงก์สู่ระบบจัดการชั้นเรียน |
| Sidebar Group 1: บุคคล | L1316–L1345 | ลงเวลา, แฟ้ม PA, ระบบการลา |
| Sidebar Group 2: ทั่วไป | L1346–L1410 | จองทรัพยากร, สารบรรณ, แจ้งซ่อม |
| Sidebar Group 3: วิชาการ | L1411–L1530 | ศูนย์วิชาการ, OMR, ตารางสอบ, ตารางสอน, นิเทศ, วางแผน |
| Sidebar Group 4: งบประมาณ | L1531–L1555 | บริหารงบประมาณ & เบิกจ่าย |
| Sidebar Group 5: ตั้งค่า & โปรไฟล์ | L1556–L1585 | ตั้งค่าระบบ, บุคคล, Logs, Profile, PDPA |
| Sidebar Bottom Logout Button | L1586–L1615 | ปุ่ม `[→ ออกจากระบบ]` ทรงแคปซูลขอบน้ำเงิน สไตล์ภาพที่ 2 |
| Top Header Bar (SMS Reference) | L1616–L1725 | เมนูแฮมเบอร์เกอร์, วันที่ภาษาไทย, ค้นหา, [T], [TH], [🌙], [⛶], [🔔], User Capsule |
| Main Page Content & Bottom Nav | L1726–L1783 | แสดง `{children}` และแถบเมนูด้านล่างมือถือ |

### 2. `prisma/schema.prisma` (3,228 บรรทัด)
| โมเดลหลัก | บรรทัด | หน้าที่ |
|---|---|---|
| Datasource & Generator | L1–L10 | Postgres & prisma-client-js |
| `User`, `Account`, `Session` | L11–L115 | บุคลากร, การยืนยันตัวตน, Session |
| `LeaveRequest`, `LeaveType`, `LeaveBalance` | L116–L240 | ระบบการลา, วันลาคงเหลือ, ชนิดการลา |
| `Attendance`, `WorkShift`, `AttendanceNonce` | L241–L450 | ระบบลงเวลา, กะการทำงาน, สแกนใบหน้า |
| `DocumentRecord`, `IncomingDocument`, `DocumentRouting` | L451–L750 | ทะเบียนหนังสือราชการ, หนังสือเข้า AMSS, เกษียณ |
| `RepairRequest`, `RepairPhoto`, `RepairComment` | L751–L920 | แจ้งซ่อม, รูปถ่ายหน้างาน, ความเห็นช่าง |
| `FacilityResource`, `FacilityReservation` | L921–L1120 | ทรัพยากรส่วนกลาง, ยื่นจองห้อง/รถ |
| `TimetableSlot`, `TimetableVersion`, `Offering` | L1121–L1800 | ตารางสอน, เวอร์ชันตาราง, รายวิชา |
| `SupervisionSession`, `SubstituteRecord` | L1801–L2200 | การนิเทศการสอน, บันทึกสอนแทน |
| `ExamPaper`, `ExamSubmission`, `OmrSheet` | L2201–L2550 | คลังข้อสอบ, ผลสอบ OMR, การตรวจกระดาษคำตอบ |
| `FiscalYear`, `Project`, `ActivityExpense` | L2551–L3228 | งบประมาณ, แผนงานโครงการ, บันทึกการเบิกจ่าย |

### 3. `src/app/actions/dashboard-widgets.ts` (557 บรรทัด)
| ฟังก์ชัน / ข้อมูล | บรรทัด | หน้าที่ |
|---|---|---|
| `interface DashboardWidgetConfig` | L8–L41 | โครงสร้างคอนฟิกวิดเจ็ต 24 ตัว |
| `DEFAULT_WIDGET_CONFIG` | L43–L77 | ค่ามาตรฐานระบบเริ่มต้น (เปิดครบ ไม่โล่ง) |
| `getDashboardWidgetConfig(userId?)` | L80–L120 | ดึงค่าคอนฟิกส่วนตัว หรือค่ามาตรฐานสถานศึกษาที่ Admin กำหนด |
| `saveDashboardWidgetConfig(newConfig, opts)` | L121–L195 | บันทึกวิดเจ็ต (รองรับ `saveAsDefault` สำหรับ Admin) |
| `resetUserWidgetConfigToDefault()` | L196–L255 | คืนค่าของครูให้กลับไปใช้ค่ามาตรฐานโรงเรียน |
| `SchoolManagementExecutiveStats` | L256–L300 | Types สถิติบูรณาการ 5 ระบบย่อย |
| `getSchoolManagementExecutiveStats()` | L301–L557 | รวบรวมสถิติจริงจาก DB ทุกโมดูล |

### 4. `src/app/(app)/dashboard/_components/ExecutiveLeaveDashboardView.tsx` (566 บรรทัด)
| ส่วนประกอบ / ฟังก์ชัน | บรรทัด | หน้าที่ |
|---|---|---|
| States & Data Loading | L53–L130 | โหลดสถิติ, จัดการ localStorage, Event listener ปรับแต่งวิดเจ็ต |
| Approval Actions Handler | L131–L220 | อนุมัติ/ปฏิเสธการลาแบบเรียลไทม์ |
| Top Action Toolbar | L266–L300 | ปุ่ม `[↻ รีเฟรช]` และ `[⚙ ปรับแต่งวิดเจ็ต]` บนสุดของหน้า |
| Row 1: SMSHeroBanner | L301–L315 | แบนเนอร์ผู้บริหารและปรัชญาโรงเรียน |
| Row 1.5: SubsystemQuickHub | L316–L360 | แถบสถานะย่อ 5 ระบบย่อย |
| Row 2: ExecutiveLeaveStatCards | L361–L410 | ตารางการ์ด KPI รวม 11 ตัว |
| Row 3: SMS Charts (Academic & Attendance) | L411–L440 | กราฟผลสัมฤทธิ์ 8 กลุ่มสาระ & โดนัทเช็คชื่อรายวัน |
| Row 4: SMSOperationsStrip | L441–L470 | สรุปงบประมาณ, หนังสือ, แจ้งซ่อม, ทรัพยากร |
| Row 5–8: Detail Analytics & Approval Queue | L471–L530 | คิวตรวจใบลา, แนวโน้มรายเดือน, สถิติกิจการนักเรียน |
| Floating Controls & Customizer Modal | L531–L566 | ปุ่มลอยยกสูง (`bottom-20`), Drill-down Modal, Widget Customizer |

### 5. `src/app/(app)/dashboard/_components/DashboardWidgetCustomizerModal.tsx` (682 บรรทัด)
| ส่วนประกอบ / ฟังก์ชัน | บรรทัด | หน้าที่ |
|---|---|---|
| `WIDGET_METADATA` Array | L64–L250 | รายการวิดเจ็ตทั้ง 24 ตัวพร้อมไอคอนและหมวดหมู่ |
| Handlers & Toggles | L251–L310 | เปิดทั้งหมด, ปิดทั้งหมด, สลับรายตัว |
| `handleResetToAdminDefault` | L311–L340 | คืนค่าเป็นค่ามาตรฐานสถานศึกษาที่ Admin กำหนด |
| `handleSave(asDefaultOverride)` | L341–L385 | บันทึกค่า (แยกเคสแอดมินบันทึกค่าระบบกลาง vs ครูบันทึกส่วนตัว) |
| Header & Admin Guidance Banner | L386–L475 | หัวข้อ Modal และแบนเนอร์แจ้งสิทธิ์แอดมินพร้อม Checkbox |
| Search & Filter Pills | L476–L520 | ค้นหาวิดเจ็ต & แท็บตัวกรอง |
| Widget Items List | L521–L630 | รายการการ์ดวิดเจ็ต ปุ่มสลับเปิด-ปิด |
| Modal Footer Action Buttons | L631–L682 | ปุ่ม `[ใช้ค่ามาตรฐานตามที่แอดมินกำหนด]`, `[รีเซ็ตทั้งหมด]`, `[บันทึก]` |

---

## 🤖 Antigravity Agent Orchestration & Progressive Disclosure System

### 1. Scoped Rules (`.agent/rules/`)
| ไฟล์กฎ | Trigger | หน้าที่ & ขอบเขต |
|---|---|---|
| `.agent/rules/token-efficiency.md` | `always_on` | กฎประหยัด Token v2.0, Targeted View, Single-line pre-filter search |
| `.agent/rules/database.md` | `glob` (`prisma/**`, `src/repositories/**`) | Zero Orphaned Accounts, Transaction Integrity, Safe Migration |
| `.agent/rules/architecture.md` | `glob` (`src/**`, `lib/**`) | Clean Architecture 3 ชั้น, Lean Server Actions, Strict Typing |
| `.agent/rules/security.md` | `glob` (`src/app/actions/**`, `src/app/api/**`) | Session Validation, RBAC Authorization, Zod Validation, PDPA |
| `.agent/rules/frontend.md` | `glob` (`src/app/**`, `src/components/**`) | Server vs Client Components, Hydration Safety, KP Design System |
| `.agent/rules/test-data-and-account-safety.md` | `glob` (`tests/**`, `scripts/**`) | Forensic Teardown Protocol with Trigger Suppression |
| `.agent/rules/plan-versioning.md` | `glob` (`docs/**`, `*plan*.md`) | แผนงานเวอร์ชันนิ่ง, Revision Changelog, Supersede Rule |
| `.agent/rules/handoff.md` | `model_decision` | บันทึกสถาปัตยกรรมระดับองค์กร และสรุป Milestone ข้าม Session |

### 2. Progressive Disclosure Skills (`.agent/skills/`)
| Skill Name | โฟลเดอร์ | หน้าที่ |
|---|---|---|
| `inspect-task` | `.agent/skills/inspect-task/SKILL.md` | สำรวจพิกัดบรรทัดและตั้งงบประมาณ Token ก่อนแตะโค้ด |
| `implement-feature` | `.agent/skills/implement-feature/SKILL.md` | แก้ไขโค้ดแบบ Surgical Diff ด้วย `replace_file_content` |
| `verify-change` | `.agent/skills/verify-change/SKILL.md` | รัน Scoped Vitest, คุม Loop-Break และตรวจความสะอาด DB |
| `html-planner` | `.agent/skills/html-planner/SKILL.md` | สร้างแผนงานแบบ Interactive HTML Plan |
| `grill-doc` | `.agent/skills/grill-doc/SKILL.md` | สัมภาษณ์และเจาะลึกสถาปัตยกรรมก่อนลงมือทำ (ADRs) |
| `ui-ux-pro-max` | `.agent/skills/ui-ux-pro-max/SKILL.md` | แนวทางออกแบบ UI/UX สวยงาม ทันสมัยตามมาตรฐานสากล |
| `handoff` | `.agent/skills/handoff/SKILL.md` | ส่งต่องานข้าม Session ก่อนบริบทบวม |

### 3. Usage & Token Ledger (`.agent/ledger/`)
| ไฟล์ | หน้าที่ |
|---|---|
| `.agent/ledger/token-ledger.json` | ฐานข้อมูลสถิติ JSON ติดตาม Token Saved, Tool Calls, ผลลัพธ์ Test |
| `.agent/ledger/token-ledger.md` | เอกสารรายงานสรุปผลลัพธ์ประสิทธิภาพและวิธีคำนวณ Token แบบโปร่งใส |

