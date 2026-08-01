# Flexible Document Numbering System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a flexible, integrated document numbering and management system for memos, commands, and outgoing letters in the eLeave project, sharing the Prisma database and Better Auth session, with validation constraints for backdated requests, custom CRUD memo sections, auto-save drafts, print/PDF previews, and audit logs.

**Architecture:** We will update `schema.prisma` with 6 new models. We will create backend server actions for CRUD operations (sections, presets, templates) and document processing (issuing, drafting, linking, printing). Then we will implement the UI under route group `src/app/(app)/document` using React Server Actions and client components, featuring a Split-View Canva-style editor.

**Tech Stack:** React 19, Next.js 16 (App Router), Prisma, PostgreSQL (Neon), Tailwind CSS, Lucide Icons, html2pdf.js / jspdf.

## Global Constraints
- Database connections must use the centralized `prisma` client from `@/lib/prisma` or standard imports.
- All UI text must be bilingual (Thai/English) based on the user's selected language.
- Exclude `scratch` folder from all production builds.
- Backdated document dates must not be earlier than the latest document date in that sequence.

---

### Task 1: Update Prisma Schema & Run Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Test: Run db push and test generation

**Interfaces:**
- Produces: Updated database tables for MemoSection, DocumentConfig, DocumentRecord, SigneePreset, DocumentTemplate, DocumentRelation.

- [ ] **Step 1: Add new models and update User model in `prisma/schema.prisma`**

Update `User` model (around lines 9-30) to include relations:
```prisma
model User {
  id               String             @id @default(cuid())
  // ... (existing fields) ...
  documentRecords  DocumentRecord[]
  templates        DocumentTemplate[]
}
```

Add these models to the end of `prisma/schema.prisma`:
```prisma
model MemoSection {
  id               String             @id @default(cuid())
  name             String
  code             String             @unique
  isActive         Boolean            @default(true)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  
  documentConfigs  DocumentConfig[]
  documentRecords  DocumentRecord[]
  templates        DocumentTemplate[]
}

model DocumentConfig {
  id               String             @id @default(cuid())
  docType          String             // MEMO, COMMAND, OUTGOING
  memoSectionId    String?            @unique
  prefix           String             @default("")
  useThaiNumerals  Boolean            @default(true)
  paddingDigits    Int                @default(1)
  yearFormat       String             @default("TH_BE")
  currentSeq       Int                @default(0)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  memoSection      MemoSection?       @relation(fields: [memoSectionId], references: [id], onDelete: Cascade)
}

model DocumentRecord {
  id               String             @id @default(cuid())
  docType          String             // MEMO, COMMAND, OUTGOING
  memoSectionId    String?
  docNo            String?            @unique
  seqNo            Int?
  year             Int
  title            String
  to               String
  origin           String
  date             DateTime
  content          String             @db.Text
  signeeName       String
  signeePosition   String
  enclosures       String?
  references       String?
  status           String             @default("DRAFT") // DRAFT, ISSUED, PRINTED, CANCELLED, RESERVED
  cancelReason     String?
  isPinned         Boolean            @default(false)
  createdById      String
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  user             User               @relation(fields: [createdById], references: [id], onDelete: Cascade)
  memoSection      MemoSection?       @relation(fields: [memoSectionId], references: [id], onDelete: SetNull)
  outgoingLinks    DocumentRelation[] @relation("FromDocument")
  incomingLinks    DocumentRelation[] @relation("ToDocument")
}

model SigneePreset {
  id               String             @id @default(cuid())
  name             String
  position         String
  isCommon         Boolean            @default(true)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
}

model DocumentTemplate {
  id               String             @id @default(cuid())
  name             String
  docType          String             // MEMO, COMMAND, OUTGOING
  memoSectionId    String?
  title            String
  to               String
  origin           String
  content          String             @db.Text
  signeeName       String
  signeePosition   String
  isPublic         Boolean            @default(true)
  createdById      String
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  memoSection      MemoSection?       @relation(fields: [memoSectionId], references: [id], onDelete: SetNull)
  user             User               @relation(fields: [createdById], references: [id], onDelete: Cascade)
}

model DocumentRelation {
  id               String             @id @default(cuid())
  fromId           String
  toId             String
  createdAt        DateTime           @default(now())

  fromDoc          DocumentRecord     @relation("FromDocument", fields: [fromId], references: [id], onDelete: Cascade)
  toDoc            DocumentRecord     @relation("ToDocument", fields: [toId], references: [id], onDelete: Cascade)

  @@unique([fromId, toId])
}
```

