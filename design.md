# คู่มือการออกแบบระบบ (System Design Guidelines) — eLeave & School OS

เอกสารฉบับนี้กำหนดมาตรฐานการออกแบบ UI/UX (Design System Tokens & UI Components) ของระบบ **eLeave** และระบบงานที่เกี่ยวข้อง เพื่อให้ระบบในเครือทั้งหมดมีหน้าตา โทนสี ความหนาแน่นของข้อมูล และการเคลื่อนไหวที่เป็นเอกภาพเดียวกัน (Consistent Brand Experience)

---

## 1. อัตลักษณ์และการแสดงผล (Global Layout & Density)

ระบบถูกออกแบบมาสำหรับผู้ใช้งานในกลุ่มโรงเรียนและส่วนราชการ ซึ่งมีข้อมูลที่ต้องแสดงผลปริมาณมาก จึงเน้นความกระชับสูง (High-Density Dashboard)

### 📌 การตั้งค่าพื้นฐาน (Global HTML & Zoom)
*   **ขนาดตัวอักษรตั้งต้น (Base Font-size):** กำหนดไว้ที่ `90%` ของขนาดปกติ
*   **การย่อส่วนการแสดงผล (Global Zoom):** กำหนดไว้ที่ `zoom: 0.9` เพื่อให้หน้าจอเก็บข้อมูลได้กะทัดรัด ไม่ดูใหญ่เกินไปบนจอ Desktop ทั่วไป
*   **การเปลี่ยนผ่าน (Smooth Transitions):** สมาชิก UI ทุกชิ้นต้องตั้งค่า Transition เพื่อให้การตอบสนองนุ่มนวลเมื่อเปลี่ยนสถานะหรือสลับ Dark Mode:
    ```css
    * {
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.15s ease;
    }
    ```

---

## 2. ระบบสี (Color Tokens)

การใช้โทนสีของระบบนี้ยึดหลัก **"Indigo base with Amber/Orange accents"** (โทนน้ำเงินครามเป็นสีหลัก และสีส้ม/เหลืองเป็นสีเน้น)

### 🎨 Light Mode
| ชื่อตัวแปร | รหัสสี | การใช้งาน |
| :--- | :--- | :--- |
| `--color-primary` | `#4f46e5` (Indigo 600) | สีหลักของแบรนด์, ปุ่ม Action หลัก, ลิงก์สำคัญ |
| `--color-primary-light` | `#6366f1` (Indigo 500) | สี Hover ของปุ่มหลัก |
| `--color-primary-dark` | `#3730a3` (Indigo 800) | สี Active หรือสถานะเน้นของปุ่มหลัก |
| `--color-accent` | `#f59e0b` (Amber 500) | สีเน้น, แจ้งเตือนสถานะรอดำเนินการ, ไอคอนแบรนด์ |
| `--color-accent-light` | `#fbbf24` (Amber 400) | สีเน้นเฉดอ่อน, พื้นหลังสถานะรอดำเนินการ |
| `--color-success` | `#10b981` (Emerald 500) | สีความสำเร็จ, การยืนยัน, การอนุมัติเสร็จสิ้น |
| `--color-danger` | `#ef4444` (Red 500) | สีเตือนอันตราย, การยกเลิก, การปฏิเสธ |
| `--color-sidebar-bg` | `#1e1b4b` (Indigo 900) | พื้นหลังแถบเมนูด้านซ้าย (Sidebar) |

### 🌙 Dark Mode
เมื่อระบบเปลี่ยนเป็นคลาส `.dark` ค่าตัวแปร Sidebar และการ์ดจะเปลี่ยนดังนี้:
*   `--color-sidebar-bg` จะเปลี่ยนเป็นสีเข้มพิเศษ `#0f0e26`
*   พื้นหลังหลักของหน้าจอจะใช้กลุ่มสี Slate เช่น `bg-slate-950` หรือ `bg-slate-900`
*   เส้นขอบการ์ดจะใช้ `border-slate-800` หรือโปร่งแสง `border-slate-100/10`

---

## 3. ระบบอักษร (Typography)

*   **ฟอนต์ภาษาไทยหลัก:** ใช้ฟอนต์ **Noto Sans Thai** (Google Fonts)
*   **ฟอนต์ภาษาไทยสไตล์ทางการ (เช่น ในเกียรติบัตร):** ใช้ฟอนต์ **Sarabun**
*   **โครงสร้างการตั้งค่า CSS:**
    ```css
    body, .font-sans, input, select, textarea, button {
      font-family: 'Noto Sans Thai', system-ui, -apple-system, sans-serif !important;
    }
    ```

### 📏 ขนาดตัวอักษรมาตรฐาน (Typography Scale)
*   **Title (หัวข้อหน้าใหญ่):** `text-2xl` หรือ `text-3xl` (`font-bold tracking-tight`)
*   **Subtitle (หัวข้อย่อย):** `text-sm` (`text-slate-500` เพื่อลดระดับความสำคัญ)
*   **Table Content / Body:** `text-xs` (สำหรับข้อมูลเนื้อหา เพื่อให้อ่านง่ายและประหยัดพื้นที่)
*   **Badge / Status Text:** `text-[10px]` หรือ `text-[11px]` (`font-bold` หรือ `font-extrabold`)

