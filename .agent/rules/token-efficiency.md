# Token Efficiency & Context Control Rules

ป้องกันปัญหา Quadratic Context Explosion ด้วยกฎเหล็ก 6 ข้อ:

1. ✂️ **Targeted View Only:** ห้ามเปิดอ่านไฟล์ที่มีขนาดเกิน 100 บรรทัดแบบทั้งไฟล์ บังคับเช็กพิกัดจาก `CODEBASE_INDEX.md` แล้วระบุ `StartLine` และ `EndLine` เสมอ
2. 🔄 **Milestone Handoff:** ตัดตอนบริบททุก 3–5 งานย่อย หรือเมื่อครบ 15 tool calls เพื่อสรุป Handoff ขึ้น Session ใหม่ก่อน Context เต็ม
3. 🧠 **Smart Model Routing:** งานสำรวจ ค้นหา หรืออ่านโค้ด ให้กระจายงานไปยัง Subagent ด้วยโมเดลความเร็วสูง (Flash) สงวนโมเดลหลักไว้สำหรับการออกแบบสถาปัตยกรรมและแก้ไข Logic ซับซ้อน
4. 🗄️ **Scratchpad Output Redirect (Collision-Safe):** คำสั่ง Terminal ที่ให้ผลลัพธ์เกิน 50 บรรทัด (เช่น `npm test`, `npm run build`) ต้อง Redirect ลงไฟล์ตามรูปแบบ `scratch/[task-name]-[timestamp].log` เสมอเพื่อป้องกันการเขียนทับกัน จากนั้นอ่านเฉพาะช่วงบรรทัดที่เกิด Error (ห้ามนำโฟลเดอร์ `scratch/` เข้า Git)
5. 🐝 **Ephemeral Subagent Swarm:** ส่ง Subagent แยกค้นหาใน Sandbox ของตัวเอง แล้วส่งกลับเฉพาะข้อสรุปสั้นๆ ไม่ทิ้ง Raw Log ลงในแชทหลัก
6. 📑 **Automated Codebase Index Sync:**
   - **ก่อนแก้โค้ด:** เปิดอ่าน `CODEBASE_INDEX.md` เพื่อดูเลขบรรทัดเริ่มต้นและสิ้นสุดของฟังก์ชันหรือโมเดล
   - **หลังแก้โค้ดเสร็จ:** **ห้ามนับและแก้เลขบรรทัดใน `CODEBASE_INDEX.md` ด้วยตัวเอง** ให้รันคำสั่ง `npm run index:sync` ใน Terminal ทุกครั้งเพื่อให้สคริปต์คำนวณเลขบรรทัดใหม่ที่แม่นยำ 100%