- [ ] **Step 2: Push database schema changes to Neon PostgreSQL**

Run: `npx prisma db push`
Expected output: Schema push successful and client generated.

- [ ] **Step 3: Commit migration changes**

Run:
```bash
git add prisma/schema.prisma
git commit -m "db: update prisma schema for eDocument system"
```

---

### Task 2: Create Settings CRUD Server Actions

**Files:**
- Create: `src/app/actions/document-settings.ts`
- Test: Write scratch script `scratch/test_doc_settings.ts`

**Interfaces:**
- Produces: `getMemoSections()`, `upsertMemoSection(id: string | null, name: string, code: string, isActive: boolean)`, `deleteMemoSection(id: string)`, `getSigneePresets()`, `upsertSigneePreset(id: string | null, name: string, position: string, isCommon: boolean)`, `deleteSigneePreset(id: string)`, `getDocumentConfigs()`, `saveDocumentConfig(id: string, prefix: string, useThaiNumerals: boolean, paddingDigits: number, yearFormat: string)`.

- [ ] **Step 1: Implement `src/app/actions/document-settings.ts`**

Write the CRUD actions. Check credentials/role is ADMIN or HR_HEAD or TEACHER:
```typescript
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// MemoSection Actions
export async function getMemoSections() {
  return prisma.memoSection.findMany({
    orderBy: { code: "asc" }
  });
}

export async function upsertMemoSection(id: string | null, name: string, code: string, isActive: boolean = true) {
  const codeUpper = code.trim().toUpperCase();
  if (id) {
    const updated = await prisma.memoSection.update({
      where: { id },
      data: { name, code: codeUpper, isActive }
    });
    
    // Create DocumentConfig for this section if not exists
    await prisma.documentConfig.upsert({
      where: { memoSectionId: updated.id },
      update: {},
      create: {
        docType: "MEMO",
        memoSectionId: updated.id,
        prefix: `ศทก ${codeUpper}`,
        useThaiNumerals: true,
        paddingDigits: 1,
        yearFormat: "TH_BE"
      }
    });
    
    revalidatePath("/document/settings");
    return updated;
  } else {
    const created = await prisma.memoSection.create({
      data: { name, code: codeUpper, isActive }
    });
    
    await prisma.documentConfig.create({
      data: {
        docType: "MEMO",
        memoSectionId: created.id,
        prefix: `ศทก ${codeUpper}`,
        useThaiNumerals: true,
        paddingDigits: 1,
        yearFormat: "TH_BE"
      }
    });
    
    revalidatePath("/document/settings");
    return created;
  }
}

export async function deleteMemoSection(id: string) {
  await prisma.memoSection.delete({ where: { id } });
  revalidatePath("/document/settings");
  return { success: true };
}

// SigneePreset Actions
export async function getSigneePresets() {
  return prisma.signeePreset.findMany({
    orderBy: [{ isCommon: "desc" }, { name: "asc" }]
  });
}

export async function upsertSigneePreset(id: string | null, name: string, position: string, isCommon: boolean = true) {
  if (id) {
    const updated = await prisma.signeePreset.update({
      where: { id },
      data: { name, position, isCommon }
    });
    revalidatePath("/document/settings");
    return updated;
  } else {
    const created = await prisma.signeePreset.create({
      data: { name, position, isCommon }
    });
    revalidatePath("/document/settings");
    return created;
  }
}

export async function deleteSigneePreset(id: string) {
  await prisma.signeePreset.delete({ where: { id } });
  revalidatePath("/document/settings");
  return { success: true };
}

// DocumentConfig Actions
export async function getDocumentConfigs() {
  return prisma.documentConfig.findMany({
    include: { memoSection: true }
  });
}

export async function saveDocumentConfig(
  id: string,
  prefix: string,
  useThaiNumerals: boolean,
  paddingDigits: number,
  yearFormat: string
) {
  const updated = await prisma.documentConfig.update({
    where: { id },
    data: { prefix, useThaiNumerals, paddingDigits, yearFormat }
  });
  revalidatePath("/document/settings");
  return updated;
}
```

