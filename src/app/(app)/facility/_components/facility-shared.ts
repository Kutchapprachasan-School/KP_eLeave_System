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
