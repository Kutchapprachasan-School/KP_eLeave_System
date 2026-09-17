# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Design

**Document ID:** `SPEC-2026-09-18-ROLES-DUTIES-01`  
**Date:** 2026-09-18  
**Status:** `APPROVED_DESIGN`  
**Author:** Pair Programming (User & Antigravity)  
**Target Environments:** `dev` → `main` (Vercel & Authoritative PostgreSQL)

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In Thai government schools under the Office of the Basic Education Commission (OBEC / สพฐ.), official positions are legally governed by the Teacher Civil Service and Educational Personnel Commission (ก.ค.ศ.):
- **Official Civil Service Positions (`position`):** `ผู้อำนวยการ`, `รองผู้อำนวยการ`, `ครู`, `ครูผู้ช่วย`, `พนักงานราชการ`, `ลูกจ้างประจำ`, `ครูอัตราจ้าง`, `นักศึกษาฝึกประสบการณ์`
- **Academic Ranks (`level`):** `ครูชำนาญการ`, `ครูชำนาญการพิเศษ`, `ครูเชี่ยวชาญ`, `ครูเชี่ยวชาญพิเศษ`

### 1.2 The Problem
Historically in the eLeave system:
1. Roles such as **"หัวหน้างานบุคคล"** (Head of HR) and **"ผู้ตรวจสอบ"** (Leave Inspector) were stored directly in the `User.position` field as synthetic position titles.
2. This caused critical discrepancies:
   - Official reports (such as personnel rosters, leave statistics tables, and Excel exports) showed "หัวหน้างานบุคคล" as a position, disrupting official personnel sorting tiers.
   - Teachers performing extra administrative duties lost their official civil service title (`ครู`) in printed leave documents.
   - There was no unified way to designate **หัวหน้าฝ่าย 4 ฝ่าย** (Academic, HR, General Affairs, Budget) or **หัวหน้ากลุ่มสาระการเรียนรู้ (8+1 กลุ่ม)** without overloading role or position fields.
   - Subsystem permissions were fragmented across hardcoded string checks (`user.position === "หัวหน้างานบุคคล"`).

### 1.3 The Solution
Decouple **Official Position (`position`)** from **Appointed Functional Duties (`assignedDuties` / capabilities)**:
1. All teaching staff retain their legitimate official civil service position (`ครู`, `ครูผู้ช่วย`).
2. Special administrative duties are centrally configured in `SystemSettings` (single source of truth for the institutional hierarchy).
3. A centralized **Capability & Permission Engine** (`getUserCapabilities`) resolves all authorization flags for all subsystems.
4. Official prints and reports display the true position (`ครู`) with official duty qualification labels (e.g., `ปฏิบัติหน้าที่หัวหน้างานบุคคล`, `ผู้ตรวจสอบการลา`).

---

## 2. Architecture & Data Model

### 2.1 SystemSettings Schema Extensions
In `model SystemSettings` (`prisma/schema.prisma`):

| Field | Type | Default | Description |
|---|---|---|---|
| `hrHeadUserIds` | `String` | `""` | Comma-separated User IDs appointed as Head of HR |
| `hrStaffUserIds` | `String` | `""` | Comma-separated User IDs appointed as HR Staff |
| `defaultInspectorId` | `String?` | `null` | Comma-separated User IDs appointed as Leave Inspectors (multi-inspector support) |
| `divisionHeads` | `String` | `"{}"` | JSON map of 4 main division heads: `academic`, `hr`, `general`, `budget` |
| `departmentHeads` | `String` | `"{}"` | JSON map of 8+1 learning area department heads `{ [subjectGroup: string]: userId }` |

### 2.2 Data Migration (Fail-Closed & Reversible)
A preflight migration script will execute within a single transaction:
1. **Identify Existing Synthetic Users:**
   ```sql
   SELECT id, name, position FROM "User" WHERE position IN ('หัวหน้างานบุคคล', 'ผู้ตรวจสอบ', 'เจ้าหน้าที่บุคคล');
   ```
2. **Promote to SystemSettings:**
   - Any user with `position = 'หัวหน้างานบุคคล'` is appended to `SystemSettings.hrHeadUserIds` and `divisionHeads.hr`.
   - Any user with `position = 'ผู้ตรวจสอบ'` is appended to `SystemSettings.defaultInspectorId`.
   - Any user with `position = 'เจ้าหน้าที่บุคคล'` is appended to `SystemSettings.hrStaffUserIds`.
