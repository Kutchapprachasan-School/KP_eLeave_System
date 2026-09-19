/**
 * Unified Permissions & Capability Architecture (v8.0)
 * 
 * Includes:
 * 1. Subsystem Roles, Assigned Duties & Capabilities (Fail-Closed Engine)
 * 2. Capability-based Permission Matrix for Repair System
 * 3. Capability-based Permission Matrix for Facility & Vehicle System
 */

import { z } from "zod";

// ==========================================
// 1. SUBSYSTEM ROLES & ASSIGNED DUTIES (REV 6 - REV 4)
// ==========================================

export type DutyType = 'INSPECTOR' | 'HR_HEAD' | 'HR_STAFF' | 'DIVISION_HEAD' | 'DEPT_HEAD';
export type ScopeDivision = 'ACADEMIC' | 'PERSONNEL' | 'GENERAL' | 'BUDGET';
export type ScopeDepartment = 
  | 'THAI' 
  | 'MATH' 
  | 'SCIENCE' 
  | 'FOREIGN_LANG' 
  | 'SOCIAL' 
  | 'HEALTH_PE' 
  | 'ART' 
  | 'CAREER' 
  | 'STUDENT_DEV';

// Pure Academic Standings (ก.ค.ศ. Levels - Strictly distinct from Position)
export const VALID_ACADEMIC_STANDINGS = [
  'ชำนาญการ',
  'ชำนาญการพิเศษ',
  'เชี่ยวชาญ',
  'เชี่ยวชาญพิเศษ'
] as const;

export type AcademicStanding = typeof VALID_ACADEMIC_STANDINGS[number];

export const AcademicStandingSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform(v => (v === '' ? null : v))
  .refine(v => v === null || v === undefined || (VALID_ACADEMIC_STANDINGS as readonly string[]).includes(v), {
    message: 'วิทยฐานะต้องเป็นค่าตามมาตรฐาน ก.ค.ศ. เท่านั้น (ชำนาญการ, ชำนาญการพิเศษ, เชี่ยวชาญ, เชี่ยวชาญพิเศษ) และต้องไม่ใช่ชื่อตำแหน่ง'
  });

// Eligible Appointee Predicate (Approved Active Personnel in teaching/admin positions)
export const ELIGIBLE_APPOINTEE_POSITIONS = [
  'ครู',
  'ครูผู้ช่วย',
  'รองผู้อำนวยการ',
  'ผู้อำนวยการ',
  'แอดมิน'
] as const;

export const APPOINTEE_ELIGIBILITY_WHERE = {
  isApproved: true,
  name: { not: '' },
  position: { in: [...ELIGIBLE_APPOINTEE_POSITIONS] }
};

export function isUserEligibleForAppointedDuty(user: { isApproved?: boolean | null; position?: string | null; name?: string | null }): boolean {
  if (!user.isApproved) return false;
  if (!user.name || user.name.trim() === '') return false;
  const pos = (user.position || '').trim();
  return (ELIGIBLE_APPOINTEE_POSITIONS as readonly string[]).includes(pos);
}

// Anti-Legacy SubjectGroup Constraint Guard
export const FORBIDDEN_LEGACY_SUBJECT_GROUPS = ['แอดมิน / ผู้บริหาร', 'แอดมิน / ผู้อำนวยการ'] as const;

export function validateSubjectGroupNotLegacy(subjectGroup?: string | null): void {
  if (!subjectGroup) return;
  const trimmed = subjectGroup.trim();
  if (
    (FORBIDDEN_LEGACY_SUBJECT_GROUPS as readonly string[]).includes(trimmed) ||
    /แอดมิน\s*\//i.test(trimmed)
  ) {
    throw new Error('กลุ่มสาระ/ฝ่ายงานไม่สามารถใช้ชื่อแอดมินนำหน้าได้ กรุณาใช้ "ผู้อำนวยการโรงเรียน" หรือ "รองผู้อำนวยการโรงเรียน"');
  }
}

