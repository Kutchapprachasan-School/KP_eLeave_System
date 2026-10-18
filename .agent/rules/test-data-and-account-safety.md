# Test Data & Account Safety Rules

1. **Zero Orphaned Test Accounts:** ห้ามสร้างหรือทิ้งบัญชีผู้ใช้และข้อมูลทดสอบค้างไว้ในฐานข้อมูล Production โดยเด็ดขาด
2. **Daily Test Isolation:** สคริปต์ใน `npm test` ปกติต้องเป็น Unit Test หรือใช้ Mock Repository ที่ไม่ยิงเข้าฐานข้อมูลจริง
3. **Transactional Rollback Pattern (สำหรับการทดสอบที่ต้องแตะ DB):**
   - ห้ามรัน `ALTER TABLE ... DISABLE TRIGGER USER;` บนฐานข้อมูลที่ใช้งานร่วมกับระบบจริง เพราะจะเกิด Table Lock ชนกับ `FOR UPDATE NOWAIT`
   - บังคับใช้เทคนิค **Intentional Rollback Transaction**: ให้รันชุดทดสอบภายใน `prisma.$transaction` แล้วโยน Custom Error (`throw new Error('ROLLBACK_TEST_TRANSACTION')`) ในบรรทัดสุดท้ายของบล็อก เพื่อบังคับให้ PostgreSQL Rollback ข้อมูลทั้งหมดออกอัตโนมัติ 100% แม้เทสต์จะพังกลางคัน
