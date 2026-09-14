# คู่มือแนวทางการออกแบบ UI/UX ระบบบริหารสถานศึกษา (Design System Handoff Guide)
**School Operations Design System (SODS) — Alignment Reference with Leave Subsystem (`/request`)**

---

## 🎨 1. ปรัชญาการออกแบบ (Design Philosophy)

1. **เน้นครูใช้งานง่าย สบายตา ไม่ซับซ้อน (Teacher-Centric Simplicity)**:
   - ลด Cognitive Load ให้เหลือน้อยที่สุด
   - หน้าเริ่มต้น (Default Landing) ต้องเป็น **"หน้ายื่นคำขอ/แบบฟอร์ม"** เสมอ เพื่อให้เปิดมาแล้วพร้อมใช้งานทันที ไม่ต้องคลิกหาหลายชั้น
2. **ความสอดคล้องเชิงอัตลักษณ์ (Subsystem Visual Cohesion)**:
   - อ้างอิง Layout, Glassmorphism, Rounded Borders และ Color Tokens จากระบบการลา (`/request`) เป็นแม่แบบหลัก
3. **การเข้าถึงและการตอบสนอง (Responsive & Accessible)**:
   - รองรับการใช้งานทั้งบนจอคอมพิวเตอร์ แท็บเล็ต และสมาร์ตโฟน
   - รองรับ Light Mode และ Dark Mode อย่างกลมกลืน

---

## 📐 2. โครงสร้าง Layout มาตรฐาน (Standard Page Layout)

### 2.1 โครงสร้างแบบ 2 คอลัมน์ (2-Column Asymmetric Grid)
ใช้กับหน้ายื่นคำขอ (Request Portal) ทุกระบบย่อย:

```tsx
<div className="max-w-6xl mx-auto space-y-6">
  {/* 1. Header Section */}
  <div>
    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
      {pageTitle}
    </h1>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
      {pageSubtitle}
    </p>
  </div>

  {/* 2. Main Content Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Left Column (2 Cols): Form Container */}
    <div className="lg:col-span-2">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8 relative overflow-hidden">
        {/* Ambient Blur Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Form Body */}
      </div>
    </div>

    {/* Right Column (1 Col): Rules, Status & Guidelines Container */}
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Rule / Guideline Content */}
      </div>
    </div>
  </div>
</div>
```

---

## 🎨 3. Color Tokens & Elevation

### 3.1 Surface & Containers (Glassmorphic Cards)
- **Card Background**: `bg-white/80 dark:bg-slate-900/80`
- **Backdrop Blur**: `backdrop-blur-xl`
- **Borders**: `border border-white/60 dark:border-slate-800`
- **Corner Radius**: `rounded-3xl` (cards), `rounded-xl` (inputs/buttons), `rounded-2xl` (modals/inner cards)
- **Shadow**: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`

### 3.2 Typography & Headings
- **Page Title (`h1`)**: `text-2xl font-bold tracking-tight text-slate-900 dark:text-white`
- **Page Subtitle**: `text-sm text-slate-500 dark:text-slate-400 mt-1`
- **Section Heading (`h2`/`h3`)**: `text-base font-bold text-slate-800 dark:text-slate-200`
- **Form Label**: `block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2`
- **Helper / Footnote Text**: `text-xs text-slate-400 dark:text-slate-500 leading-relaxed`

### 3.3 Form Inputs
- **Input / Select**: `w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all`
- **Input with Icon**: `pl-10` พร้อม `<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">`
- **Textarea**: `w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all`

### 3.4 Buttons
- **Primary Submit Button**:
  `h-12 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2`
- **Secondary / Cancel Button**:
  `h-12 px-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all`
- **Outline Action Button**:
  `h-10 px-4 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 font-medium text-xs transition-all`

---

## 🧭 4. Sidebar Navigation Hierarchy (CollapsibleGroup Standard)

เมื่อระบบย่อยมีหลาย View (เช่น ยื่นจอง, ปฏิทิน, ประวัติ, อนุมัติ, จัดการ):
- **ห้าม** รวมทุก View เป็นปุ่ม Tab แนวยาวในหน้าเดียวกัน (ป้องกัน God Component)
- **ให้แยกเป็น Sub-items ใน Sidebar Navigation** ภายใต้ `CollapsibleGroup` เดียวกัน

```tsx
// src/app/(app)/layout.tsx
const facilitySubItems = enableFacility
  ? [
      { href: "/general/facility?view=request", label: "ยื่นจองทรัพยากร", icon: CalendarPlus },
      { href: "/general/facility?view=calendar", label: "ปฏิทินการใช้ทรัพยากร", icon: Calendar },
      { href: "/general/facility?view=history", label: "ประวัติและคำขอของฉัน", icon: History },
      ...(isApprover ? [{ href: "/general/facility?view=approval", label: "ศูนย์พิจารณาอนุมัติ", icon: CheckSquare, badge: pendingCount }] : []),
      ...(isManager ? [{ href: "/general/facility?view=crud", label: "จัดการข้อมูลทรัพยากร", icon: Settings }] : []),
    ]
  : [];
```

---

## 📅 5. กฎเฉพาะสำหรับระบบปฏิทินจองทรัพยากร (Unified Calendar Rules)

1. **รวมปฏิทินในหน้าจอเดียว (Unified Calendar)**:
   - ปฏิทินเดียวแสดงทั้งห้องประชุมและรถโรงเรียนพร้อมกัน
   - ตัดปุ่มสลับโหมดแยกหน้าออก
2. **ตัวกรองทรัพยากร (Resource Dropdown Filter)**:
   - ทั้งหมด (All - Default)
   - ห้องประชุม (Meeting Rooms)
   - รถโรงเรียน (Vehicles)
3. **โหมดมุมมองเวลา (Time View Modes)**:
   - **รายสัปดาห์ (Week - Default)**: แสดงคอลัมน์จันทร์–อาทิตย์ พร้อมแถบเวลาการจอง
   - **รายเดือน (Month)**: ปฏิทิน 30/31 วัน แสดง Badge กิจกรรมในแต่ละวัน
   - **รายวัน (Day)**: ตาราง Timeline ละเอียดรายชั่วโมง (08:00 – 18:00)
4. **Color Badging**:
   - 🏢 ห้องประชุม: สีคราม / ม่วง (`bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300`)
   - 🚐 รถโรงเรียน: สีเขียวมรกต (`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300`)
   - 🟡 สถานะ PENDING: Badge สีอำพัน (`bg-amber-50 text-amber-700 border-amber-200`)
   - 🟢 สถานะ APPROVED: Badge สีเขียว (`bg-emerald-50 text-emerald-700 border-emerald-200`)
   - 🔴 สถานะ REJECTED/CANCELLED: Badge สีแดงอ่อน (`bg-rose-50 text-rose-700 border-rose-200`)
