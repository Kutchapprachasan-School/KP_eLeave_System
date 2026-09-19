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
  THEATER: "เธียเตอร์ (Theater)",
  CLASSROOM: "ห้องเรียน (Classroom)",
  U_SHAPE: "ตัวยู (U-Shape)",
  BOARDROOM: "โต๊ะประชุมยาว (Boardroom)",
  BANQUET: "โต๊ะกลม (Banquet)",
  HOLLOW_SQUARE: "สี่เหลี่ยมเปิดกลาง (Hollow Square)",
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
