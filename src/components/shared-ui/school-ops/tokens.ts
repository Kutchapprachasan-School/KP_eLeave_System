/**
 * 🎨 School Operations Design System Tokens
 * Strictly isolated for the 4 whitelisted subsystems:
 * Certificate, Facility, Supervision, and Budget.
 */

export type SemanticTone = "info" | "warning" | "success" | "danger" | "neutral";

export type SubsystemKey = 
  | "budget" 
  | "facility_room" 
  | "facility_vehicle" 
  | "supervision" 
  | "certificate";

/**
 * Canonical status-to-semantic-tone mapping across the 4 school operations modules.
 */
export const STATUS_TO_TONE_MAP: Record<string, SemanticTone> = {
  // Information / Scheduled / Drafting
  SCHEDULED: "info",
  NOT_STARTED: "info",
  IN_PROGRESS: "info",
  UPCOMING: "info",
  DRAFT: "neutral",

  // Waiting / Pending / Under Review
  SUBMITTED: "warning",
  WAITING_TEACHER_ACK: "warning",
  WAITING_DIRECTOR_SIGN: "warning",
  PENDING: "warning",
  PENDING_HEAD: "warning",
  PENDING_DIRECTOR: "warning",
  REVIEW: "warning",
  PARTIAL: "warning",

  // Success / Approved / Completed / Active
  APPROVED: "success",
  COMPLETED: "success",
  ACTIVE: "success",
  TEACHER_ACKNOWLEDGED: "success",
  VALID: "success",
  AVAILABLE: "success",
  DONE: "success",
  RECEIVED: "success",

  // Danger / Terminated / Maintenance / Rejected
  REJECTED: "danger",
  CANCELLED: "danger",
  CLOSED: "danger",
  REVERSED: "danger",
  REVOKED: "danger",
  UNDER_MAINTENANCE: "danger",
  RETIRED: "danger",
  FAILED: "danger",
};

/**
 * Standard Thai localized labels for known statuses in school operations.
 */
export const STATUS_THAI_LABELS: Record<string, string> = {
  SCHEDULED: "นัดหมายแล้ว",
  NOT_STARTED: "ยังไม่เริ่ม",
  IN_PROGRESS: "กำลังดำเนินการ",
  UPCOMING: "เร็วๆ นี้",
  DRAFT: "ฉบับร่าง",

  SUBMITTED: "ยื่นคำขอแล้ว",
  WAITING_TEACHER_ACK: "รอครูรับทราบผล",
  WAITING_DIRECTOR_SIGN: "รอ ผอ. ลงนาม",
  PENDING: "รอการอนุมัติ",
  PENDING_HEAD: "รอหัวหน้าฝ่ายตรวจสอบ",
  PENDING_DIRECTOR: "รอผู้อำนวยการอนุมัติ",
  REVIEW: "กำลังตรวจสอบ",
  PARTIAL: "โอนเข้าบางส่วน",

  APPROVED: "อนุมัติแล้ว",
  COMPLETED: "เสร็จสิ้นสมบูรณ์",
  ACTIVE: "เปิดใช้งาน",
  TEACHER_ACKNOWLEDGED: "ครูรับทราบแล้ว",
  VALID: "รับรองความถูกต้องแล้ว",
  AVAILABLE: "พร้อมให้บริการ",
  DONE: "เสร็จสิ้น",
  RECEIVED: "โอนเข้าครบแล้ว",

  REJECTED: "ไม่อนุมัติ / ปฏิเสธ",
  CANCELLED: "ยกเลิกแล้ว",
  CLOSED: "ปิดรอบบัญชีแล้ว",
  REVERSED: "ยกเลิก/คืนยอดแล้ว",
  REVOKED: "เพิกถอนสิทธิ์",
  UNDER_MAINTENANCE: "แจ้งซ่อมบำรุง",
  RETIRED: "ปลดระวาง",
  FAILED: "ไม่ผ่าน",
};

/**
 * Resolves any status string to its semantic tone.
 * If status is unrecognized, issues a console warning in non-production environments
 * and safely falls back to "neutral".
 */
export function resolveStatusTone(status?: string | null): SemanticTone {
  if (!status || typeof status !== "string") return "neutral";
  const normalized = status.toUpperCase().trim();
  const tone = STATUS_TO_TONE_MAP[normalized];
  if (!tone) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.warn(`[StatusPillBadge] Unregistered status: "${status}". Falling back to "neutral".`);
    }
    return "neutral";
  }
  return tone;
}

/**
 * Resolves Thai label for status, falling back to custom fallback or normalized status string.
 */
export function resolveStatusLabel(status?: string | null, fallback?: string): string {
  if (!status || typeof status !== "string") return fallback || "-";
  const normalized = status.toUpperCase().trim();
  return STATUS_THAI_LABELS[normalized] || fallback || status;
}

/**
 * Tailwind class mappings for semantic tones in badges and status containers.
 */
export const TONE_CLASSES: Record<SemanticTone, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

/**
 * Dot indicator colors for status pill badges.
 */
export const TONE_DOT_CLASSES: Record<SemanticTone, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
  neutral: "bg-slate-400",
};

/**
 * Subsystem-specific accents strictly reserved for:
 * - Header Icon Badges
 * - KPI card borders / micro-accents
 * - Subsystem entity badges
 * NOTE: Buttons and primary interactive elements always use Unified Indigo.
 */
export const SUBSYSTEM_ACCENTS: Record<
  SubsystemKey,
  {
    name: string;
    iconBadge: string;
    text: string;
    border: string;
    bgSoft: string;
  }
> = {
  budget: {
    name: "ฝ่ายบริหารงานงบประมาณ",
    iconBadge: "bg-emerald-600 text-white shadow-emerald-600/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    bgSoft: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  facility_room: {
    name: "ระบบจองห้องประชุมและอาคารสถานที่",
    iconBadge: "bg-teal-600 text-white shadow-teal-600/20",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    bgSoft: "bg-teal-50 dark:bg-teal-950/40",
  },
  facility_vehicle: {
    name: "ระบบจองรถโรงเรียนและยานพาหนะ",
    iconBadge: "bg-amber-600 text-white shadow-amber-600/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    bgSoft: "bg-amber-50 dark:bg-amber-950/40",
  },
  supervision: {
    name: "ระบบนิเทศการสอนออนไลน์ & วPA",
    iconBadge: "bg-indigo-600 text-white shadow-indigo-600/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    bgSoft: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  certificate: {
    name: "ระบบเกียรติบัตรและทะเบียนดิจิทัล",
    iconBadge: "bg-amber-500 text-white shadow-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    bgSoft: "bg-amber-50 dark:bg-amber-950/40",
  },
};

/**
 * Unified Interactive Primitives Styles
 */
export const PRIMARY_ACTION_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

export const SECONDARY_ACTION_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

export const CARD_CLASSES =
  "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs";

export const INPUT_CLASSES =
  "w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";
