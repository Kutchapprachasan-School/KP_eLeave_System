---
trigger: glob
globs: "src/app/**/_components/**, src/components/**, src/app/**/page.tsx, src/app/**/layout.tsx"
description: "Next.js App Router conventions, React Server vs Client Component boundaries, hydration safety, Tailwind design system, and responsive UI."
---

# 🎨 Frontend & UI/UX Engineering Rules

> **บังคับใช้เมื่อ:** พัฒนาหรือแก้ไขหน้าจอ (Pages), Layouts, Components, Modals, หรือสไตล์ Tailwind ในโปรเจกต์ KP e-Leave

---

## 1. Server vs Client Component Boundaries

- **Default เป็น Server Component:** ไฟล์ `page.tsx` และ `layout.tsx` ควรถือเป็น Server Component ดั้งเดิมเพื่อทำ Data Fetching และ SEO ที่รวดเร็ว
- **ใส่ `'use client'` เฉพาะที่จำเป็น:**
  - เมื่อมี State (`useState`, `useReducer`) หรือ Effects (`useEffect`)
  - เมื่อมี Event Handlers (`onClick`, `onChange`, `onSubmit`)
  - เมื่อใช้ Browser APIs (`window`, `localStorage`, `navigator`)
- แยก Interactive Parts ออกมาเป็นชิ้นเล็กๆ ในโฟลเดอร์ `_components/` แทนที่จะประกาศทั้งหน้าเป็น Client Component

---

## 2. Hydration Safety & Client-Only Rendering

- ห้ามใช้เงื่อนไข `typeof window !== 'undefined'` ภายใน JSX เพราะจะทำให้เกิด **Hydration Mismatch Warning**
- หากจำเป็นต้อง Render ข้อมูลเฉพาะบน Client (เช่น วันที่ตาม Local Timezone หรืออ่านค่าจาก LocalStorage):
  ```typescript
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) return <SkeletonLoader />;
  ```

---

## 3. KP School Design System & Visual Fidelity

- **Color Tokens:**
  - Primary / Brand: Blue (`blue-600`, `blue-700`) & Slate Neutral (`slate-900`, `slate-700`, `slate-500`, `slate-100`)
  - Status Indicators: Emerald (`emerald-600` - อนุมัติ), Amber (`amber-500` - รอตรวจ), Rose (`rose-600` - ปฏิเสธ), Indigo (`indigo-600` - ผู้บริหาร)
- **Icons:** ใช้ `lucide-react` สม่ำเสมอทั่วทั้งระบบ (ขนาดมาตรฐาน `w-4 h-4` หรือ `w-5 h-5`)
- **Spacing & Radius:** ใช้ Tailwind Utility Classes ที่ได้มาตรฐาน (`rounded-xl` หรือ `rounded-2xl` สำหรับ Card/Container)
- **Responsive Standard:** รองรับ Mobile Viewport (iPhone/Android, 375px+), Tablet (iPad 768px+), และ Desktop (1280px+) ทุกหน้าจอต้องไม่ล้นจอหรือแตก

---

## 4. UI State & Feedback

- การกระทำที่มีผลกับฐานข้อมูล (Mutations) ต้องมี Loading State (`isPending` หรือ Spinner) และ Disable ปุ่มชั่วคราวเพื่อป้องกัน Double Submission
- แสดงผลการทำงานผ่าน Toast Notification หรือ Inline Alert ที่ชัดเจน
- จัดเตรียม Skeleton หรือ Fallback Placeholder สำหรับสภาวะกำลังโหลดข้อมูล (Suspense)