export interface UserDutyAssignmentDTO {
  dutyType: string;
  divisionScope?: string | null;
  departmentScope?: string | null;
  revokedAt?: Date | string | null;
}

export interface UserCapabilities {
  // Executive & Admin
  isAdmin: boolean;
  isDirector: boolean;
  isDeputyDirector: boolean;

  // Appointed Functional Duties (From active assignments only)
  isInspector: boolean;
  isHRHead: boolean;
  isHRStaff: boolean;
  isDeptHead: boolean;
  deptHeadGroups: ScopeDepartment[];
  divisionRoles: ScopeDivision[];

  // Subsystem Access Flags
  canInspectLeave: boolean;
  canApproveLeaveHead: boolean;
  canManageLeaveQuotas: boolean;
  canAccessAcademic: boolean;
  canAccessFacility: boolean;
  canAccessBudget: boolean;
  canManageUsers: boolean;
  canAccessDocument: boolean;
  canViewAllLeaveReports: boolean;
  canViewAllLeaveHistory: boolean;
}

export const SUBJECT_GROUP_TO_DEPT_SCOPE: Record<string, ScopeDepartment> = {
  'วิทยาศาสตร์และเทคโนโลยี': 'SCIENCE',
  'วิทยาศาสตร์': 'SCIENCE',
  'คณิตศาสตร์': 'MATH',
  'ภาษาไทย': 'THAI',
  'ภาษาต่างประเทศ': 'FOREIGN_LANG',
  'สังคมศึกษา ศาสนา และวัฒนธรรม': 'SOCIAL',
  'สังคมศึกษา': 'SOCIAL',
  'สุขศึกษาและพลศึกษา': 'HEALTH_PE',
  'สุขศึกษา': 'HEALTH_PE',
  'ศิลปะ': 'ART',
  'การงานอาชีพ': 'CAREER',
  'กิจกรรมพัฒนาผู้เรียน': 'STUDENT_DEV',
};

export const DEPT_SCOPE_TO_SUBJECT_GROUP: Record<ScopeDepartment, string> = {
  SCIENCE: 'วิทยาศาสตร์และเทคโนโลยี',
  MATH: 'คณิตศาสตร์',
  THAI: 'ภาษาไทย',
  FOREIGN_LANG: 'ภาษาต่างประเทศ',
  SOCIAL: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
  HEALTH_PE: 'สุขศึกษาและพลศึกษา',
  ART: 'ศิลปะ',
  CAREER: 'การงานอาชีพ',
  STUDENT_DEV: 'กิจกรรมพัฒนาผู้เรียน',
};

export function mapSubjectGroupToDeptScope(subjectGroup?: string | null): ScopeDepartment | null {
  if (!subjectGroup) return null;
  const trimmed = subjectGroup.trim();
  return SUBJECT_GROUP_TO_DEPT_SCOPE[trimmed] || null;
}

/**
 * Resolves all applicable system role keys for a user, evaluating authorization role,
 * civil-service position, and appointed functional duties (UserDutyAssignment).
 */