3. **Normalize Official Positions:**
   - Update `User.position` to `'ครู'` (or `'เจ้าหน้าที่'` for general staff).
4. **Validation:**
   - Verify that all promoted user IDs exist in `SystemSettings` before committing.

---

## 3. Capability & Permission Engine (`src/lib/permissions.ts`)

### 3.1 Capabilities Contract
```typescript
export interface UserCapabilities {
  // Executive & Admin
  isAdmin: boolean;
  isDirector: boolean;
  isDeputyDirector: boolean;

  // Appointed Functional Duties
  isInspector: boolean;
  isHRHead: boolean;
  isHRStaff: boolean;
  isDeptHead: boolean;
  deptHeadGroups: string[];
  divisionRoles: Array<"ACADEMIC" | "HR" | "GENERAL" | "BUDGET">;

  // Subsystem Access Flags
  canInspectLeave: boolean;
  canApproveLeaveHead: boolean;
  canManageLeaveQuotas: boolean;
  canAccessAcademic: boolean;
  canAccessFacility: boolean;
  canAccessBudget: boolean;
  canManageUsers: boolean;
  canAccessDocument: boolean;
}
```

### 3.2 Evaluation Logic
```typescript
export function getUserCapabilities(
  user: { id: string; role?: string | null; position?: string | null; subjectGroup?: string | null },
  settings: any
): UserCapabilities {
  const userId = user.id;
  const pos = (user.position || "").trim();
  const role = (user.role || "").trim().toUpperCase();

  // 1. Direct role & executive checks
  const isAdmin = role === "ADMIN" || pos === "แอดมิน";
  const isFinalApprover = (settings.finalApproverUserIds || "").split(",").map((s: string) => s.trim()).includes(userId);
  const isDirector = pos === "ผู้อำนวยการ" || isFinalApprover;
  const isDeputyDirector = pos === "รองผู้อำนวยการ";

  // 2. Appointed duties from settings
  const inspectorIds = (settings.defaultInspectorId || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const hrHeadIds = (settings.hrHeadUserIds || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const hrStaffIds = (settings.hrStaffUserIds || "").split(",").map((s: string) => s.trim()).filter(Boolean);

  let divisionMap: Record<string, string> = {};
  try { divisionMap = JSON.parse(settings.divisionHeads || "{}"); } catch {}

  let deptMap: Record<string, string> = {};
  try { deptMap = JSON.parse(settings.departmentHeads || "{}"); } catch {}

  // Resolve duties (including legacy position fallback for backward safety)
  const isInspector = inspectorIds.includes(userId) || pos === "ผู้ตรวจสอบ";
  const isHRHead = hrHeadIds.includes(userId) || divisionMap.hr === userId || pos === "หัวหน้างานบุคคล";
  const isHRStaff = hrStaffIds.includes(userId) || pos === "เจ้าหน้าที่บุคคล";

  const deptHeadGroups = Object.entries(deptMap)
    .filter(([_, headId]) => headId === userId)
    .map(([grp]) => grp);
  const isDeptHead = deptHeadGroups.length > 0 || pos === "หัวหน้าหมวด" || pos === "หัวหน้ากลุ่มสาระ";

  const divisionRoles: Array<"ACADEMIC" | "HR" | "GENERAL" | "BUDGET"> = [];
  if (divisionMap.academic === userId) divisionRoles.push("ACADEMIC");
  if (divisionMap.hr === userId || isHRHead) divisionRoles.push("HR");
  if (divisionMap.general === userId) divisionRoles.push("GENERAL");
  if (divisionMap.budget === userId) divisionRoles.push("BUDGET");

  return {
    isAdmin,
    isDirector,
    isDeputyDirector,
    isInspector,
    isHRHead,
    isHRStaff,
    isDeptHead,
    deptHeadGroups,
    divisionRoles,
    // Capabilities
    canInspectLeave: isAdmin || isDirector || isInspector,
    canApproveLeaveHead: isAdmin || isDirector || isHRHead || isDeptHead,
    canManageLeaveQuotas: isAdmin || isDirector || isHRHead,
    canAccessAcademic: isAdmin || isDirector || divisionRoles.includes("ACADEMIC"),
    canAccessFacility: isAdmin || isDirector || divisionRoles.includes("GENERAL"),
    canAccessBudget: isAdmin || isDirector || divisionRoles.includes("BUDGET"),
    canManageUsers: isAdmin || isHRHead,
    canAccessDocument: isAdmin || isDirector || divisionRoles.includes("GENERAL"),
  };
}
```