- [ ] **Step 2: Create a scratch script `scratch/test_doc_settings.ts` to test**
```typescript
import { upsertMemoSection, getMemoSections, upsertSigneePreset, getSigneePresets } from "../src/app/actions/document-settings";

async function main() {
  console.log("Adding test section...");
  const s = await upsertMemoSection(null, "ฝ่ายนโยบายและแผน", "PLAN");
  console.log("Added section:", s);
  
  console.log("Adding test signee preset...");
  const p = await upsertSigneePreset(null, "นายประธาน สมเกียรติ", "ผู้อำนวยการโรงเรียน");
  console.log("Added preset:", p);
  
  const sections = await getMemoSections();
  console.log("Total sections:", sections.length);
}

main().catch(console.error);
```
Run it: `npx tsx scratch/test_doc_settings.ts`
Expected: Outputs planning logs showing successfully created objects.

- [ ] **Step 3: Commit Task 2 changes**
Run:
```bash
git add src/app/actions/document-settings.ts
git commit -m "feat: add document settings server actions"
```

---

### Task 3: Create Document Record Management Server Actions

**Files:**
- Create: `src/app/actions/document.ts`
- Test: Write scratch script `scratch/test_doc_records.ts`

**Interfaces:**
- Produces: `saveDocDraft(data: any)`, `issueDocNumber(docId: string, customDate?: Date)`, `cancelDoc(id: string, reason: string)`, `getDocPreviewNumber(docType: string, sectionId?: string)`, `getDocumentDetails(id: string)`, `getDocumentsList(filters: any)`.

- [ ] **Step 1: Implement `src/app/actions/document.ts`**

Define utility functions for Thai numerals mapping:
```typescript
const arabicToThaiMap = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
function toThaiNumerals(num: string | number): string {
  return String(num)
    .split("")
    .map((char) => {
      const idx = parseInt(char);
      return isNaN(idx) ? char : arabicToThaiMap[idx];
    })
    .join("");
}
```

Define core helper for pattern rendering:
```typescript
export function formatDocNumber(pattern: string, prefix: string, seq: number, year: number, padding: number, useThai: boolean): string {
  let seqStr = String(seq).padStart(padding, "0");
  let yearStr = String(year);
  if (useThai) {
    seqStr = toThaiNumerals(seqStr);
    yearStr = toThaiNumerals(yearStr);
  }
  
  let formatted = pattern
    .replace("[PREFIX]", prefix)
    .replace("[SEQ]", seqStr)
    .replace("[YEAR]", yearStr);
    
  return formatted;
}
```