export function getUserRoleKeys(
  user?: {
    id?: string | null;
    role?: string | null;
    position?: string | null;
    duties?: UserDutyAssignmentDTO[] | null;
    dutyAssignments?: UserDutyAssignmentDTO[] | null;
  } | null,
  isFinalApprover: boolean = false
): string[] {
  if (!user) return ["TEACHER"];
  const roles: string[] = [];

  const role = (user.role || "").trim().toUpperCase();
  const pos = (user.position || "").trim();

  if (role === "ADMIN" || pos === "แอดมิน") {
    roles.push("ADMIN");
  }
  if (role === "DIRECTOR" || pos === "ผู้อำนวยการ" || isFinalApprover) {
    roles.push("DIRECTOR");
  }
  if (role === "DEPUTY_DIRECTOR" || pos === "รองผู้อำนวยการ") {
    roles.push("DEPUTY_DIRECTOR");
  }

  // Appointed duties check (support user.duties or user.dutyAssignments)
  const duties: UserDutyAssignmentDTO[] = (user.duties || user.dutyAssignments || []).filter(d => !d.revokedAt);

  const hasHR = duties.some(d => d.dutyType === "HR_HEAD" || (d.dutyType === "DIVISION_HEAD" && d.divisionScope === "PERSONNEL"));
  if (hasHR || pos === "หัวหน้างานบุคคล") {
    roles.push("HR");
  }

  const hasInspector = duties.some(d => d.dutyType === "INSPECTOR");
  if (hasInspector || pos === "ผู้ตรวจสอบ") {
    roles.push("INSPECTOR");
  }

  const hasHRStaff = duties.some(d => d.dutyType === "HR_STAFF");
  if (hasHRStaff || pos === "เจ้าหน้าที่บุคคล") {
    roles.push("HR_STAFF");
  }

  const hasDeptHead = duties.some(d => d.dutyType === "DEPT_HEAD");
  if (hasDeptHead || pos === "หัวหน้าหมวด" || pos === "หัวหน้ากลุ่มสาระ") {
    roles.push("DEPT_HEAD");
  }

  if (roles.length === 0) {
    roles.push("TEACHER");
  }
  return roles;
}

/**
 * Returns the highest-priority canonical role key for single-role interfaces.
 * Precedence: ADMIN > DIRECTOR > DEPUTY_DIRECTOR > HR > INSPECTOR > HR_STAFF > DEPT_HEAD > TEACHER
 */
export function getUserRoleKey(
  user?: {
    id?: string | null;
    role?: string | null;
    position?: string | null;
    duties?: UserDutyAssignmentDTO[] | null;
    dutyAssignments?: UserDutyAssignmentDTO[] | null;
  } | null,
  isFinalApprover: boolean = false
): string {
  const keys = getUserRoleKeys(user, isFinalApprover);
  if (keys.includes("ADMIN")) return "ADMIN";
  if (keys.includes("DIRECTOR")) return "DIRECTOR";
  if (keys.includes("DEPUTY_DIRECTOR")) return "DEPUTY_DIRECTOR";
  if (keys.includes("HR")) return "HR";
  if (keys.includes("INSPECTOR")) return "INSPECTOR";
  if (keys.includes("HR_STAFF")) return "HR_STAFF";
  if (keys.includes("DEPT_HEAD")) return "DEPT_HEAD";
  return "TEACHER";
}

export function getUserCapabilities(
  user: { id?: string | null; role?: string | null; position?: string | null; subjectGroup?: string | null },
  activeAssignments: UserDutyAssignmentDTO[] = [],
  settings: { finalApproverUserIds?: string | null } = {}
): UserCapabilities {
  const userId = user.id || '';
  const pos = (user.position || '').trim();
  const role = (user.role || '').trim().toUpperCase();

  // 1. Direct role & executive checks
  const isAdmin = role === 'ADMIN' || pos === 'แอดมิน';
  const finalApproverIds = (settings.finalApproverUserIds || '').split(',').map(s => s.trim()).filter(Boolean);
  const isFinalApprover = finalApproverIds.includes(userId);
  const isDirector = role === 'DIRECTOR' || pos === 'ผู้อำนวยการ' || isFinalApprover;
  const isDeputyDirector = role === 'DEPUTY_DIRECTOR' || pos === 'รองผู้อำนวยการ';

  // 2. Active assignments check (Active <=> revokedAt is null/undefined)
  const validActive = activeAssignments.filter(a => !a.revokedAt);

  const isInspector = validActive.some(a => a.dutyType === 'INSPECTOR');
  const isHRHead = validActive.some(a => a.dutyType === 'HR_HEAD' || (a.dutyType === 'DIVISION_HEAD' && a.divisionScope === 'PERSONNEL'));
  const isHRStaff = validActive.some(a => a.dutyType === 'HR_STAFF');

  const deptHeadGroups = validActive
    .filter(a => a.dutyType === 'DEPT_HEAD' && a.departmentScope)
    .map(a => a.departmentScope as ScopeDepartment);
  const isDeptHead = deptHeadGroups.length > 0;

  const divisionRoles = validActive
    .filter(a => a.dutyType === 'DIVISION_HEAD' && a.divisionScope)
    .map(a => a.divisionScope as ScopeDivision);

  // 3. Capabilities mapping (Fail-Closed: no assignment = no duty grant)
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
    canInspectLeave: isDirector || isInspector,
    canApproveLeaveHead: isDirector || isHRHead || isDeptHead,
    canManageLeaveQuotas: isAdmin || isDirector || isHRHead,
    canAccessAcademic: isAdmin || isDirector || divisionRoles.includes('ACADEMIC'),
    canAccessFacility: isAdmin || isDirector || divisionRoles.includes('GENERAL'),
    canAccessBudget: isAdmin || isDirector || divisionRoles.includes('BUDGET'),
    canManageUsers: isAdmin || isHRHead,
    canAccessDocument: isAdmin || isDirector || divisionRoles.includes('GENERAL'),
    canViewAllLeaveReports: isAdmin || isDirector || isDeputyDirector || isHRHead || isHRStaff || isInspector,
    canViewAllLeaveHistory: isAdmin || isDirector || isDeputyDirector || isHRHead || isHRStaff || isInspector,
  };
}

