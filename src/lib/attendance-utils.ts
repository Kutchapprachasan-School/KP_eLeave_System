/**
 * Attendance utility helpers — shared between server and client
 */

/** Status display labels (Thai) */
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "ตรงเวลา",
  LATE: "สาย",
  EARLY_OUT: "ออกก่อนเวลา",
  ABSENT: "ขาด",
  LEAVE: "ลา",
  HOLIDAY: "วันหยุด",
  OFFICIAL_DUTY: "ไปราชการ",
};

/** Status badge color class mappings */
export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  LATE: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  EARLY_OUT: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  ABSENT: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  HOLIDAY: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  OFFICIAL_DUTY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400",
};

/** Format time from ISO string to HH:MM Thai locale */
export function formatAttendanceTime(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

/** Format date from ISO string to Thai locale short date */
export function formatAttendanceDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Calculate SHA-256 hash in the browser (for fingerprinting) */
export async function browserSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a browser fingerprint hash */
export async function getBrowserFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];
  return browserSHA256(components.join("|"));
}

/** Compress a canvas to a low-res JPEG data URL (~15KB target) */
export function compressPhoto(
  canvas: HTMLCanvasElement,
  maxWidth = 160,
  maxHeight = 160,
  quality = 0.5
): string {
  const offscreen = document.createElement("canvas");
  const ctx = offscreen.getContext("2d");
  if (!ctx) return "";

  const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  offscreen.width = Math.round(canvas.width * ratio);
  offscreen.height = Math.round(canvas.height * ratio);
  ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

  return offscreen.toDataURL("image/jpeg", quality);
}

export function isDateOnLeave(date: Date, userId: string, leaves: any[]): boolean {
  const targetTime = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return leaves.some((l) => {
    if (l.userId !== userId) return false;

    // Convert dates if they are strings or Date objects
    const startD = new Date(l.startDate);
    const endD = new Date(l.endDate);

    const leaveStart = Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth(), startD.getUTCDate());
    const leaveEnd = Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth(), endD.getUTCDate());

    return targetTime >= leaveStart && targetTime <= leaveEnd;
  });
}
