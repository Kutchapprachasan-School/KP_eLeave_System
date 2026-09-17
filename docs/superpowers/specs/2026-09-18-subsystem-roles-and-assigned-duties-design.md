# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Design (Rev 2 - Forensic Hardened)

**Document ID:** `SPEC-2026-09-18-ROLES-DUTIES-02`  
**Date:** 2026-09-18  
**Status:** `APPROVED_DESIGN_REV2`  
**Author:** Pair Programming (Senior Forensic Architecture)  
**Target Environments:** `dev` → `main` (Vercel & Authoritative PostgreSQL)

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In Thai government schools under the Office of the Basic Education Commission (OBEC / สพฐ.), official positions are legally governed by the Teacher Civil Service and Educational Personnel Commission (ก.ค.ศ.):
- **Official Civil Service Positions (`position`):** `ผู้อำนวยการ`, `รองผู้อำนวยการ`, `ครู`, `ครูผู้ช่วย`, `พนักงานราชการ`, `ลูกจ้างประจำ`, `ครูอัตราจ้าง`, `นักศึกษาฝึกประสบการณ์`
- **Academic Ranks (`level`):** `ครูชำนาญการ`, `ครูชำนาญการพิเศษ`, `ครูเชี่ยวชาญ`, `ครูเชี่ยวชาญพิเศษ`

### 1.2 The Forensic Architecture Hardening (Rev 2)
Decouple **ตำแหน่งราชการ (Official Position)** + **วิทยฐานะ (Academic Level)** + **หน้าที่ที่ได้รับแต่งตั้ง (Appointed Functional Duty)**:
1. **Normalized Assignment Table (`UserDutyAssignment`):** Eliminate unstructured comma-separated strings and unvalidated JSON blobs. Introduce relational, auditable, temporal duty assignments.
2. **Explicit Grant & Fail-Closed Security:** No silent legacy fallback. Access is denied unless an active, unrevoked duty assignment exists.
3. **Transaction Lock & Concurrency Control:** `SystemSettings FOR UPDATE` locks during duty mutations, validating target user status (`isApproved = true`, not disabled) atomically with audit logs.
4. **Strict Separation of Duties (Anti-Self-Approval):** Invariants ensure `requesterId !== inspectorId`, `requesterId !== headApproverId`, and `requesterId !== execApproverId`.
5. **Historical Signer Snapshot:** Printed and archived documents render the immutable snapshot of the signer's position, academic level, and appointed duty *at the moment of signing*, preventing current settings from altering past records.
6. **Idempotent Migration with `--dry-run`:** Safe preflight migration CLI reporting `migrated`, `skipped`, and `ambiguous` without duplicate entries or assumptions.
7. **Complete Audit Trail:** Every grant and revocation is immutably recorded in `SystemLog`.
8. **Strict Typed Domain:** 4 Divisions and 8+1 Learning Areas are governed by strict enums/allowlists with Zod validation.

---

## 2. Architecture & Data Model

### 2.1 Schema: `model UserDutyAssignment`
```prisma
enum DutyType {
  INSPECTOR
  HR_HEAD
  HR_STAFF
  DIVISION_HEAD
  DEPT_HEAD
}

model UserDutyAssignment {
  id           String    @id @default(cuid())
  userId       String
  dutyType     DutyType
  scope        String?   // DivisionType ("ACADEMIC"|"PERSONNEL"|"GENERAL"|"BUDGET") or DeptType ("THAI"|"MATH"|...)
  assignedAt   DateTime  @default(now())
  revokedAt    DateTime?
  assignedById String?
  isActive     Boolean   @default(true)
  metadata     Json?
  user         User      @relation("UserDutyAssignments", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy   User?     @relation("DutyAssignedByUser", fields: [assignedById], references: [id], onDelete: SetNull)

  @@index([userId, dutyType, isActive])
  @@index([dutyType, scope, isActive])
}
```

### 2.2 Domain Enums & Allowlists
```typescript
export const DIVISION_DOMAIN = ["ACADEMIC", "PERSONNEL", "GENERAL", "BUDGET"] as const;
export type DivisionType = typeof DIVISION_DOMAIN[number];

export const DEPARTMENT_DOMAIN = [
  "THAI", "MATH", "SCIENCE", "FOREIGN_LANG", 
  "SOCIAL", "HEALTH_PE", "ART", "CAREER", "STUDENT_DEV"
] as const;
export type DepartmentType = typeof DEPARTMENT_DOMAIN[number];

export const DEPARTMENT_LABEL_MAP: Record<DepartmentType, string> = {
  THAI: "กลุ่มสาระการเรียนรู้ภาษาไทย",
  MATH: "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
  SCIENCE: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
  FOREIGN_LANG: "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
  SOCIAL: "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม",
  HEALTH_PE: "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา",
  ART: "กลุ่มสาระการเรียนรู้ศิลปะ",
  CAREER: "กลุ่มสาระการเรียนรู้การงานอาชีพ",
  STUDENT_DEV: "กิจกรรมพัฒนาผู้เรียน"
};
```

---

## 3. Capability & Permission Engine (`src/lib/permissions.ts`)