---

## 4. UI & UX Specifications

### 4.1 System Settings (`src/app/(app)/settings/page.tsx`)
A dedicated section **"การมอบหมายบทบาทและหน้าที่พิเศษ" (Staff Roles & Appointed Duties)**:
1. **Card 1: งานบริหารงานบุคคลและระบบการลา**
   - **ผู้ตรวจสอบการลา (Leave Inspectors):** Multi-select searchable teacher selector with tags.
   - **หัวหน้างานบุคคล (Head of HR):** Single-select teacher selector.
   - **เจ้าหน้าที่งานบุคคล (HR Staff):** Multi-select teacher selector.
2. **Card 2: หัวหน้า 4 ฝ่ายบริหารหลัก (Administrative Division Heads)**
   - ฝ่ายบริหารงานวิชาการ ➔ Select Teacher
   - ฝ่ายบริหารงานบุคคล ➔ Select Teacher
   - ฝ่ายบริหารทั่วไป ➔ Select Teacher
   - ฝ่ายบริหารแผนและงบประมาณ ➔ Select Teacher
3. **Card 3: หัวหน้ากลุ่มสาระการเรียนรู้ (Department Heads)**
   - 8 กลุ่มสาระฯ (วิทยาศาสตร์และเทคโนโลยี, คณิตศาสตร์, ภาษาไทย, ภาษาต่างประเทศ, สังคมศึกษาฯ, สุขศึกษาและพลศึกษา, ศิลปะ, การงานอาชีพ) + กิจกรรมพัฒนาผู้เรียน
   - Dynamic selector for each group.

### 4.2 User Management (`src/app/(app)/users/page.tsx`)
- Display official position: `ครู`, `ครูผู้ช่วย`, `พนักงานราชการ`
- Render badges for appointed duties:
  - `bg-amber-50 text-amber-700` ➔ `[ผู้ตรวจสอบการลา]`
  - `bg-emerald-50 text-emerald-700` ➔ `[หัวหน้างานบุคคล]`
  - `bg-blue-50 text-blue-700` ➔ `[หัวหน้าฝ่ายวิชาการ]`
  - `bg-purple-50 text-purple-700` ➔ `[หัวหน้ากลุ่มสาระ...]`
- Duty quick-filter in the search bar.

### 4.3 Official Print & PDF Layout (`src/app/print/leave/...`)
- **Inspector Signature Box:**
  - Name: `(ลงชื่อ) ............................ (ครูสมศรี มีสุข)`
  - Position line: `ตำแหน่ง ครูชำนาญการพิเศษ` (Real position & level)
  - Duty subtitle: `ผู้ตรวจสอบการลา`
- **Head of HR Signature Box:**
  - Name: `(ลงชื่อ) ............................ (ครูสมชาย ใจดี)`
  - Position line: `ตำแหน่ง ครูชำนาญการพิเศษ`
  - Duty subtitle: `ปฏิบัติหน้าที่หัวหน้างานบุคคล`

---

## 5. Verification & Testing Invariants

### 5.1 Automated Unit Tests
A new test suite `eLeave/tests/unit/subsystemRolesCapabilities.test.js`:
1. **Invariant 1: Rank Sorting Preservation:**
   - Teachers acting as HR Head or Inspector MUST sort strictly as `Tier 1 (ครู)` using academic level and Thai name collation.
2. **Invariant 2: Multi-Inspector Routing:**
   - Leave request from Math department routes to Math inspector if designated, or falls back to general inspector.
3. **Invariant 3: Permission Isolation:**
   - Head of Academic division can access `/academic/exam` and `/supervision` but CANNOT approve leave in place of HR Head.
4. **Invariant 4: Fail-Closed Protection:**
   - Removing a user from `hrHeadUserIds` immediately revokes their HR approval capability without modifying their user record.
5. **Invariant 5: Official Print Formatting:**
   - Printed output renders `ตำแหน่ง ครู` + duty subtitle, never synthetic position strings.

---

## 6. Rollback & Disaster Recovery
1. Schema additions are strictly nullable or default to empty strings (`""` / `"{}"`), incurring zero breaking changes.
2. If rolled back, legacy position fallback in `getUserCapabilities` guarantees uninterrupted operation.
