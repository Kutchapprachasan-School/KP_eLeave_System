# 📋 Design Handoff: Pastel Anime Education Dashboard & Executive Hub

เอกสารส่งมอบงานออกแบบและโครงสร้าง UI/UX (Design Handoff Specification) สำหรับระบบบริหารจัดการชั้นเรียนและแดชบอร์ดผู้บริหารระบบการลา (KP Classroom Management & SuraLeave Executive Hub)

---

## 📋 1. สถานะปัจจุบัน (Current Status)

- **ชื่องาน/ฟีเจอร์หลัก:** Master Design System (15 Pillars) & Executive Leave Dashboard Hub
- **สถานะรวม:** ✅ **ออกแบบและขึ้นโครงสร้างเสร็จสมบูรณ์แล้ว (Implemented & Ready for Production Verification)**
- **Repositories ที่เกี่ยวข้อง:**
  1. **ระบบจัดการชั้นเรียน (Classroom Repo - Design Origin):** `c:\dev\09 ระบบจัดการชั้นเรียน`
  2. **ระบบการลา (Leave Repo - Target Implementation):** `G:\My Drive\01 Web app\01 ระบบการลา`

---

## 🎨 2. Master Design System Architecture (15 Visual & UX Pillars)

ระบบออกแบบตามหลักการ **"Clean first, cute second"** สไตล์ Modern Educational SaaS ผสมผสาน Soft Pastel Anime โดยยึดภาษาไทยเป็นหลัก (Thai-First)

### 2.1 Design Tokens มาตรฐาน (Exact Tokens)
| ประเภท Token | รหัสสี (Hex) | การใช้งาน |
|:---|:---|:---|
| **Primary Base** | `#3B82F6` (Blue 500) | ปุ่ม Primary CTA, Tab ที่ Active, Focus Ring |
| **Primary Hover** | `#2563EB` (Blue 600) | สถานะ Hover ของปุ่มหลัก |
| **Primary Soft** | `#EFF6FF` (Blue 50) | พื้นหลัง Badge หรือพื้นที่เน้นย้ำแบบนุ่มนวล |
| **Primary Border** | `#BFDBFE` (Blue 200) | เส้นขอบการ์ดที่ถูกเลือกหรือ Active Element |
| **Canvas Background**| `#F7FAFF` / `#F2F7FC` | พื้นหลังทั้งหน้าจอ (หลีกเลี่ยงพื้นหลังขาวจ้าหรือดำทึบ) |
| **Surface / Card** | `#FFFFFF` | พื้นหลังการ์ดและพาเนล |
| **Card Border** | `#E6EEF7` (1px solid) | ขอบการ์ดแบบบาง ไม่ใช้เส้นทึบหนา |
| **Text Primary** | `#163A66` | หัวข้อหลัก, ตัวเลขสรุป KPI, ข้อความสำคัญ |
| **Text Secondary** | `#6B7C93` | ข้อความอธิบายรอง, Header คอลัมน์ตาราง |
| **Text Muted** | `#94A3B8` | ข้อความเวลา, สถานะที่เสร็จแล้ว, Placeholder |
| **Success (Semantic)**| `#10B981` (Soft: `#ECFDF5`, Border: `#A7F3D0`, Text: `#065F46`) | อนุมัติแล้ว, ถูกต้อง, ครบถ้วน |
| **Warning (Semantic)**| `#F59E0B` (Soft: `#FFFBEB`, Border: `#FDE68A`, Text: `#92400E`) | รอดำเนินการ, รออนุมัติ, คั่งค้าง |
| **Danger (Semantic)** | `#EF4444` (Soft: `#FEF2F2`, Border: `#FECACA`, Text: `#991B1B`) | ไม่อนุมัติ, ขาด, ลบ, ข้อผิดพลาด |
| **Accent / Special** | `#8B5CF6` (Soft: `#F5F3FF`, Border: `#DDD6FE`, Text: `#5B21B6`) | ฟีเจอร์พิเศษ, การประเมิน, ข้อมูลเชิงลึก |

