// Shared types and utilities for Facility & Vehicle subsystem

export type ModuleMode = "MEETING_ROOM" | "VEHICLE";
export type FacilityView = "request" | "calendar" | "history" | "approval" | "crud";

export function toThaiDateString(dateInput: string | Date | null | undefined, full: boolean = false): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const fullMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const d = date.getDate();
  const m = full ? fullMonths[date.getMonth()] : months[date.getMonth()];
  const y = date.getFullYear() + 543;

  if (full) {
    return `วัน${days[date.getDay()]}ที่ ${d} ${m} ${y}`;
  }
  return `${d} ${m} ${y}`;
}

export function toThaiTimeString(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} น.`;
}

export function formatISODateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getThaiMonthYear(date: Date): string {
  const fullMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `${fullMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export interface RoomConfigMetadata {
  defaultLayout: string;
  defaultEquipment: string;
  note: string;
}

export const ROOM_LAYOUT_LABELS: Record<string, string> = {
  THEATER: "แบบเธียเตอร์ (เก้าอี้เรียงแถว)",
  CLASSROOM: "แบบห้องเรียน (โต๊ะเรียงแถว)",
  U_SHAPE: "แบบโต๊ะรูปตัวยู",
  BOARDROOM: "แบบโต๊ะประชุมยาว",
  BANQUET: "แบบโต๊ะกลม",
  HOLLOW_SQUARE: "แบบโต๊ะสี่เหลี่ยมเปิดกลาง",
  OTHER: "รูปแบบอื่นๆ"
};

export function parseRoomConfig(description: string | null | undefined): RoomConfigMetadata {
  if (!description) {
    return { defaultLayout: "THEATER", defaultEquipment: "", note: "" };
  }
  const trimmed = description.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        defaultLayout: parsed.defaultLayout || "THEATER",
        defaultEquipment: parsed.defaultEquipment || "",
        note: parsed.note || ""
      };
    } catch {
      // Not JSON, fallback to note
    }
  }
  return { defaultLayout: "THEATER", defaultEquipment: "", note: trimmed };
}

export function serializeRoomConfig(cfg: Partial<RoomConfigMetadata>): string {
  return JSON.stringify({
    defaultLayout: cfg.defaultLayout || "THEATER",
    defaultEquipment: cfg.defaultEquipment || "",
    note: cfg.note || ""
  });
}

// ============================================================================
// Standard School Departments & Learning Subject Groups (for Booking Dropdown)
// ============================================================================
export const STANDARD_DEPARTMENT_OPTIONS: string[] = [
  "กลุ่มบริหารงานวิชาการ",
  "กลุ่มบริหารงานงบประมาณ",
  "กลุ่มบริหารงานบุคคล",
  "กลุ่มบริหารงานทั่วไป",
  "คณิตศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "ภาษาไทย",
  "ภาษาต่างประเทศ",
  "สังคมศึกษา ศาสนา และวัฒนธรรม",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "กิจกรรมพัฒนาผู้เรียน",
  "งานแนะแนว",
  "นักพัฒนาโรงเรียนและบุคลากรอื่นๆ"
];

// ============================================================================
// Weekly Recurring Vehicle Schedule & Semester Period Configuration
// ============================================================================
export interface VehicleRecurringScheduleRule {
  id: string;
  title: string; // เช่น "รับนักเรียนช่วงเช้า (สายประจำ)", "ส่งนักเรียนกลับบ้านช่วงเย็น"
  daysOfWeek: number[]; // 0=อา., 1=จ., 2=อ., 3=พ., 4=พฤ., 5=ศ., 6=ส.
  startTime: string; // HH:mm เช่น "06:30"
  endTime: string; // HH:mm เช่น "08:15"
  activeOnlyDuringSemester: boolean; // true = ล็อคเฉพาะวันที่มีการเรียนการสอนในช่วงเปิดเทอม (ปลดล็อคช่วงปิดเทอม/วันหยุด)
  enabled: boolean;
}

export interface VehicleConfigMetadata {
  note: string;
  hasRecurringSchedule: boolean;
  recurringSchedules: VehicleRecurringScheduleRule[];
  semesterConfig: FacilitySemesterConfig;
}

export function parseVehicleConfig(description: string | null | undefined): VehicleConfigMetadata {
  const defaultSem = getDefaultSemesterConfig();
  if (!description) {
    return { note: "", hasRecurringSchedule: false, recurringSchedules: [], semesterConfig: defaultSem };
  }
  const trimmed = description.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        Array.isArray(parsed.recurringSchedules) ||
        parsed.note !== undefined ||
        parsed.hasRecurringSchedule !== undefined ||
        parsed.semesterConfig !== undefined
      ) {
        const schedules = Array.isArray(parsed.recurringSchedules) ? parsed.recurringSchedules : [];
        const hasRecurring =
          typeof parsed.hasRecurringSchedule === "boolean"
            ? parsed.hasRecurringSchedule
            : schedules.length > 0;
        const semCfg: FacilitySemesterConfig =
          parsed.semesterConfig && Array.isArray(parsed.semesterConfig.semesters)
            ? {
                mode: parsed.semesterConfig.mode || defaultSem.mode,
                excludePublicHolidays:
                  typeof parsed.semesterConfig.excludePublicHolidays === "boolean"
                    ? parsed.semesterConfig.excludePublicHolidays
                    : true,
                semesters: parsed.semesterConfig.semesters
              }
            : defaultSem;
        return {
          note: parsed.note || "",
          hasRecurringSchedule: hasRecurring,
          recurringSchedules: schedules,
          semesterConfig: semCfg
        };
      }
    } catch {
      // Fallback to plain text note
    }
  }
  return { note: trimmed, hasRecurringSchedule: false, recurringSchedules: [], semesterConfig: defaultSem };
}

