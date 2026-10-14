---
name: implement-feature
description: Surgical and high-precision code modification. Implements requested features or fixes using replace_file_content with small contiguous diffs, strict comment preservation, zero regressions, and enterprise-grade type safety.
---

# 🛠️ Implement-Feature Skill (Phase 2: Surgical Modification)

## Purpose
ลงมือแก้ไขโค้ดด้วยความแม่นยำสูงสุด (Surgical Precision) โดยส่งเฉพาะ Diff ที่เปลี่ยนแปลงจริง ไม่แก้โค้ดนอกขอบเขต รักษา Comment และ Docstrings เดิมทั้งหมด 100%

---

## Workflow Steps

### Step 1: Pre-Edit Verification
1. ตรวจสอบพิกัด `StartLine` และ `EndLine` ที่ได้จาก Phase Inspect
2. อ่าน Target Chunk สั้นๆ เพื่อยืนยันว่า Indentation และ Syntax ตรงกับไฟล์จริง
3. ยืนยันว่าการเปลี่ยนแปลงไม่กระทบต่อ Invariants:
   - ไม่มี Hardcoded mock data ที่จะหลุดไป Production
   - ไม่ลบ Comments หรือ Documentation ที่มีอยู่เดิม

### Step 2: Surgical Editing with `replace_file_content`
1. ใช้ `replace_file_content` แทนการเขียนทับไฟล์ (`write_to_file` with overwrite)
2. ปรับแต่งเฉพาะบล็อกที่จำเป็น (Single Contiguous Block):
   - หากต้องแก้หลายจุดที่อยู่ห่างกัน ให้เรียกทีละจุด ไม่ควบรวมหลายร้อยบรรทัดเป็นบล็อกเดียว
3. ระบุ `Instruction` และ `Description` ที่ชัดเจน กระชับ ไม่เยิ่นเย้อ

### Step 3: Self-Check for Regressions
1. ตรวจสอบว่า Import ที่ต้องใช้ถูกเพิ่มอย่างถูกต้อง
2. ตรวจสอบ Type Safety (ไม่มี `any`, ไม่มี Unhandled Promise Rejections)
3. ตรวจสอบว่า UI Component มี Loading / Error State ครบถ้วนตามมาตรฐาน

---

## Output Contract
- โค้ดได้รับการปรับปรุงเรียบร้อยโดยไม่มี Syntax Error หรือ Missing Dependencies
- พร้อมเข้าสู่ Phase Verify ทันที
