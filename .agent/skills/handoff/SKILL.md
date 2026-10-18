---
name: handoff
description: สกิลมาตรฐานสำหรับ AI Agent ในการสรุปผลและส่งมอบงาน (Session Handoff) เมื่อครบกำหนด Milestone พร้อมขั้นตอนตรวจสอบความสะอาดของโค้ด สารบัญอัตโนมัติ และ Zero-Switch Deployment
---

# 📋 Session Handoff Skill & Protocol (v3.1)

เมื่อทำงานย่อยสะสมครบ **3–5 งานย่อย**, เมื่อครบ **15 tool calls**, หรือเมื่อสิ้นสุด Milestone สำคัญ AI Agent ต้องเรียกใช้สกิลนี้เพื่อจัดทำบันทึกส่งมอบงาน (Handoff Document) และเตรียมความพร้อมก่อนขึ้น Session ใหม่

---

## 🔍 Pre-Handoff Mandatory Checklist (สิ่งที่ต้องทำก่อนเขียน Handoff)

ก่อนที่จะสรุปรายงานส่งมอบงาน Agent ต้องปฏิบัติตามลำดับขั้นตอนด้านความสะอาดและความปลอดภัยดังนี้:

1. **🔄 Synchronize Codebase Index:**
   - รันคำสั่ง `npm run index:sync` ใน Terminal เพื่อให้สคริปต์คำนวณเลขพิกัดบรรทัดใหม่ใน `CODEBASE_INDEX.md` อย่างแม่นยำ 100%
   - **ห้าม** แก้ไขเลขบรรทัดใน `CODEBASE_INDEX.md` ด้วยตนเองเด็ดขาด
2. **🧹 Clear Scratchpad Logs:**
   - ตรวจสอบว่าไฟล์ Log ชั่วคราวในโฟลเดอร์ `scratch/` ถูกละเว้นไม่นำเข้า Git (`.gitignore`)
3. **🚀 Verify Zero-Switch Deployment Status:**
   - ตรวจสอบว่าโค้ดทั้งหมดพัฒนาและผ่านการทดสอบบนกิ่ง `dev` เรียบร้อยแล้ว
   - **ห้าม** สั่ง `git checkout main` บน Working Tree ของ Google Drive เพื่อป้องกันปัญหาไฟล์ล็อก `.git/index.lock` และ Turbopack Cache พัง

---

## 📝 โครงสร้างบันทึกส่งมอบงาน (5-Part Handoff Template)

บันทึก Handoff ที่สร้างขึ้นต้องมีโครงสร้างครบถ้วน 5 ส่วนดังนี้:

### 1. Summary of Work Accomplished
- สรุปงานที่ทำสำเร็จในรอบ Session นี้ (ระบุเลข Version แผนงาน เช่น `v1.2 (Rev. 2)` อิงตาม `.agent/rules/plan-versioning.md`)
- รายชื่อฟีเจอร์หรือปัญหาที่ได้รับการแก้ไข

### 2. Strict User Directives & Rules Applied
- กฎเหล็กหรือข้อกำหนดพิเศษที่ผู้ใช้เน้นย้ำใน Session นี้
- การปฏิบัติตามหลัก 3-Layer Architecture และ Zero Trust Security (`auth()`, RBAC)

### 3. Database & System Architecture Updates
- การเปลี่ยนแปลงโครงสร้าง Prisma Schema หรือการเพิ่ม Migration (ห้ามรัน `prisma migrate reset` เด็ดขาด)
- สถานะการใช้ Atomic Transaction และ Global Row-Locking (`SELECT ... FOR UPDATE NOWAIT` เรียง PK น้อยไปมาก)

### 4. Key Code Locations & Formatting Engines
- พิกัดไฟล์สำคัญที่ถูกแก้ไขในรอบนี้ โดยอ้างอิงเลขบรรทัดจาก `CODEBASE_INDEX.md`
- รายละเอียด Server Actions และ Client Components ที่เกี่ยวข้อง

### 5. Verification & Zero-Switch Deployment Status
- ผลลัพธ์การทดสอบ (`npm test`) และการ Build
- คำสั่งยืนยันการส่งโค้ดขึ้น Production ด้วยวิธี **Zero-Switch** (ดันโค้ดจากกิ่ง `dev` ตรงไปที่ `main` โดยไม่ต้องสลับ Working Tree ในเครื่อง):
  ```bash
  npm run index:sync
  git add . && git commit -m "chore(handoff): finalize milestone [ชื่อฟีเจอร์]"
  git push origin dev
  git push origin dev:main
  ```

---

## 🎯 ตัวอย่างการเรียกใช้งาน
เมื่อใกล้ครบโควตา Token หรือจบงานตามแผน ให้ Agent พิมพ์สรุปผลตามเทมเพลต 5 ส่วนนี้ลงในแชทหลัก พร้อมแจ้งผู้ใช้ว่าพร้อมสำหรับการขึ้น Session ถัดไปแล้ว