export function serializeVehicleConfig(cfg: Partial<VehicleConfigMetadata>): string {
  const schedules = Array.isArray(cfg.recurringSchedules) ? cfg.recurringSchedules : [];
  const hasRecurring =
    typeof cfg.hasRecurringSchedule === "boolean" ? cfg.hasRecurringSchedule : schedules.length > 0;
  return JSON.stringify({
    note: cfg.note || "",
    hasRecurringSchedule: hasRecurring,
    recurringSchedules: hasRecurring ? schedules : [],
    semesterConfig: cfg.semesterConfig || getDefaultSemesterConfig()
  });
}

export interface SemesterPeriod {
  id: string;
  name: string; // เช่น "ภาคเรียนที่ 1", "ภาคเรียนที่ 2"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  enabled: boolean;
}

export interface FacilitySemesterConfig {
  mode: "AUTO_DATE_RANGE" | "FORCE_OPEN" | "FORCE_CLOSED";
  excludePublicHolidays: boolean;
  semesters: SemesterPeriod[];
}

export function getDefaultSemesterConfig(): FacilitySemesterConfig {
  const now = new Date();
  const y = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    mode: "AUTO_DATE_RANGE",
    excludePublicHolidays: true,
    semesters: [
      {
        id: "sem-1",
        name: "ภาคเรียนที่ 1",
        startDate: `${y}-05-16`,
        endDate: `${y}-10-11`,
        enabled: true
      },
      {
        id: "sem-2",
        name: "ภาคเรียนที่ 2",
        startDate: `${y}-11-01`,
        endDate: `${y + 1}-03-31`,
        enabled: true
      }
    ]
  };
}

const SEMESTER_CONFIG_MARKER_START = "<!--SEMESTER_CONFIG_JSON:";
const SEMESTER_CONFIG_MARKER_END = ":END_SEMESTER_CONFIG_JSON-->";

export function parseSemesterConfigFromGuidelines(guidelinesHtml?: string | null): {
  cleanGuidelinesHtml: string;
  semesterConfig: FacilitySemesterConfig;
} {
  const defaultCfg = getDefaultSemesterConfig();
  if (!guidelinesHtml) {
    return { cleanGuidelinesHtml: "", semesterConfig: defaultCfg };
  }

  const startIdx = guidelinesHtml.indexOf(SEMESTER_CONFIG_MARKER_START);
  const endIdx = guidelinesHtml.indexOf(SEMESTER_CONFIG_MARKER_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonRaw = guidelinesHtml
      .slice(startIdx + SEMESTER_CONFIG_MARKER_START.length, endIdx)
      .trim();
    const cleanHtml = (
      guidelinesHtml.slice(0, startIdx) +
      guidelinesHtml.slice(endIdx + SEMESTER_CONFIG_MARKER_END.length)
    ).trim();

    try {
      const parsed = JSON.parse(jsonRaw);
      return {
        cleanGuidelinesHtml: cleanHtml,
        semesterConfig: {
          mode: parsed.mode || defaultCfg.mode,
          excludePublicHolidays:
            typeof parsed.excludePublicHolidays === "boolean"
              ? parsed.excludePublicHolidays
              : true,
          semesters:
            Array.isArray(parsed.semesters) && parsed.semesters.length > 0
              ? parsed.semesters
              : defaultCfg.semesters
        }
      };
    } catch {
      return { cleanGuidelinesHtml: cleanHtml, semesterConfig: defaultCfg };
    }
  }

  return { cleanGuidelinesHtml: guidelinesHtml, semesterConfig: defaultCfg };
}

export function injectSemesterConfigIntoGuidelines(
  cleanGuidelinesHtml: string,
  semesterConfig: FacilitySemesterConfig
): string {
  const { cleanGuidelinesHtml: stripped } = parseSemesterConfigFromGuidelines(cleanGuidelinesHtml);
  const jsonPayload = JSON.stringify(semesterConfig);
  return `${stripped}\n${SEMESTER_CONFIG_MARKER_START}${jsonPayload}${SEMESTER_CONFIG_MARKER_END}`;
}

