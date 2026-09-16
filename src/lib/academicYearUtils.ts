/**
 * Canonical Date Boundary Utilities for School Academic, Fiscal & Calendar Years
 * Governing boundary calculations with Thailand Timezone (Asia/Bangkok) and UTC conversion.
 */

export interface DateRangeUtc {
  startUtc: string;
  endUtc: string;
  label: string;
}

/**
 * Returns UTC boundaries for a Thai Academic Year (ปีการศึกษา)
 * Standard: May 16, 00:00:00 ICT to May 15, 23:59:59.999 ICT (+1 year)
 * @param buddhistYear Thai Buddhist Era year (e.g. 2569)
 */
export function getAcademicYearDateRange(buddhistYear: number): DateRangeUtc {
  const ceYear = buddhistYear > 2400 ? buddhistYear - 543 : buddhistYear;
  // May 16, 00:00:00.000 in UTC+7 is May 15, 17:00:00.000 UTC
  const start = new Date(Date.UTC(ceYear, 4, 15, 17, 0, 0, 0));
  // May 15, 23:59:59.999 in UTC+7 is May 15, 16:59:59.999 UTC (+1 year)
  const end = new Date(Date.UTC(ceYear + 1, 4, 15, 16, 59, 59, 999));

  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    label: `ปีการศึกษา ${buddhistYear > 2400 ? buddhistYear : buddhistYear + 543}`
  };
}

/**
 * Returns UTC boundaries for a Thai Fiscal Year (ปีงบประมาณ)
 * Standard: October 1, 00:00:00 ICT (prior year) to September 30, 23:59:59.999 ICT
 * @param buddhistYear Thai Buddhist Era fiscal year (e.g. 2569)
 */
export function getFiscalYearDateRange(buddhistYear: number): DateRangeUtc {
  const ceYear = buddhistYear > 2400 ? buddhistYear - 543 : buddhistYear;
  // Oct 1, 00:00:00 ICT of prior CE year (ceYear - 1) is Sep 30, 17:00:00 UTC
  const start = new Date(Date.UTC(ceYear - 1, 8, 30, 17, 0, 0, 0));
  // Sep 30, 23:59:59.999 ICT of ceYear is Sep 30, 16:59:59.999 UTC
  const end = new Date(Date.UTC(ceYear, 8, 30, 16, 59, 59, 999));

  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    label: `ปีงบประมาณ ${buddhistYear > 2400 ? buddhistYear : buddhistYear + 543}`
  };
}

/**
 * Returns UTC boundaries for a Calendar Year (ปีปฏิทิน)
 * Standard: January 1, 00:00:00 ICT to December 31, 23:59:59.999 ICT
 * @param buddhistYear Thai Buddhist Era or CE year (e.g. 2569)
 */
export function getCalendarYearDateRange(buddhistYear: number): DateRangeUtc {
  const ceYear = buddhistYear > 2400 ? buddhistYear - 543 : buddhistYear;
  // Jan 1, 00:00:00 ICT of ceYear is Dec 31, 17:00:00 UTC of previous year
  const start = new Date(Date.UTC(ceYear - 1, 11, 31, 17, 0, 0, 0));
  // Dec 31, 23:59:59.999 ICT of ceYear is Dec 31, 16:59:59.999 UTC
  const end = new Date(Date.UTC(ceYear, 11, 31, 16, 59, 59, 999));

  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    label: `ปีปฏิทิน ${buddhistYear > 2400 ? buddhistYear : buddhistYear + 543}`
  };
}