// ==========================================
// 2. REPAIR SYSTEM PERMISSIONS
// ==========================================

export type RepairPermission =
  | "repair:create"
  | "repair:view.own"
  | "repair:view.all"
  | "repair:view.cost"
  | "repair:dashboard"
  | "repair:assign"
  | "repair:update"
  | "repair:export"
  | "repair:delete"
  | "repair:archive";

type RepairRole = "TEACHER" | "TECHNICIAN" | "HEAD" | "ADMIN" | "REPAIR_MANAGER";

/** Static repair permission matrix */
const REPAIR_PERMISSION_MATRIX: Record<RepairRole, RepairPermission[]> = {
  TEACHER: ["repair:create", "repair:view.own"],
  TECHNICIAN: ["repair:create", "repair:view.own", "repair:view.all", "repair:update", "repair:dashboard"],
  HEAD: ["repair:create", "repair:view.own", "repair:view.all", "repair:assign", "repair:view.cost", "repair:dashboard"],
  REPAIR_MANAGER: [
    "repair:create",
    "repair:view.own",
    "repair:view.all",
    "repair:view.cost",
    "repair:dashboard",
    "repair:assign",
    "repair:update",
    "repair:export",
    "repair:delete",
    "repair:archive",
  ],
  ADMIN: [
    "repair:create",
    "repair:view.own",
    "repair:view.all",
    "repair:view.cost",
    "repair:dashboard",
    "repair:assign",
    "repair:update",
    "repair:export",
    "repair:delete",
    "repair:archive",
  ],
};

/** Derive repair role from a user's position and role fields */
export function getRepairRole(user?: {
  role?: string | null;
  position?: string | null;
} | null): RepairRole {
  if (!user) return "TEACHER";
  if (user.role === "ADMIN" || user.position === "แอดมิน") return "ADMIN";
  if (user.role === "REPAIR_MANAGER" || user.position === "ผู้จัดการเรื่องระบบซ่อม") return "REPAIR_MANAGER";
  if (user.role === "TECHNICIAN" || user.position === "ช่าง") return "TECHNICIAN";
  if (
    user.position === "หัวหน้างาน" ||
    user.position === "หัวหน้าหมวด" ||
    user.position === "ผู้อำนวยการ"
  )
    return "HEAD";
  return "TEACHER";
}

/** Check if a user has a specific repair permission */
export function hasRepairPermission(
  user?: { role?: string | null; position?: string | null } | null,
  permission?: RepairPermission
): boolean {
  if (!user || !permission) return false;
  const repairRole = getRepairRole(user);
  const matrix = REPAIR_PERMISSION_MATRIX[repairRole];
  return matrix ? matrix.includes(permission) : false;
}

