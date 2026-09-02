/**
 * Capability-based Permission Matrix for the Repair & Facility Request Systems (v7.2)
 *
 * Role → Permission mapping is defined here in ONE place.
 * All Server Actions and Services must call permission checkers — never check `user.role` directly.
 */

// ==========================================
// REPAIR SYSTEM PERMISSIONS
// ==========================================

const REPAIR_PERMISSION_MATRIX = {
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

export function getRepairRole(user) {
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

export function hasRepairPermission(user, permission) {
  if (!user || !permission) return false;
  const repairRole = getRepairRole(user);
  const matrix = REPAIR_PERMISSION_MATRIX[repairRole];
  return matrix ? matrix.includes(permission) : false;
}

export function assertRepairPermission(user, permission) {
  if (!hasRepairPermission(user, permission)) {
    throw new Error(
      `ไม่มีสิทธิ์ดำเนินการนี้ (required: ${permission})`
    );
  }
}

// ==========================================
// FACILITY & VEHICLE SYSTEM PERMISSIONS
// ==========================================

const FACILITY_PERMISSION_MATRIX = {
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

export function getFacilityRole(user) {
  if (!user) return "TEACHER";
  if (user.role === "ADMIN" || user.position === "แอดมิน") return "ADMIN";
  if (user.role === "DIRECTOR" || user.position?.includes("ผู้อำนวยการ") || user.position?.includes("รองผู้อำนวยการ")) return "DIRECTOR";
  if (user.role === "HEAD_VEHICLE" || user.position?.includes("ยานพาหนะ") || user.department?.includes("ยานพาหนะ")) return "HEAD_VEHICLE";
  if (user.role === "HEAD_FACILITY" || user.position?.includes("อาคารสถานที่") || user.department?.includes("บริหารทั่วไป")) return "HEAD_FACILITY";
  if (user.role === "DRIVER" || user.position?.includes("พนักงานขับรถ") || user.position?.includes("คนขับรถ")) return "DRIVER";
  return "TEACHER";
}

export function hasFacilityPermission(user, permission) {
  if (!user || !permission) return false;
  const role = getFacilityRole(user);
  const matrix = FACILITY_PERMISSION_MATRIX[role];
  return matrix ? matrix.includes(permission) : false;
}

export function assertFacilityPermission(user, permission) {
  if (!user || !hasFacilityPermission(user, permission)) {
    throw new Error(
      `ไม่มีสิทธิ์ดำเนินการนี้ (required: ${permission})`
    );
  }
}