### 2.2 Spacing, Radius & Elevation
- **Spacing Grid:** 8px Base (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`)
- **Card Padding:** `16px` – `24px`
- **Border Radius:**
  - Card & Container: `18px` (`rounded-[18px]` หรือ `16-20px`)
  - Button & Form Inputs: `12px` (`rounded-xl`)
  - Tags, Badges & Pills: `rounded-full` หรือ `8-10px`
  - Hero Banner & Modal: `20-24px` (`rounded-2xl` หรือ `rounded-3xl`)
- **Card Shadow:** `0 4px 16px rgba(40, 90, 140, 0.06)` (เงาสีน้ำเงินนุ่มนวล ห้ามใช้เงาดำทึบ)

### 2.3 Typography & Hierarchy
- **ฟอนต์หลัก:** Prompt, Noto Sans Thai, LINE Seed Sans Thai
- **ขนาดและน้ำหนัก:**
  - Page Title: 24–32px / Bold (700)
  - Section Title: 18–22px / SemiBold (600)
  - Card Title: 15–18px / SemiBold (600)
  - Body: 14–16px / Regular (400) หรือ Medium (500)
  - Caption / Metadata: 12–14px / Regular (400)
- **หลักเกณฑ์:** ไม่ใช้ตัวหนาพรำ่เพรื่อทุกจุด หัวข้อเด่นชัด เนื้อหาอ่านสบายตา

### 2.4 UX Visual State Rules (Importance-Driven Hierarchy)
> **"Visual hierarchy should reflect importance, not business status."**

1. **Incomplete / Pending (สิ่งที่ต้องทำ / ยังรอดำเนินการ):**
   - มี **Visual Priority สูงกว่า** วางไว้ด้านบน/ซ้ายเสมอ
   - ตัวหนังสือคมชัด คอนทราสต์สูง
   - ปุ่ม CTA ชัดเจน (เช่น ปุ่มอนุมัติสีสด, Border วงแหวนสีส้มกระพริบ Pulse)
2. **Completed (เสร็จสิ้น / อนุมัติแล้ว):**
   - ลด Visual Priority ลง เพื่อไม่แย่งสายตาจากงานที่ต้องทำ
   - ตัวหนังสือโทนอ่อน (`#94A3B8`) ปรับพื้นหลังเป็น Soft Green อ่อน ๆ
   - แสดงไอคอน Checkmark โดยไม่ซ่อนข้อมูล

### 2.5 Mobile-First & Data Presentation
- **No Horizontal Scroll:** ห้ามบังคับเลื่อนตารางแนวนอนบนมือถือ
- **Responsive Table-to-Card:** บนจอเล็ก (sm/md) ตารางคิวอนุมัติจะแปลงเป็น Stacked Cards อัตโนมัติ
- **Touch Targets:** ปุ่มกดและจุดสัมผัสขั้นต่ำ 44x44px

---

## 🛠️ 3. สิ่งที่ทำเสร็จแล้วในระบบการลา (Leave Repo Implementation)

### 3.1 โครงสร้างไฟล์คอมโพเนนต์ (`G:\My Drive\01 Web app\01 ระบบการลา`)
```text
src/app/
├── actions/
│   └── dashboard-widgets.ts                # Server Actions บันทึกและดึง Widget Config ของ Admin
└── (app)/
    └── dashboard/
        ├── page.tsx                        # Server Component ผูก ExecutiveLeaveDashboardView
        └── _components/
            ├── DashboardShell.tsx          # Shell ครอบ มีปุ่ม Toggle สลับ Hub ผู้บริหาร ↔ มุมมองทั่วไป
            ├── ExecutiveLeaveDashboardView.tsx # Orchestrator หลัก เชื่อมต่อ Server Actions
            ├── ExecutiveLeaveStatCards.tsx # 4 KPI Cards (เน้น Visual Pending Amber Pulse)
            ├── ExecutiveApprovalQueue.tsx  # คิวรออนุมัติ (Desktop Table + Mobile Cards)
            ├── ExecutiveLeaveCharts.tsx    # Recharts Donut + Mini Progress Bar รายกลุ่มสาระ
            ├── ExecutiveStudentLeaveOverview.tsx # วิดเจ็ตภาพรวมการลานักเรียน
            ├── ExecutiveLeaveDetailModal.tsx    # Drill-down Modal อนุมัติ/ไม่อนุมัติพร้อมเหตุผล
            ├── DashboardWidgetCustomizerModal.tsx # โมดอล Admin เปิด/ปิด 7 วิดเจ็ตแบบยืดหยุ่น
            └── LeaveDashboardClient.tsx    # มุมมองบุคลากรเดิม (ยังคงใช้งานได้ปกติ)
```

### 3.2 ความสามารถของระบบ Widget Customizer
Admin สามารถกดปุ่ม **"ปรับแต่ง Widget"** เพื่อเปิด-ปิดวิดเจ็ต 7 รายการ:
1. `statCards` (การ์ดสรุปตัวเลขสถิติ 4 มิติ)
2. `approvalQueue` (รายการคำขอรอการอนุมัติ)
3. `leaveTypeDistribution` (กราฟสัดส่วนประเภทการลา Donut Chart)
4. `departmentStats` (สถิติการลาแยกตามกลุ่มสาระ/ฝ่าย)
5. `studentLeaveOverview` (ภาพรวมการลานักเรียน)
6. `monthlyTrend` (แนวโน้มการลาประจำปี)
7. `upcomingLeave` (ปฏิทินผู้ลาในเร็วๆ นี้)

*การบันทึก:* บันทึกลงฟิลด์ JSON `rolePermissions.__dashboardWidgets` ในโมเดล `SystemSettings` ผ่าน Server Action โดยไม่ต้อง Migration ฐานข้อมูลใหม่

---

## 🔍 4. ข้อมูลการเชื่อมต่อฐานข้อมูล (Database & Data Binding Status)

> **โครงสร้างฐานข้อมูล:** ทั้งระบบจัดการชั้นเรียนและระบบการลาแชร์ **Neon PostgreSQL Database เดียวกัน** (`ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb`) ข้อมูลตารางทั้งหมด (Student, Attendance, LeaveRequest, SubstituteWorkflow ฯลฯ) อยู่ใน Schema เดียวกัน จึงดึงตรงผ่าน Prisma Client โดยไม่ต้องต่อข้าม API

| ข้อมูลบนหน้าจอ | แหล่งข้อมูลใน Neon DB | สถานะการเชื่อมต่อ | ผลลัพธ์จากการเชื่อมต่อจริง |
|:---|:---|:---:|:---|
| **รายการรออนุมัติ (Pending Queue)** | `prisma.leaveRequest` (status: PENDING*) | ✅ ต่อแล้ว | ดึงข้อมูลจริง กรองตามสิทธิ์ Role (Admin/Director/Dept Head) |
| **ปุ่มอนุมัติ/ไม่อนุมัติ** | `approveLeaveRequest` / `rejectLeaveRequest` | ✅ ต่อแล้ว | ทำงานได้ทันทีผ่าน Modal พร้อมระบุเหตุผล |
| **สัดส่วนประเภทการลา (Donut Chart)** | `getDashboardStats()` (`usedDaysMap`) | ✅ ต่อแล้ว | นำสถิติจริงมาแปลงเป็น Recharts Donut |
| **สถิติรายกลุ่มสาระ (Department Bars)** | `getDashboardStats()` (`deptStats`) | ✅ ต่อแล้ว | แสดงสถิติและ Progress bar จริง |
| **ผู้ลาวันนี้ (Staff On Leave Today)** | `prisma.leaveRequest` (APPROVED ในช่วงวัน) | ✅ ต่อแล้ว | นับจำนวนบุคลากรที่ลาตรงกับวันปัจจุบันจริง |
| **ครูสอนแทน (Proxy Teaching)** | `prisma.substituteWorkflow` + `extraFields` | ✅ ต่อแล้ว | ตรวจสอบงานมอบหมายสอนแทนในวันที่ระบุจริง |
| **สถิติการลงเวลาบุคลากร** | `prisma.attendance` (PRESENT, LATE, ABSENT) | ✅ ต่อแล้ว | ดึงยอดเข้างานและสายของวันปัจจุบันจริง |
| **จำนวนนักเรียนในระบบ** | `prisma.student` (ACTIVE) | ✅ ต่อแล้ว | ดึงยอดนักเรียนจริงจากตาราง `Student` (Zero Mock) |
| **อัตราการมาเรียน & เช็กแถวเช้า** | `prisma.studentMorningAttendance` | ✅ ต่อแล้ว | คำนวณจากแถวเช้าจริง (หากยังไม่เช็ก แสดงสถานะรอเช็ก ไม่ใช้ค่าหลอก) |
| **การลานักเรียน (ป่วย/กิจ)** | `prisma.studentMorningAttendance` + `StudentMedicalCertificate` | ✅ ต่อแล้ว | แยกป่วย (มีใบรับรองแพทย์) และกิจ จากข้อมูลจริง |
| **นักเรียนกลุ่มเสี่ยง (Risk EWS)** | `prisma.studentRiskAssessment` (HIGH/CRITICAL) | ✅ ต่อแล้ว | ดึงยอดเคสเฝ้าระวังความเสี่ยงจริง |

---

## 🎯 5. สรุปความพร้อมและการตรวจสอบ (Readiness & Verification)

1. **Zero Mock Compliance:**
   - ถอดค่าจำลองเดิม (เช่น ตัวเลขนักเรียนจำลอง 1,138 คน หรือ อัตรามาเรียนจำลอง 95.6%) ออกทั้งหมด
   - ทุกวิดเจ็ตแสดงผลจากข้อมูลจริงใน Neon DB เท่านั้น หากไม่มีการบันทึกจะแสดงเป็น Empty State / รอการบันทึกตามกฎเหล็ก
2. **การทดสอบรันหน้างาน:**
   - หน้ารองรับทั้ง Desktop และ Mobile
   - เข้าใช้งานได้ที่ `http://localhost:3001/dashboard` (พอร์ตของ `suraleave`)
   - ระบบ Admin ปรับแต่ง Widget บันทึกค่าย้อนกลับไปที่ `SystemSettings.rolePermissions` พร้อมใช้งานทันที

---

## 📁 6. R2-Only Storage for Documents & Attachments (กฎเหล็กเอกสารลง Cloudflare R2 เท่านั้น)

- **ไฟล์เอกสารและหลักฐานทุกประเภท ต้องจัดเก็บใน Cloudflare R2 เท่านั้น**:
  - **ใบรับรองแพทย์ (Medical Certificates)**: สแกนใบรับรองแพทย์ของนักเรียนและบุคลากร
  - **เอกสารแนบการลา (Leave Attachments)**: ใบคำขอลาและเอกสารหลักฐาน
  - **เอกสารราชการและสแกน (Document Records, Scans, Inbound/Outbound Routing)**
  - **ใบเสร็จ/หลักฐานการเงิน (Budget & Expense Receipts)**
  - **ไฟล์ PDF, สแกนหลักฐาน, ภาพถ่าย และลายเซ็นดิจิทัลทั้งหมด**
- **ข้อห้ามเด็ดขาด**:
  - ❌ ห้ามเก็บไฟล์เป็น Base64 หรือ Binary Blob ใน PostgreSQL / Neon DB เด็ดขาด
  - ในฐานข้อมูลให้เก็บเฉพาะ `storageKey` หรือ URL ภายนอกของ Cloudflare R2 เท่านั้น เพื่อรักษา Zero Egress และประสิทธิภาพฐานข้อมูล