### 3.1 Capabilities Contract
```typescript
export interface UserCapabilities {
  // Executive & Admin
  isAdmin: boolean;
  isDirector: boolean;
  isDeputyDirector: boolean;

  // Appointed Functional Duties (From active UserDutyAssignment only)
  isInspector: boolean;
  isHRHead: boolean;
  isHRStaff: boolean;
  isDeptHead: boolean;
  deptHeadGroups: DepartmentType[];
  divisionRoles: DivisionType[];

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

### 3.2 Pure Evaluator Logic (Fail-Closed)
```typescript
export function getUserCapabilities(
  user: { id: string; role?: string | null; position?: string | null; subjectGroup?: string | null },
  activeAssignments: Array<{ dutyType: string; scope: string | null }>,
  settings: { finalApproverUserIds?: string | null }
): UserCapabilities {
  const userId = user.id;
  const pos = (user.position || "").trim();
  const role = (user.role || "").trim().toUpperCase();

  const isAdmin = role === "ADMIN" || pos === "แอดมิน";
  const isFinalApprover = (settings.finalApproverUserIds || "").split(",").map(s => s.trim()).includes(userId);
  const isDirector = pos === "ผู้อำนวยการ" || isFinalApprover;
  const isDeputyDirector = pos === "รองผู้อำนวยการ";

  // Explicit Assignment Resolution (Fail-Closed)
  const isInspector = activeAssignments.some(a => a.dutyType === "INSPECTOR");
  const isHRHead = activeAssignments.some(a => a.dutyType === "HR_HEAD" || (a.dutyType === "DIVISION_HEAD" && a.scope === "PERSONNEL"));
  const isHRStaff = activeAssignments.some(a => a.dutyType === "HR_STAFF");
  
  const deptHeadGroups = activeAssignments
    .filter(a => a.dutyType === "DEPT_HEAD" && a.scope)
    .map(a => a.scope as DepartmentType);
  const isDeptHead = deptHeadGroups.length > 0;

  const divisionRoles = activeAssignments
    .filter(a => a.dutyType === "DIVISION_HEAD" && a.scope)
    .map(a => a.scope as DivisionType);

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

## 4. Separation of Duties (Anti-Self-Approval)

During leave inspection and approval:
1. **Self-Inspection Check:**
   `if (request.userId === inspectorId) throw new Error("Violation: Requester cannot inspect own leave request");`
   ➔ Routed to alternate inspector or director.
2. **Self-Head Approval Check:**
   `if (request.userId === headApproverId) throw new Error("Violation: Requester cannot act as head approver for own leave request");`
   ➔ Routed to Director.
3. **Self-Executive Approval Check:**
   `if (request.userId === execApproverId) throw new Error("Violation: Requester cannot execute final approval for own leave request");`
   ➔ Routed to designated acting director.

---

## 5. Historical Signer Snapshot Engine

When leave moves through its lifecycle (`INSPECTED` / `HEAD_APPROVED` / `APPROVED`):
The signer's official position, academic level, and active duty are recorded into `LeaveRequest.extraFields` as a sealed JSON snapshot:
```json
{
  "inspectorSnapshot": {
    "userId": "usr_123",
    "name": "ครูสมศรี มีสุข",
    "position": "ครู",
    "level": "ชำนาญการพิเศษ",
    "duty": "ผู้ตรวจสอบการลา",
    "signedAt": "2026-09-18T08:30:00.000Z"
  },
  "headApproverSnapshot": {
    "userId": "usr_456",
    "name": "ครูสมชาย ใจดี",
    "position": "ครู",
    "level": "ชำนาญการพิเศษ",
    "duty": "ปฏิบัติหน้าที่หัวหน้างานบุคคล",
    "signedAt": "2026-09-18T09:00:00.000Z"
  }
}
```
**Print Engine Rule:**
If snapshot exists, the print layout **strictly renders the snapshot**. It NEVER evaluates current `UserDutyAssignment` or `SystemSettings` for past approved leaves.

---

## 6. Idempotent Migration (`scripts/run-subsystem-roles-migration.cjs`)

```bash
# Dry run mode
node scripts/run-subsystem-roles-migration.cjs --dry-run

# Live execution mode
node scripts/run-subsystem-roles-migration.cjs --apply
```
- **Idempotency Invariant:** If `UserDutyAssignment` already exists for `(userId, dutyType, scope)`, skip.
- **Ambiguity Guard:** Users with `position === "เจ้าหน้าที่บุคคล"` are flagged in the report; their position is NOT modified unless explicitly confirmed.
- **Summary Report Output:**
  ```text
  [Migration Summary]
  - Total Synthetic Users Found: 3
  - Migrated to Assignments: 2
  - Skipped (Already Assigned): 0
  - Ambiguous / Flagged: 1 (usr_staff_1: 'เจ้าหน้าที่บุคคล')
  ```

---

## 7. Audit Logging Invariant
Every grant or revocation creates an audit record:
```typescript
await tx.systemLog.create({
  data: {
    actionType: isRevoke ? "DUTY_REVOKED" : "DUTY_ASSIGNED",
    subsystem: "PERSONNEL",
    description: `${isRevoke ? "Revoked" : "Assigned"} duty ${dutyType} (${scope || "GLOBAL"}) for user ${targetUserId}`,
    userId: actorId,
    metadata: { actorId, targetUserId, dutyType, scope, before, after, timestamp: new Date().toISOString() }
  }
});
```
