# Frontend, Next.js 16 & UI Rules

1. **Server-First Architecture:** หน้าเพจ (`page.tsx`, `layout.tsx`) ต้องเป็น Server Component โดยค่าเริ่มต้น แยกส่วนที่มี Interactive State ไว้ในโฟลเดอร์ `_components/` พร้อมระบุ `'use client'`
2. **Strict Serialization Boundary:** ข้อมูลที่ส่งจาก Server Component หรือ Server Action ข้ามไปยัง Client Component ต้องเป็น Plain Serializable Object เท่านั้น (แปลง `Decimal` เป็น `number`/`string`, แปลง `BigInt` เป็น `string` และแปลง `Date` เป็น ISO String ก่อนส่งออกเสมอ)
3. **Turbopack & Action Hygiene:** Server Actions ต้อง export ฟังก์ชันให้ครบถ้วนและไม่มี Dead Import ที่ทำให้ Turbopack Build ล้มเหลว
4. **Hydration Safety:** ห้ามใช้ `typeof window !== 'undefined'` หรือ `new Date()` ในการเรนเดอร์ JSX แรกเริ่ม ให้ใช้ `isMounted` state ภายใน `useEffect` เสมอ
5. **SODS UI Standard (อ้างอิงรายละเอียดเต็มใน `docs/handoff/UI_UX_DESIGN_SYSTEM_GUIDE.md`):**
   - ใช้โทนสีสุภาพทางการ (**Indigo / Slate / Emerald**) งดใช้สีส้มสด
   - ความสูงมาตรฐานของ Input และ Button คือ `44px` (`h-11`), Label ขนาด `14px` หนา (`text-sm font-semibold`), Header การ์ด `16px` หนาพิเศษ (`text-base font-bold`)
   - การ์ดแบบ Glassmorphism ต้องมีความทึบแสงขั้นต่ำ `bg-white/90` (หรือ `dark:bg-slate-900/90`) เพื่อให้ตัวหนังสือคมชัดบนหน้าจอคอมพิวเตอร์โรงเรียนทุกประเภท
