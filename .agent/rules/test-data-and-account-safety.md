# กฎความปลอดภัยด้านบัญชีผู้ใช้และข้อมูลทดสอบในฐานข้อมูล (Test Data & Account Safety Protocol)

**บังคับใช้กับ:** AI Agents ทุกตัว, Developers, และทุกสคริปต์ทดสอบ (Tests/Scripts) ในโปรเจกต์นี้  
**วันที่มีผลบังคับใช้:** 2026-09-18  

---

## 📌 1. กฎเหล็ก: ห้ามทิ้งบัญชีทดสอบและข้อมูลตกค้างในฐานข้อมูล (Zero Orphaned Test Accounts)

> **"ฐานข้อมูล Production ต้องมีเฉพาะบุคลากรจริงของโรงเรียนเท่านั้น ห้ามมีบัญชีทดสอบหลงเหลือเด็ดขาด (จำนวนบุคลากรจริงสามารถเพิ่มขึ้นหรือลดลงได้ตามการบริหารงานบุคคลจริง)"**

1. **ห้ามสร้างบัญชีผู้ใช้ทดสอบทิ้งไว้ในตาราง `User`:**
   - ทุกครั้งที่มีการทดสอบ หากจำเป็นต้องสร้างผู้ใช้ทดสอบ ต้องมีการลบทิ้ง (Teardown Cleanup) ให้เกลี้ยง 100% เสมอในบล็อก `after()`
   - บุคลากรจริงของโรงเรียน (ครู/เจ้าหน้าที่): ห้ามสคริปต์หรือกระบวนการทดสอบใดๆ ทำการลบ แก้ไข หรือแตะต้องบัญชีจริงโดยพลการเด็ดขาด

2. **ห้ามรวม Test ที่เขียนลง Database จริงเข้ากับคำสั่ง `npm test` ปกติ:**
   - คำสั่ง `npm test` ต้องเป็น Unit Test / In-Memory Mock เท่านั้น ที่รันได้รวดเร็วและไม่สร้างมลพิษข้อมูลใน Database
   - เทสต์ที่เป็น Database Integration / Forensic Invariant ให้แยกเป็นคำสั่งเฉพาะ เช่น:
     - `npm run test:student-affairs`
   - ห้ามใส่สคริปต์ที่มี `prisma.user.create/upsert` หรือ `INSERT INTO "User"` เข้าไปใน `npm test` แบบไม่มี teardown

---

## 📌 2. มาตรฐานการ Teardown ล้างข้อมูลทดสอบ (Teardown with Trigger Suppression)

ตารางหลายตารางในระบบ (เช่น `CctExportManifest`, `StudentMeritNomination`, `ExamItemSubmission`, `ExamItemOverride`) มี Forensic Triggers ป้องกันการลบข้อมูล (Mutation / Deletion Guard) 

ดังนั้น บล็อก `after()` ของไฟล์ทดสอบที่ต้องลบข้อมูล ต้องปฏิบัติตามลำดับ 4 ขั้นตอนนี้เสมอ:

```javascript
after(async () => {
  if (!client) return;
  try {
    // ขั้นตอนที่ 1: ปิด Trigger ชั่วคราว (Trigger Suppression)
    await client.query('ALTER TABLE "CctExportManifest" DISABLE TRIGGER USER;');
    await client.query('ALTER TABLE "StudentMeritNomination" DISABLE TRIGGER USER;');
    await client.query('ALTER TABLE "ExamItemSubmission" DISABLE TRIGGER USER;');
    await client.query('ALTER TABLE "ExamItemOverride" DISABLE TRIGGER USER;');

    // ขั้นตอนที่ 2: ลบข้อมูลตารางลูกตามลำดับ Foreign Key (Child-First Cascade)
    // ลบ Attendance, ScheduledSession, Submissions, ExamPaper, ฯลฯ

    // ขั้นตอนที่ 3: เปิด Trigger กลับคืนสู่สถานะเดิมเสมอ (Re-enable Triggers)
    await client.query('ALTER TABLE "CctExportManifest" ENABLE TRIGGER USER;');
    await client.query('ALTER TABLE "StudentMeritNomination" ENABLE TRIGGER USER;');
    await client.query('ALTER TABLE "ExamItemSubmission" ENABLE TRIGGER USER;');
    await client.query('ALTER TABLE "ExamItemOverride" ENABLE TRIGGER USER;');

    // ขั้นตอนที่ 4: ลบบัญชีผู้ใช้ทดสอบออกจากตาราง "User"
    await client.query('DELETE FROM "User" WHERE "id" = ANY($1)', [testUserIds]);
  } catch (err) {
    console.error('Teardown cleanup failed:', err);
  } finally {
    await client.end();
  }
});
```

---

## 📌 3. การตรวจสอบความสะอาดของฐานข้อมูลหลังรันงาน (Post-Verification Protocol)

ก่อนปิดงานหรือส่งมอบงานให้ผู้ใช้ทุกครั้ง AI Agent ต้องตรวจสอบว่าไม่มีบัญชีทดสอบตกค้างในฐานข้อมูลด้วยคำสั่ง:

```sql
-- ต้องได้ผลลัพธ์ 0 แถวเสมอ (ไม่มีบัญชีทดสอบตกค้าง)
SELECT id, email, name FROM "User" 
WHERE email LIKE '%test%' 
   OR email LIKE '%mock%' 
   OR name LIKE '%ทดสอบ%'
   OR name LIKE '%Test%'
   OR id LIKE 'test-%'
   OR id LIKE 'mock-%';
```

หากพบว่ามียอดบัญชีทดสอบเกิดขึ้น ต้องดำเนินการล้างออกทันทีก่อนตอบผู้ใช้