Write the server actions including the date validation constraint:
```typescript
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helper to check user session
async function getSessionUser() {
  // Better Auth simple session lookup
  const { headers } = await import("next/headers");
  const { auth } = await import("@/lib/auth"); // Assuming @lib/auth contains the better-auth config or lookup
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

export async function saveDocDraft(data: {
  id?: string;
  docType: string;
  memoSectionId?: string;
  title: string;
  to: string;
  origin: string;
  date: string;
  content: string;
  signeeName: string;
  signeePosition: string;
  enclosures?: string;
  references?: string;
}) {
  const user = await getSessionUser();
  const docDate = new Date(data.date);
  
  if (data.id) {
    const updated = await prisma.documentRecord.update({
      where: { id: data.id },
      data: {
        title: data.title,
        to: data.to,
        origin: data.origin,
        date: docDate,
        content: data.content,
        signeeName: data.signeeName,
        signeePosition: data.signeePosition,
        enclosures: data.enclosures,
        references: data.references,
        memoSectionId: data.memoSectionId || null,
        status: "DRAFT"
      }
    });
    return updated;
  } else {
    const created = await prisma.documentRecord.create({
      data: {
        docType: data.docType,
        memoSectionId: data.memoSectionId || null,
        title: data.title,
        to: data.to,
        origin: data.origin,
        date: docDate,
        content: data.content,
        signeeName: data.signeeName,
        signeePosition: data.signeePosition,
        enclosures: data.enclosures,
        references: data.references,
        status: "DRAFT",
        createdById: user.id,
        year: docDate.getFullYear()
      }
    });
    return created;
  }
}

export async function issueDocNumber(docId: string, customDateStr?: string) {
  const user = await getSessionUser();
  
  // Transaction to secure auto-increment
  return prisma.$transaction(async (tx) => {
    const record = await tx.documentRecord.findUnique({
      where: { id: docId }
    });
    if (!record) throw new Error("Document not found");
    if (record.status !== "DRAFT" && record.status !== "RESERVED") throw new Error("Document already issued");

    const activeDate = customDateStr ? new Date(customDateStr) : record.date;
    const year = activeDate.getFullYear();
    const thYear = year + 543;

    // 1. Validate date constraint: Not earlier than the latest document in this sequence
    const latestDoc = await tx.documentRecord.findFirst({
      where: {
        docType: record.docType,
        memoSectionId: record.memoSectionId,
        year: year,
        status: { in: ["ISSUED", "PRINTED"] }
      },
      orderBy: { seqNo: "desc" }
    });

    if (latestDoc && activeDate < latestDoc.date) {
      const formattedDate = latestDoc.date.toLocaleDateString("th-TH");
      throw new Error(`ไม่สามารถออกเลขย้อนหลังข้ามลำดับเวลาได้ วันที่ของเอกสารนี้ต้องเท่ากับหรือหลังวันที่ของเอกสารฉบับล่าสุด (${formattedDate})`);
    }

    // 2. Fetch or create config for prefix and sequence
    let config = await tx.documentConfig.findFirst({
      where: {
        docType: record.docType,
        memoSectionId: record.memoSectionId
      }
    });

    if (!config) {
      config = await tx.documentConfig.create({
        data: {
          docType: record.docType,
          memoSectionId: record.memoSectionId,
          prefix: record.docType === "COMMAND" ? "คำสั่งที่" : record.docType === "OUTGOING" ? "ที่ ศทก" : "ศทก",
          useThaiNumerals: true,
          paddingDigits: 1,
          yearFormat: "TH_BE",
          currentSeq: 0
        }
      });
    }

    const nextSeq = config.currentSeq + 1;
    
    // Update config sequence
    await tx.documentConfig.update({
      where: { id: config.id },
      data: { currentSeq: nextSeq }
    });

    // Formulate running number
    const finalYear = config.yearFormat === "TH_BE" ? thYear : year;
    const pattern = config.docType === "COMMAND" 
      ? "[PREFIX] [SEQ]/[YEAR]" 
      : config.docType === "OUTGOING" 
        ? "[PREFIX] [SEQ]/[YEAR]"
        : "[PREFIX] [SEQ]/[YEAR]"; // default e.g. "ศทก ๐๒ ๑๒/๒๕๖๙"

    const formattedNo = formatDocNumber(
      pattern,
      config.prefix,
      nextSeq,
      finalYear,
      config.paddingDigits,
      config.useThaiNumerals
    );

    // Save and update document record
    const updated = await tx.documentRecord.update({
      where: { id: docId },
      data: {
        docNo: formattedNo,
        seqNo: nextSeq,
        year: year,
        date: activeDate,
        status: "ISSUED"
      }
    });

    // Write system log
    await tx.systemLog.create({
      data: {
        actionType: "DOC_ISSUE",
        description: `ออกเลขเอกสารประเภท ${record.docType}: ${formattedNo} โดยผู้ใช้งาน ${user.name}`,
        userId: user.id
      }
    });

    return updated;
  });
}

export async function cancelDoc(id: string, reason: string) {
  const user = await getSessionUser();
  const updated = await prisma.documentRecord.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelReason: reason
    }
  });

  await prisma.systemLog.create({
    data: {
      actionType: "DOC_CANCEL",
      description: `ยกเลิกเลขเอกสาร ${updated.docNo} เนื่องจาก: ${reason}`,
      userId: user.id
    }
  });

  revalidatePath("/document");
  return updated;
}
```

