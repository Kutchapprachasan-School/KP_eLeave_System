# Database & Prisma Rules

1. **No Destructive Commands:** ห้ามรัน `prisma migrate reset` หรือคำสั่งที่ลบข้อมูลตารางจริงโดยเด็ดขาด
2. **Schema Inspection:** ห้ามเปิดดู `prisma/schema.prisma` ทั้งไฟล์ ให้ค้นหาพิกัดบรรทัดของ `model` หรือ `enum` จาก `CODEBASE_INDEX.md` ก่อนเสมอ
3. **Atomic Transactions:** การแก้ไขข้อมูลที่กระทบตั้งแต่ 2 ตารางขึ้นไป ต้องครอบด้วย `prisma.$transaction` เสมอ
4. **Global Row-Locking Hierarchy (Deadlock Prevention):**
   - การตัดงบประมาณ การหักโควตาวันลา การจองสถานที่/ยานพาหนะ และการรันเลขหนังสือราชการ ต้องใช้ `SELECT ... FOR UPDATE NOWAIT` ภายใน Transaction
   - หากต้องล็อกหลายแถวพร้อมกัน **บังคับเรียงลำดับตาม Primary Key (`id`) จากน้อยไปมากเสมอ** เพื่อป้องกัน Deadlock 100%
5. **Graceful Soft-Delete:** ดักจับ Prisma Error `P2003` (Foreign Key Constraint Violation) ทุกครั้ง และเปลี่ยนไปอัปเดตสถานะเป็น `RETIRED` (Soft-Delete) แทนการลบแถวจริง
6. **R2-Only Storage for Documents & Attachments (Zero Base64 in DB):**
   - ไฟล์เอกสารและหลักฐานทุกประเภท (ใบรับรองแพทย์, ใบคำขอลา, สแกนหนังสือราชการ, ใบเสร็จการเงิน, PDF, ภาพถ่าย, ลายเซ็นดิจิทัล) **ต้องจัดเก็บใน Cloudflare R2 เท่านั้น**
   - **ข้อห้ามเด็ดขาด:** ห้ามเก็บไฟล์เป็น Base64 หรือ Binary Blob ใน PostgreSQL / Neon DB เด็ดขาด ให้บันทึกเฉพาะ `storageKey` หรือ URL ภายนอกเพื่อรักษา Zero Egress และประสิทธิภาพฐานข้อมูล
