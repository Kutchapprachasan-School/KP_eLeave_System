# Project Handoff: CSS, UI & UX Design System

เอกสารนี้ทำหน้าที่เป็นคู่มือการส่งต่อระบบการออกแบบ (Design System), รูปแบบ CSS, และฟีเจอร์ UI/UX ที่โดดเด่นของระบบ **eLeave** เพื่อให้นำไปประยุกต์ใช้หรือพัฒนาต่อในโปรเจกต์อื่นๆ ได้อย่างมีประสิทธิภาพ

---

## 📋 สถานะปัจจุบันของระบบ (Current Status)
*   **Production URL**: [https://e-leave-system-kappa.vercel.app](https://e-leave-system-kappa.vercel.app)
*   ฟังก์ชันการใช้งานด้านการลาและการลงเวลาทำงาน (Time Attendance) ได้รับการปรับปรุงและอัปเกรดหน้าตาให้พรีเมียม สอดคล้องกับการใช้งานทั้งแบบ Light และ Dark Mode เป็นที่เรียบร้อยแล้ว

---

## ⚙️ 1. รายละเอียดระบบการออกแบบ (CSS & Design System)

ระบบใช้ **Tailwind CSS v4** ควบคู่กับ CSS Variables และ Custom Utility Classes เพื่อควบคุมหน้าตาเว็บให้ดูพรีเมียมและยืดหยุ่น

### 🎨 A. โทนสีและตัวแปรสีระบบ (Color Palette & Variables)
โทนสีหลักควบคุมผ่านตัวแปร CSS ในไฟล์ [globals.css](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/app/globals.css):
*   **Primary (สีหลัก)**: ใช้เฉดสีน้ำเงินคราม Indigo (`#4f46e5`, `#6366f1`, `#3730a3`)
*   **Accent (สีเน้น)**: เฉดสีเหลืองอำพัน Amber (`#f59e0b`, `#fbbf24`) สำหรับปุ่มเน้นหรือการแจ้งเตือน
*   **Status (สถานะ)**:
    *   *Success (สำเร็จ)*: สีเขียวมรกต Emerald (`#10b981`)
    *   *Danger (อันตราย)*: สีแดงกุหลาบ Rose/Red (`#ef4444`)
    *   *Warning (เตือน)*: สีส้มเหลือง Amber (`#f59e0b`)
    *   *Info (ข้อมูล)*: สีฟ้า Blue (`#3b82f6`)
*   **Sidebar (แถบเมนู)**:
    *   *Light Mode*: พื้นหลังสีกรมท่าครามเข้ม `#1e1b4b`
    *   *Dark Mode*: พื้นหลังสีน้ำเงินเข้มลึก `#0f0e26`

### ✍️ B. Typography & Fonts
*   **Noto Sans Thai**: ใช้เป็นฟอนต์หลักของระบบ โดยดึงผ่าน Google Fonts เพื่อความทันสมัยและอ่านง่ายบนหน้าจอ
*   **Sarabun (Embedded Base64)**: ฝังไฟล์ฟอนต์ Sarabun (WOFF2) ในรูปของ Base64 ลงในโค้ด CSS โดยตรง เพื่อให้หน้าพิมพ์ใบลา/พิมพ์รายงาน และการแปลงเป็น PDF แสดงผลฟอนต์ภาษาไทยได้เสถียรและถูกต้อง 100% แม้จะอยู่ในโหมดออฟไลน์หรือไม่มีการเชื่อมต่อเครือข่าย

### 🖥️ C. ขนาดและการปรับ Scale หน้าจอ
เพื่อรองรับการแสดงผลแดชบอร์ดที่มีข้อมูลหนาแน่น (High Information Density) ได้อย่างมีประสิทธิภาพ:
*   ปรับลดขนาดอักษรฐานลงเหลือ `font-size: 90%` ในแท็ก `html`
*   ใช้คุณสมบัติ `zoom: 0.9` ในแท็ก `body` เพื่อสเกลทุกอย่างในหน้าจอให้อ่านง่ายและไม่เทอะทะ

### ✨ D. Custom Utilities ที่สวยงามพรีเมียม
*   **Glassmorphism Card (`.glass-card`)**: การ์ดพื้นหลังโปร่งแสงที่มีการเบลอหลังฉาก (`backdrop-blur-xl`) และขอบกึ่งโปร่งแสง
*   **Gradient Text (`.gradient-text`)**: ข้อความไล่ระดับเฉดสีพรีเมียมจากครามส้มชมพู (`linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)`)
*   **Stat Card Hover (`.stat-card`)**: การ์ดแสดงผลตัวเลขที่มีการยกลอยขึ้นเล็กน้อยและมีมิติตัวเงาเรืองแสงครามเมื่อเมาส์ชี้ผ่าน (`translateY(-2px)` + เงาสี Indigo)
*   **Sidebar Link Active Indicator (`.sidebar-link-active`)**: ตัวระบุเมนูทำงานปัจจุบันที่มีแท่งสีส้มเหลือง Amber ไหล่เฉดไล่ระดับขนาบขอบซ้ายเมนู

---

## 🚀 2. โครงสร้าง UX/UI ที่โดดเด่นและสามารถนำไปใช้ใหม่ได้ (Reusable UX Patterns)

### 📂 A. แถบนำทางหลักและหน้ากากระบบ (App Layout Shell)
ไฟล์ต้นแบบ: [layout.tsx](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/app/(app)/layout.tsx)
*   **Responsive Sidebar**: แถบเครื่องมือซ้ายขนาดกว้าง 280px แสดงผลเสถียรบนจอใหญ่ และพับเก็บอัตโนมัติบนอุปกรณ์มือถือโดยมีหน้ากากเบลอฉากหลังกึ่งโปร่งใสคอยรองรับ
*   **Mobile Bottom Navbar**: บนจอมือถือ แถบเมนูด้านซ้ายจะถูกแปลงเป็นเมนูด้านล่างแบบแอปพลิเคชันมือถือ (Native-like Bottom Navigation) เพื่อการกดใช้งานที่สะดวกด้วยนิ้วโป้ง
*   **Floating Active Pill**: ใช้ `framer-motion` ควบคุม `layoutId="activeNav"` เพื่อให้พื้นหลังปุ่มเมนูที่ใช้งานสไลด์เปลี่ยนตำแหน่งอย่างลื่นไหลเมื่อเปลี่ยนหน้า
*   **Notification Panel**: กล่องการแจ้งเตือนสไตล์ดรอปดาวน์ลอยตัวพร้อมการขยายเปิดแบบมีมิติตามสัดส่วน (`y: 8`, `scale: 0.96`)

### 🔔 B. ระบบแจ้งเตือนไร้น้ำหนัก (Custom Toast Notifications)
ไฟล์ต้นแบบ: [toast-provider.tsx](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/components/toast-provider.tsx)
*   เป็นระบบการแจ้งเตือนพรีเมียมแบบลอยตัวกลางจอส่วนบน มีระบบหน่วงเวลาลบข้อความ และปุ่มกดยกเลิกแบบ Interactive
*   ความโดดเด่นคือไม่พึ่งพารายการเสริมภายนอก (Zero Dependency) ทำให้เว็บมีขนาดเล็กลงและประมวลผลเร็วขึ้นมาก

### 📅 C. ปฏิทินแสดงภาพรวม 12 เดือน (3x4 Yearly Calendar Grid)
ไฟล์ต้นแบบ: [dashboard/page.tsx:L1160-L1255](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/app/(app)/dashboard/page.tsx#L1160-L1255)
*   การวาง Layout แบบ 3 คอลัมน์ 4 แถว แสดงปฏิทินครบทุกเดือนในหน้านั้นๆ
*   แสดงผลการลา (เม็ดสีคราม) และวันหยุด (บล็อกสีแดงโรสสำหรับวันหยุดทั่วไป หรือสีอำพันสำหรับวันหยุดที่เป็นวันทำการ)
*   รองรับการเปลี่ยนโหมดมุมมองปฏิทินแบบละเอียดระดับสัปดาห์หรือรายเดือนได้ในคลิกเดียว

### 📊 D. Dynamic SVG Donut Chart
ไฟล์ต้นแบบ: [dashboard/page.tsx:L1340-L1388](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/app/(app)/dashboard/page.tsx#L1340-L1388)
*   ใช้สัญกรณ์ SVG ในตัวเขียนความยาวส่วนโค้งด้วยค่าคงที่ `circ = 439.82` และกำหนดสัดส่วนแบบสดๆ ผ่าน JavaScript ทำให้โหลดเร็วและจัดหน้าเรียบเนียนโดยไม่มีปัญหาภาพสะดุดขยับ (Layout Shift)

---

## 📝 3. รายการเช็คลิสต์และวิธีการคัดลอกไปโปรเจกต์อื่น (Porting Checklist)

1.  **คัดลอกไฟล์สไตล์**:
    *   คัดลอกโค้ดสไตล์ทั้งหมดใน [globals.css](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/app/globals.css) ไปวางทับไฟล์ CSS หลักของโปรเจกต์ใหม่
2.  **นำเข้าเครื่องมือจัดการคลาสและอนิเมชัน**:
    *   รันคำสั่งติดตั้งแพ็กเกจเหล่านี้ในโปรเจกต์ปลายทาง:
        ```bash
        npm install framer-motion lucide-react next-themes clsx tailwind-merge recharts
        ```
3.  **วางโครงสร้างแถบแจ้งเตือนลอยตัว (Toast Component)**:
    *   คัดลอก [toast-provider.tsx](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/components/toast-provider.tsx) ไปยังโฟลเดอร์ส่วนประกอบของแอปพลิเคชันใหม่
4.  **หุ้มแอปด้วยธีมและระบบแจ้งเตือน**:
    *   แก้ไขไฟล์เค้าโครงระดับบนสุดของโปรเจกต์ใหม่เพื่อหุ้ม Component ด้วย `next-themes` และ `ToastProvider`
5.  **คัดลอกการจัดหน้า Dashboard / Shell**:
    *   สามารถดึงเชลล์หลักจาก [layout.tsx](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/eLeave/src/app/(app)/layout.tsx) ไปเป็นโครงกระดูกหน้าเว็บใหม่ได้เลย

---

## 🗄️ 4. ระบบฐานข้อมูล (Database Provider)

*   **Database:** PostgreSQL บน **Supabase** (ไม่ใช่ Neon — เอกสารเก่าบางส่วนอาจระบุ Neon อยู่ เป็นข้อมูลที่ล้าสมัย)
*   **ORM:** Prisma
*   **Backup/Restore:** ใช้ Supabase Dashboard → Database → Backups (Point-in-Time Recovery)
*   **Auth:** BetterAuth (ไม่ใช่ Supabase Auth)
*   **Storage:** Google Drive ผ่าน Apps Script proxy (สำหรับ PDF/รูปใบลา)

---

## ⚡ 5. Session Handoff: วิเคราะห์ Vercel Egress & Performance (11 ส.ค. 2569)

### 📊 A. สถานะ Egress ที่พบ
*   **Vercel Free Plan:** 5 GB / 28 วัน
*   **ใช้ไปแล้ว:** 3.86 GB (~77%) — เป็นแค่ช่วง dev/test ยังไม่เปิดใช้จริง
*   **ประมาณการ 10 คนใช้งาน (ไม่แก้):** ~39–60 GB/เดือน (เกิน 8–12 เท่า)

### 🔴 B. ต้นเหตุหลัก Egress สูงที่ตรวจพบ

1.  **Static Assets ขนาดใหญ่ใน `public/manual/`:**
    *   `e-Leave_User_Guide.pdf` = **7.45 MB**
    *   `ระบบจัดการการลาออนไลน์ของโรงเรียน.png` = **4.62 MB** (PNG ไม่ได้บีบอัด)
    *   มีไฟล์ซ้ำ `Gemini_Generated_Image - Copy.png`
    *   **หมายเหตุ:** `/manual/` มี Cache-Control 30 วันอยู่แล้วใน `next.config.ts` แต่ static assets นอก path นี้ไม่มี cache

2.  **Client Bundle ขนาดใหญ่ (~2.5 MB+ ต่อหน้า):**
    *   `xlsx` (~800 KB) ถูก `import * as XLSX` แบบ Eager ใน **5 ไฟล์** (history, reports, settings, users, export-excel-button) — ทุกจุดใช้เฉพาะใน event handler จึง **เปลี่ยนเป็น dynamic import ได้ปลอดภัย 100%**
    *   `jsPDF`/`html2canvas` ถูก import แบบ Eager ใน `approvals/page.tsx` — เปลี่ยนเป็น dynamic ได้
    *   `recharts` import 18 components ใน `LeaveDashboardClient.tsx` แต่ใช้จริงแค่ 9 ตัว — ลบ 9 ตัวที่ไม่ใช้ออกได้

3.  **Dashboard โหลดหนัก:**
    *   [LeaveDashboardClient.tsx](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/dashboard/_components/LeaveDashboardClient.tsx) = **108.8 KB (1,870 บรรทัด)** เป็น `"use client"` ก้อนเดียว
    *   ยิง 6 Server Actions พร้อมกันเมื่อเปิด Dashboard
    *   หน้าหลัก 4 หน้าตั้ง `export const dynamic = 'force-dynamic'` ไม่มี caching

4.  **findMany 70+ จุดไม่มี pagination:**
    *   ส่วนใหญ่ไม่มี `take`/`skip` — ดึงข้อมูลทั้งตาราง
    *   พบ N+1 query ใน `archive.ts` L59 และ `leave.ts` L1790

5.  **ไม่มี Server-side Caching:**
    *   `unstable_cache` ไม่ได้ใช้เลย
    *   `React.cache` ใช้แค่ 2 จุดใน `leave.ts`

### ⚠️ C. ข้อค้นพบสำคัญเรื่อง `signatureUrl`

**ความเข้าใจที่ถูกต้อง:**
*   `signatureUrl` เก็บ Base64 ลายเซ็นดิจิทัล (50–500 KB/คน) ใน column `User.signatureUrl`
*   **16 ไฟล์** อ้างอิง `signatureUrl` — แบ่งเป็น 3 ประเภท:
    *   **(a) WRITE** (3 จุด): profile/page.tsx, user.ts, create-executive-directive.use-case.ts
    *   **(b) READ สำหรับแสดงผล/พิมพ์** (10 จุด): print pages, incoming docs, repair tickets — **จำเป็นต้องใช้**
    *   **(c) READ ใน bulk query** (3 จุด): admin.ts `getAllUsers`, repair/user.ts, leave.ts batch print
*   **`getAllUsers()` ใน admin.ts ไม่ได้ส่ง Base64 ไป Client** — แปลงเป็น boolean `hasSignature` ก่อน return → ไม่กระทบ Vercel Egress โดยตรง (กระทบ Supabase Egress แทน)
*   **ต้องตรวจสอบ:** BetterAuth session อาจรวม `signatureUrl` ใน session user object (กำหนดใน `auth.ts` L58 เป็น `additionalFields`) → อาจส่ง Base64 ทุก request

### 🛡️ D. กฎเหล็กเรื่อง Middleware

> **ห้ามแก้ไข logic ภายใน `middleware.ts` เด็ดขาด เมื่อต้องการเปลี่ยนเฉพาะ static file matching**

Middleware ปัจจุบันทำหน้าที่สำคัญ:
1.  ตรวจสอบ BetterAuth session cookie
2.  Redirect ไป `/login` ถ้าไม่มี session
3.  ตรวจสอบ Feature Flags (attendance, document enable/disable)
4.  Redirect ออกจาก `/login` ถ้า login แล้ว

**สิ่งที่ทำได้:** แก้เฉพาะ `matcher` regex เพื่อข้ามไฟล์ static:
```typescript
// ✅ ปลอดภัย — แก้เฉพาะ matcher
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf|woff2?)$).*)"],
};
```

### 📋 E. แผนแก้ไข Egress ที่ยังรอดำเนินการ

**Phase 1 (Quick Wins ~1.5 ชม., ลด ~40-50%):**
- [x] Dynamic import `xlsx` (5 ไฟล์)
- [x] Dynamic import `jsPDF`/`html2canvas` ใน approvals
- [x] เพิ่ม `minimumCacheTTL: 2592000` ใน `next.config.ts`
- [x] เพิ่ม Cache-Control สำหรับ static assets ทั่วไป
- [x] แก้ middleware matcher (เฉพาะ regex)
- [x] ลบไฟล์ภาพส่วนเกินใน `public/manual/` รวม **>5.5 MB** (`Gemini_Generated_Image - Copy.png`, `Gemini_Generated_Image_i56paci56paci56p.png`, `ระบบจัดการการลาออนไลน์ของโรงเรียน.png`)
- [x] ลบ recharts unused imports (9 ตัว)

**Phase 2 (Optimization & Client-Side Caching):**
- [x] สร้างโมดูล `src/lib/client-cache.ts` สำหรับ LocalStorage Caching พร้อมระบบ TTL & User Key Isolation
- [x] ใช้กลยุทธ์ **Stale-While-Revalidate (SWR)** สำหรับวันหยุดและตั้งค่าระบบใน `LeaveDashboardClient.tsx` (เรนเดอร์ 0ms จากเครื่อง + อัปเดตเบื้องหลัง)
- [x] ใช้กลยุทธ์ **Action-Triggered Invalidation** เมื่อผู้ใช้อัปเดตการตั้งค่า และสั่ง `clearAllClientCaches()` เมื่อกด Logout
- [x] ลบ `signatureUrl` จาก `getAllUsers` + ใช้ Set lookup (ประหยัด Supabase DB Egress ~14 MB/call)
- [x] แยก `MonthlyTrendChart` เป็น dynamic component (`{ ssr: false }`) ลด bundle โหลดแรก Dashboard ลง ~350 KB
- [x] ใส่ `prefetch={false}` บน `<Link>` เมนูหลักทั้งหมดใน `layout.tsx` (Sidebar, Header, Mobile Bottom Nav) เพื่อป้องกันการแอบยิง Prefetch ขยะบนมือถือ
- [ ] ตรวจสอบ BetterAuth session payload

**Phase 3 (Long-term):**
- [ ] เพิ่ม `unstable_cache` สำหรับ holidays, settings
- [ ] Pagination สำหรับ list pages (findMany 70+ จุด)
- [ ] พิจารณา Vercel Pro ($20/เดือน, 1 TB Egress)