- [ ] **Step 2: Add functions to fetch records and details**
```typescript
export async function getDocumentDetails(id: string) {
  return prisma.documentRecord.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, position: true } },
      memoSection: true
    }
  });
}

export async function getDocumentsList(filters: {
  search?: string;
  docType?: string;
  memoSectionId?: string;
  status?: string;
  year?: number;
}) {
  const where: any = {};
  if (filters.docType) where.docType = filters.docType;
  if (filters.memoSectionId) where.memoSectionId = filters.memoSectionId;
  if (filters.status) where.status = filters.status;
  if (filters.year) where.year = filters.year;
  
  if (filters.search) {
    where.OR = [
      { docNo: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { signeeName: { contains: filters.search, mode: "insensitive" } }
    ];
  }

  return prisma.documentRecord.findMany({
    where,
    include: {
      user: { select: { name: true } },
      memoSection: true
    },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" }
    ]
  });
}

export async function getDashboardStats() {
  const currentYear = new Date().getFullYear();
  const counts = await prisma.documentRecord.groupBy({
    by: ["status"],
    _count: { id: true },
    where: { year: currentYear }
  });

  const stats = { DRAFT: 0, ISSUED: 0, PRINTED: 0, CANCELLED: 0 };
  counts.forEach((c) => {
    if (c.status in stats) {
      stats[c.status as keyof typeof stats] = c._count.id;
    }
  });
  return stats;
}
```

- [ ] **Step 3: Commit Task 3 changes**
Run:
```bash
git add src/app/actions/document.ts
git commit -m "feat: implement document record server actions and constraints"
```

---

### Task 4: Implement Settings UI with Visual Pattern Builder

**Files:**
- Create: `src/app/(app)/document/settings/page.tsx`
- Modify: `src/app/(app)/layout.tsx` (add sidebar link)

**Interfaces:**
- Consumes: `getMemoSections()`, `upsertMemoSection()`, `deleteMemoSection()`, `getSigneePresets()`, `upsertSigneePreset()`, `deleteSigneePreset()`, `getDocumentConfigs()`, `saveDocumentConfig()`.

- [ ] **Step 1: Create Page Component `src/app/(app)/document/settings/page.tsx`**

Make it client-side with `"use client"`. Build a responsive layout with 3 tabs: 
1. **งานย่อยบันทึกข้อความ (Memo Sections)**
2. **ตั้งค่ารูปแบบเลข (Pattern Builder)**
3. **ผู้ลงนามใช้บ่อย (Signees)**

Include the live visual rendering builder for each document configuration:
```typescript
// Example snippet of the Pattern Builder preview calculations:
function renderPatternPreview(prefix: string, padding: number, useThai: boolean, yearFormat: string) {
  const dummySeq = 124;
  const dummyYear = yearFormat === "TH_BE" ? 2569 : 2026;
  return formatDocNumber("[PREFIX] [SEQ]/[YEAR]", prefix, dummySeq, dummyYear, padding, useThai);
}
```

- [ ] **Step 2: Add sidebar navigation entry in `src/app/(app)/layout.tsx`**
Locate the Sidebar component where leave options are rendered and add:
```tsx
// Around sidebar link rendering list
{
  href: "/document",
  label: "ระบบเอกสาร / ทะเบียนคุม",
  icon: BookOpenIcon // or similar Lucide icon
}
```

- [ ] **Step 3: Commit Task 4 changes**
Run:
```bash
git add src/app/(app)/document/settings/page.tsx src/app/(app)/layout.tsx
git commit -m "feat: add settings UI with Visual Pattern Builder"
```

---

### Task 5: Document Dashboard & Audit Log UI

**Files:**
- Create: `src/app/(app)/document/page.tsx`

**Interfaces:**
- Consumes: `getDashboardStats()`, `getDocumentsList()`, `cancelDoc()`.

- [ ] **Step 1: Create Dashboard UI**
Include:
- **Button Group Quick Actions**: `[ 📄 ขอเลขบันทึกข้อความ ]` `[ 📜 ขอเลขคำสั่ง ]` `[ 📬 ขอเลขหนังสือส่ง ]` linking to `/document/new?type=MEMO`, `COMMAND`, `OUTGOING`.
- **Status Cards Panel**: Draft (DRAFT), Issued (ISSUED), Printed (PRINTED), Cancelled (CANCELLED) displaying statistics.
- **Search Bar & Advanced Filters**: Real-time filtering by document type, search queries, etc.
- **Clickable Row Table**: Custom styles making entire rows clickable, leading to `/document/[id]`.