export function isDateInActiveSemester(
  date: Date,
  semesterConfig?: FacilitySemesterConfig | null,
  holidays?: Array<{ date: string | Date; name: string; isWorkday?: boolean }>
): {
  isSemesterOpen: boolean;
  semesterName?: string;
  reason: string;
} {
  const cfg = semesterConfig || getDefaultSemesterConfig();
  const dateIso = formatISODateInput(date);

  if (cfg.mode === "FORCE_CLOSED") {
    return {
      isSemesterOpen: false,
      reason: "อยู่ในโหมดปิดภาคเรียน (ปลดล็อคคิวรถรับ-ส่งนักเรียนประจำวัน)"
    };
  }

  // Check public holidays if enabled
  if (cfg.excludePublicHolidays && Array.isArray(holidays)) {
    const matchedHoliday = holidays.find((h) => {
      const hIso = typeof h.date === "string" ? h.date.slice(0, 10) : formatISODateInput(new Date(h.date));
      return hIso === dateIso && !h.isWorkday;
    });
    if (matchedHoliday) {
      return {
        isSemesterOpen: false,
        reason: `วันหยุดราชการ (${matchedHoliday.name}) — งดคิวรถรับ-ส่งนักเรียนประจำวัน`
      };
    }
  }

  if (cfg.mode === "FORCE_OPEN") {
    return {
      isSemesterOpen: true,
      semesterName: "เปิดภาคเรียน",
      reason: "อยู่ในช่วงเปิดภาคเรียน"
    };
  }

  // AUTO_DATE_RANGE
  for (const sem of cfg.semesters || []) {
    if (!sem.enabled || !sem.startDate || !sem.endDate) continue;
    if (sem.startDate <= dateIso && dateIso <= sem.endDate) {
      return {
        isSemesterOpen: true,
        semesterName: sem.name,
        reason: `อยู่ในช่วง${sem.name} (${sem.startDate} ถึง ${sem.endDate})`
      };
    }
  }

  return {
    isSemesterOpen: false,
    reason: "อยู่ในช่วงปิดภาคเรียน (งดคิวรถรับ-ส่งนักเรียนประจำวัน สามารถจองใช้รถไปกิจกรรม/แข่งขันได้)"
  };
}

export const THAI_DOW_SHORT: Record<number, string> = {
  1: "จ.",
  2: "อ.",
  3: "พ.",
  4: "พฤ.",
  5: "ศ.",
  6: "ส.",
  0: "อา."
};

export function formatRecurringDaysLabel(daysOfWeek: number[]): string {
  if (!daysOfWeek || daysOfWeek.length === 0) return "-";
  const sorted = [...daysOfWeek].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (sorted.length === 5 && sorted.join(",") === "1,2,3,4,5") {
    return "จันทร์ - ศุกร์";
  }
  if (sorted.length === 7) {
    return "ทุกวัน";
  }
  return sorted.map((d) => THAI_DOW_SHORT[d] || "").join(", ");
}

export interface EvaluatedVehicleRecurringSlot {
  rule: VehicleRecurringScheduleRule;
  resourceId: string;
  resourceName: string;
  resourceCode: string;
  dateIso: string;
  startHourFloat: number;
  endHourFloat: number;
  isLocked: boolean; // true = ล็อคคิว (เปิดเทอม), false = ปลดล็อคอัตโนมัติ (ปิดเทอม/วันหยุด)
  statusReason: string;
}

export function evaluateVehicleRecurringSlotsForDate(
  resource: any,
  date: Date,
  fallbackSemesterConfig?: FacilitySemesterConfig | null,
  holidays?: Array<{ date: string | Date; name: string; isWorkday?: boolean }>
): EvaluatedVehicleRecurringSlot[] {
  if (!resource || resource.type !== "VEHICLE") return [];
  const vCfg = parseVehicleConfig(resource.description);
  if (!vCfg.hasRecurringSchedule || !vCfg.recurringSchedules || vCfg.recurringSchedules.length === 0) return [];

  const dow = date.getDay();
  const dateIso = formatISODateInput(date);
  const effectiveSemesterConfig = vCfg.semesterConfig || fallbackSemesterConfig || getDefaultSemesterConfig();
  const semState = isDateInActiveSemester(date, effectiveSemesterConfig, holidays);

  const results: EvaluatedVehicleRecurringSlot[] = [];

  for (const rule of vCfg.recurringSchedules) {
    if (!rule.enabled) continue;
    if (!Array.isArray(rule.daysOfWeek) || !rule.daysOfWeek.includes(dow)) continue;

    const [sh, sm] = (rule.startTime || "06:30").split(":").map(Number);
    const [eh, em] = (rule.endTime || "08:15").split(":").map(Number);
    const startHourFloat = (sh || 0) + (sm || 0) / 60;
    const endHourFloat = (eh || 0) + (em || 0) / 60;

    const isLocked = rule.activeOnlyDuringSemester ? semState.isSemesterOpen : true;

    results.push({
      rule,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceCode: resource.code,
      dateIso,
      startHourFloat,
      endHourFloat,
      isLocked,
      statusReason: semState.reason
    });
  }

  return results;
}