---

## 4. ส่วนประกอบ UI มาตรฐาน (Interactive Components)

### 🔳 การ์ดสถิติ (Stat Cards)
การ์ดสถิติต้องใช้คลาส `.stat-card` เพื่อให้มีเอฟเฟกต์ยกตัว (Hover Lift Up) และมีขอบเงาเฉดสีคราม/น้ำเงินจาง ๆ:
```css
.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(79, 70, 229, 0.15);
}
```

### 🧭 แถบเมนูด้านซ้าย (Sidebar Active Indicator)
สำหรับระบบอื่น ๆ ที่ทำเมนูด้านซ้าย เมนูที่กำลังเปิดอยู่ต้องมีแถบสีส้มด้านซ้ายเสมอ โดยใช้คลาสดังนี้:
```css
.sidebar-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background: linear-gradient(180deg, #fbbf24, #f59e0b);
  border-radius: 0 4px 4px 0;
}
```

### 🔙 ปุ่มกลับหน้าหลัก (Settings-style Back Button)
เมื่อต้องการย้อนหน้าหรือกลับจากโมดูลย่อย ให้ใช้ปุ่มสี่เหลี่ยมโค้งมนมนขนาดกลาง (`w-9 h-9`) วางไว้ทางซ้ายของหัวข้อเสมอ เพื่อความกะทัดรัดและดูเป็นมืออาชีพ:
```tsx
<button
  onClick={onBack}
  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer"
>
  <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-350" />
</button>
```

### ⏳ ตัวชี้วัดการโหลด (Premium Loading Spinner)
หลีกเลี่ยงการใช้ Spinner วงกลมแบบทั่วไป ให้ใช้แถบความคืบหน้าแบบวิ่งวน (Pulsing Linear Progress Bar) ซึ่งใช้โครงสร้าง Tailwind + Framer Motion:
```tsx
<div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
  <motion.div 
    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full absolute top-0 bottom-0"
    animate={{ 
      left: ["-100%", "100%"],
      width: ["30%", "60%", "30%"]
    }}
    transition={{ 
      duration: 1.5, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }}
  />
</div>
```

---

## 5. การ์ดเมนูหลักของแดชบอร์ด (Dashboard Grid Menu)

เมนูโมดูลย่อยบนหน้าแดชบอร์ดให้จัดเรียงเป็น Grid แบบ Responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` โดยมีหน้าตาแบบ **Glassmorphism หรือการ์ดขาวขอบโค้งมนพิเศษ (`rounded-3xl`):**
*   **โครงสร้างการ์ดเมนู:**
    *   **Emblem/Icon:** วงกลมหรือสี่เหลี่ยมโค้งมนมนเฉดสีสว่างตามประเภทงาน (เช่น บันทึกข้อความใช้พื้นหลังสีฟ้าอมน้ำเงินอ่อน ไอคอนสีน้ำเงินเข้ม) ขนาด `w-16 h-16` วางตรงกลาง
    *   **Title:** ตัวหนาพิเศษ ขนาดหัวข้อกลาง (`text-base font-extrabold`)
    *   **Description:** คำอธิบายสั้น ๆ ขนาดเล็กมาก (`text-xs text-slate-400 mt-2`)
    *   **Hover effect:** ขยับขึ้นด้านบนเล็กน้อย `whileHover={{ y: -6 }}`

---

## 6. ระบบการจัดพิมพ์ (Print System Rules)

ระบบใบลาและงานสารบรรณมักจะมีการพิมพ์ลงกระดาษจริง เอกสารพิมพ์ต้องถูกกำหนด CSS `@media print` เพื่อจัดรูปแบบหน้าจอให้ไม่ติดแถบเมนูข้างและปุ่มต่าง ๆ:
```css
@media print {
  /* ซ่อน Sidebar, Header, และปุ่มควบคุมทั้งหมด */
  .print-hidden, nav, sidebar, header, button {
    display: none !important;
  }
  
  /* ขยายพื้นที่พิมพ์หลักให้เต็มหน้ากระดาษ */
  .main-content {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
  }
  
  /* ตั้งค่าหน้ากระดาษให้ไม่มีระยะขอบขยะ */
  @page {
    margin: 10mm;
  }
}
```
*หากเป็นงานขนาดเฉพาะ เช่น เกียรติบัตรแนวนอน A4 ให้กำหนดขนาดหน้าเป็น `@page { size: A4 landscape; margin: 0; }`*

---
*(แนวทางปฏิบัติเหล่านี้คือดีเอ็นเอการออกแบบของระบบ eLeave และ School OS โปรดอ้างอิงทุกครั้งเมื่อเริ่มพัฒนาโมดูลหรือแอปรุ่นถัดไป)*