- [ ] **Step 2: Commit Task 5 changes**
Run:
```bash
git add src/app/(app)/document/page.tsx
git commit -m "feat: implement document dashboard and query list"
```

---

### Task 6: Implement Split-View Document Editor Wizard

**Files:**
- Create: `src/app/(app)/document/new/page.tsx`

**Interfaces:**
- Consumes: `getMemoSections()`, `getSigneePresets()`, `saveDocDraft()`, `issueDocNumber()`.

- [ ] **Step 1: Create Wizard State and Auto-Save Effect**
```typescript
// Inside Client Component:
const [formData, setFormData] = useState({
  docType: "MEMO",
  memoSectionId: "",
  title: "",
  to: "",
  origin: "",
  date: new Date().toISOString().split("T")[0],
  content: "",
  signeeName: "",
  signeePosition: "",
  enclosures: "",
  references: ""
});
```

Auto-save to `localStorage` or backend draft every 30 seconds:
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    if (!formData.title || !formData.content) return;
    const res = await saveDocDraft({ ...formData });
    console.log("Draft saved:", res.id);
  }, 30000);
  return () => clearInterval(interval);
}, [formData]);
```

- [ ] **Step 2: Design Split-View Layout**
Use CSS grid:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
  <div className="overflow-y-auto p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
    {/* Form Wizard on Left */}
  </div>
  <div className="overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex justify-center">
    {/* A4 Sheet Live Preview on Right */}
  </div>
</div>
```

- [ ] **Step 3: Implement 4-step wizard forms**
- **Step 1: Choose Type / Section**
- **Step 2: Details (Title, To, Origin, Date, Content)**
- **Step 3: Signee (Preset select buttons)**
- **Step 4: Preview & Issue Request**

- [ ] **Step 4: Commit Task 6 changes**
Run:
```bash
git add src/app/(app)/document/new/page.tsx
git commit -m "feat: implement split-view document wizard editor"
```

---

### Task 7: Implement Document Detail Page & PDF/Print View

**Files:**
- Create: `src/app/(app)/document/[id]/page.tsx`

**Interfaces:**
- Consumes: `getDocumentDetails()`, `cancelDoc()`.

- [ ] **Step 1: Create Detail Page**
Show the document details in A4 format on the screen. Add actions at the top bar:
- **🖨 พิมพ์เอกสาร (Browser Print)**: Calls `window.print()` using specific Tailwind `@media print` hidden layers to print clean A4 paper without headers.
- **📄 ดาวน์โหลด PDF**: Import client-side `jspdf` or `html2pdf.js` to parse the A4 container and export as PDF.
- **📝 ยกเลิกเลข**: Prompt reasons in a modal before canceling the document.
- **📋 คัดลอกเอกสาร (Clone)**: Redirects to `/document/new` pre-populating states from this document.

- [ ] **Step 2: Add Print CSS style properties**
Make sure the Garuda emblem image and fonts look sharp on A4 print:
```css
@media print {
  body {
    background: white;
    color: black;
  }
  .no-print {
    display: none !important;
  }
  .print-container {
    width: 21cm;
    height: 29.7cm;
    padding: 2cm;
    margin: 0;
    box-shadow: none;
  }
}
```

- [ ] **Step 3: Commit Task 7 changes**
Run:
```bash
git add src/app/(app)/document/[id]/page.tsx
git commit -m "feat: add document details and printing functionality"
```

---

## Verification Plan

### Automated Tests
- Test that Prisma builds clean and ts compiles: `npx tsc --noEmit`
- Run local Next.js build: `npm run build`

### Manual Verification
1. Run local server: `npm run dev` or `pnpm dev`
2. Open `/document/settings` and create a Memo Section `งานวิชาการ` (ACAD) and a Signee Preset.
3. Open `/document/new`, select `งานวิชาการ`, and fill out content. Verify the live A4 preview and running number dynamically updates to `ศทก ACAD 1/2026` or configured prefix.
4. Attempt to save draft and verify it populates the drafts.
5. Click **ออกเลขเอกสาร**, verify it redirects to detail, check layout, and test **ดาวน์โหลด PDF**.
6. Try creating another document with a date *prior* to the issued document and verify the backend blocks it with an validation alert.
