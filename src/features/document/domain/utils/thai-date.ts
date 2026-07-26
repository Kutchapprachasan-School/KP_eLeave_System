/**
 * Converts a Date or date string to Buddhist Era year (+543).
 */
export function toBuddhistYear(date: Date | string | number = new Date()): number {
  const d = new Date(date);
  return d.getFullYear() + 543;
}

/**
 * Formats a date string or Date object into full Thai date format (e.g. 26 กรกฎาคม 2569).
 */
export function formatThaiDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a date string or Date object into short Thai date format (e.g. 26 ก.ค. 2569).
 */
export function formatThaiDateShort(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns an array of available Buddhist Era years for selection options.
 */
export function getAvailableBuddhistYears(backYears: number = 4): number[] {
  const currentBE = toBuddhistYear();
  return Array.from({ length: backYears }, (_, i) => currentBE - i);
}