/** Assert a repair permission */
export function assertRepairPermission(
  user: { role: string; position?: string | null },
  permission: RepairPermission
): void {
  if (!hasRepairPermission(user, permission)) {
    throw new Error(
      `ไม่มีสิทธิ์ดำเนินการนี้ (required: ${permission})`
    );
  }
}

// ==========================================
// 3. FACILITY & VEHICLE SYSTEM PERMISSIONS
// ==========================================

export type FacilityPermission =
  | "facility:create"
  | "facility:view.own"
  | "facility:view.all"
  | "facility:room.manage"
  | "facility:vehicle.manage"
  | "facility:driver.assign"
  | "facility:approve.director"
  | "facility:resource.create"
  | "facility:resource.manage"
  | "facility:trip.complete"
  | "facility:emergency.cancel";

export type FacilityRole =
  | "TEACHER"
  | "DRIVER"
  | "HEAD_FACILITY"
  | "HEAD_VEHICLE"
  | "DIRECTOR"
  | "ADMIN";

const FACILITY_PERMISSION_MATRIX: Record<FacilityRole, FacilityPermission[]> = {
  TEACHER: [
    "facility:create",
    "facility:view.own",
    "facility:view.all"
  ],
  DRIVER: [
    "facility:view.own",
    "facility:view.all",
    "facility:trip.complete"
  ],
  HEAD_FACILITY: [
    "facility:create",
    "facility:view.own",
    "facility:view.all",
    "facility:room.manage",
    "facility:resource.create",
    "facility:resource.manage"
  ],
  HEAD_VEHICLE: [
    "facility:create",
    "facility:view.own",
    "facility:view.all",
    "facility:vehicle.manage",
    "facility:driver.assign",
    "facility:resource.create",
    "facility:resource.manage",
    "facility:trip.complete"
  ],
  DIRECTOR: [
    "facility:create",
    "facility:view.own",
    "facility:view.all",
    "facility:approve.director"
  ],
  ADMIN: [
    "facility:create",
    "facility:view.own",
    "facility:view.all",
    "facility:room.manage",
    "facility:vehicle.manage",
    "facility:driver.assign",
    "facility:approve.director",
    "facility:resource.create",
    "facility:resource.manage",
    "facility:trip.complete",
    "facility:emergency.cancel"
  ]
};

/** Derive facility role from user's role and position */
export function getFacilityRole(user?: {
  role?: string | null;
  position?: string | null;
  department?: string | null;
} | null): FacilityRole {
  if (!user) return "TEACHER";
  if (user.role === "ADMIN" || user.position === "แอดมิน") return "ADMIN";
  if (user.role === "DIRECTOR" || user.position?.includes("ผู้อำนวยการ") || user.position?.includes("รองผู้อำนวยการ")) return "DIRECTOR";
  if (user.role === "HEAD_VEHICLE" || user.position?.includes("ยานพาหนะ") || user.department?.includes("ยานพาหนะ")) return "HEAD_VEHICLE";
  if (user.role === "HEAD_FACILITY" || user.position?.includes("อาคารสถานที่") || user.department?.includes("บริหารทั่วไป")) return "HEAD_FACILITY";
  if (user.role === "DRIVER" || user.position?.includes("พนักงานขับรถ") || user.position?.includes("คนขับรถ")) return "DRIVER";
  return "TEACHER";
}

/** Check if a user has a specific facility permission */
export function hasFacilityPermission(
  user?: { role?: string | null; position?: string | null; department?: string | null } | null,
  permission?: FacilityPermission
): boolean {
  if (!user || !permission) return false;
  const role = getFacilityRole(user);
  const matrix = FACILITY_PERMISSION_MATRIX[role];
  return matrix ? matrix.includes(permission) : false;
}

/** Assert a facility permission */
export function assertFacilityPermission(
  user: { role?: string | null; position?: string | null; department?: string | null } | null | undefined,
  permission: FacilityPermission
): void {
  if (!user || !hasFacilityPermission(user, permission)) {
    throw new Error(
      `ไม่มีสิทธิ์ดำเนินการนี้ (required: ${permission})`
    );
  }
}
