export interface UserLeaveSummaryDTO {
  userId: string;
  userName: string;
  position: string;
  subjectGroup: string;
  totalTimes: number;
  totalDays: number;
  byType: Record<string, { times: number; days: number }>;
}

export interface LeaveReportDTO {
  fiscalYear: number;
  cycle: string;
  cycleLabelTh: string;
  staffCount: number;
  canonicalTypes: Array<{ type: string; name: string }>;
  users: UserLeaveSummaryDTO[];
  generatedAt: string;
}

export type ExportScope = "all" | "only_leavers";
export type ExportFont = "Sarabun" | "Prompt" | "Noto Sans Thai" | "Kanit";
export type ExportFontSize = "small" | "normal" | "large";

export interface VisibleLeaveType {
  type: string;
  name: string;
}

export type DisplayRow = UserLeaveSummaryDTO & { index: number };

export interface GroupedDisplayRows {
  groupName: string;
  rows: DisplayRow[];
  groupTotals: {
    totalTimes: number;
    totalDays: number;
    byType: Record<string, { times: number; days: number }>;
  };
}

export interface ReportViewModel {
  visibleTypes: VisibleLeaveType[];
  displayRows: DisplayRow[];
  groupedRows: GroupedDisplayRows[];
  totals: {
    totalUsers: number;
    totalTimes: number;
    totalDays: number;
    byType: Record<string, { times: number; days: number }>;
  };
}

export const CANONICAL_LEAVE_TYPES = [
  "SICK",           // 1. ลาป่วย
  "PERSONAL",       // 2. ลากิจส่วนตัว
  "VACATION",       // 3. ลาพักผ่อน
  "MATERNITY",      // 4. ลาคลอดบุตร
  "PATERNITY",      // 5. ลาช่วยเหลือภริยาคลอดบุตร
  "ORDINATION",     // 6. ลาอุปสมบท/ฮัจญ์
  "MILITARY",       // 7. ลาตรวจเลือก/เตรียมพล
  "STUDY",          // 8. ลาศึกษาต่อ/ฝึกอบรม
  "INTERNATIONAL",  // 9. ลาไปปฏิบัติงานต่างประเทศ
  "SPOUSE",         // 10. ลาติดตามคู่สมรส
  "REHABILITATION"  // 11. ลาฟื้นฟูสมรรถภาพด้านอาชีพ
] as const;

export const LEAVE_TYPE_NAME_MAP: Record<string, string> = {
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจส่วนตัว",
  VACATION: "ลาพักผ่อน",
  MATERNITY: "ลาคลอดบุตร",
  PATERNITY: "ลาช่วยเหลือภริยาคลอดบุตร",
  ORDINATION: "ลาอุปสมบท/ฮัจญ์",
  MILITARY: "ลาตรวจเลือก/เตรียมพล",
  STUDY: "ลาศึกษาต่อ/ฝึกอบรม",
  INTERNATIONAL: "ลาไปปฏิบัติงานต่างประเทศ",
  SPOUSE: "ลาติดตามคู่สมรส",
  REHABILITATION: "ลาฟื้นฟูสมรรถภาพด้านอาชีพ"
};

export function toLocalCustomDateString(date: Date, tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

export function toUtcDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calculateLeaveDaysFast(
  startDateStr: string, // YYYY-MM-DD
  endDateStr: string,   // YYYY-MM-DD
  type: string,
  holidayDates: Set<string>,
  specialWorkdayDates: Set<string>
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (endDateStr < startDateStr) return 0;

  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const [eY, eM, eD] = endDateStr.split("-").map(Number);
  if (isNaN(sY) || isNaN(sM) || isNaN(sD) || isNaN(eY) || isNaN(eM) || isNaN(eD)) return 0;

  const startUTC = new Date(Date.UTC(sY, sM - 1, sD));
  const endUTC = new Date(Date.UTC(eY, eM - 1, eD));
  if (endUTC < startUTC) return 0;

  if (type === "MATERNITY") {
    return Math.round((endUTC.getTime() - startUTC.getTime()) / 86400000) + 1;
  }

  let count = 0;
  const current = new Date(startUTC);
  while (current <= endUTC) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    const dayStr = `${y}-${m}-${d}`;
    const dayOfWeek = current.getUTCDay();

    if (specialWorkdayDates.has(dayStr)) {
      count++;
    } else if (holidayDates.has(dayStr)) {
      // Holiday, skip
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend, skip
    } else {
      count++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

export interface BuildViewModelOptions {
  scope: ExportScope;
  groupByGroup: boolean;
  hideUnusedTypes: boolean;
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildExportViewModel(
  canonicalReport: LeaveReportDTO | null,
  options: BuildViewModelOptions
): ReportViewModel {
  if (!canonicalReport) {
    return {
      visibleTypes: [],
      displayRows: [],
      groupedRows: [],
      totals: {
        totalUsers: 0,
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      }
    };
  }

  // 1. Filter scope
  let baseUsers = [...canonicalReport.users];
  if (options.scope === "only_leavers") {
    baseUsers = baseUsers.filter(u => u.totalTimes > 0);
  }

  // 2. Sorting & Grouping
  let displayRows: DisplayRow[] = [];
  let groupedRows: GroupedDisplayRows[] = [];
  const defaultGroup = "ไม่ระบุกลุ่มสาระ/ฝ่ายงาน";

  if (options.groupByGroup) {
    const map = new Map<string, UserLeaveSummaryDTO[]>();
    for (const u of baseUsers) {
      const g = (u.subjectGroup && u.subjectGroup.trim()) ? u.subjectGroup.trim() : defaultGroup;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(u);
    }

    const sortedGroups = Array.from(map.keys()).sort((a, b) => {
      if (a === defaultGroup) return 1;
      if (b === defaultGroup) return -1;
      return a.localeCompare(b, "th");
    });

    let runningIndex = 1;
    for (const g of sortedGroups) {
      const usersInGroup = map.get(g)!.sort((a, b) => a.userName.localeCompare(b.userName, "th"));
      const rowsWithIndex: DisplayRow[] = [];
      const groupTotals = {
        totalTimes: 0,
        totalDays: 0,
        byType: {} as Record<string, { times: number; days: number }>
      };

      for (const u of usersInGroup) {
        const row = { ...u, index: runningIndex++ };
        rowsWithIndex.push(row);
        displayRows.push(row);

        groupTotals.totalTimes += u.totalTimes;
        groupTotals.totalDays += u.totalDays;
        for (const [typeKey, val] of Object.entries(u.byType || {})) {
          if (!groupTotals.byType[typeKey]) {
            groupTotals.byType[typeKey] = { times: 0, days: 0 };
          }
          groupTotals.byType[typeKey].times += val.times;
          groupTotals.byType[typeKey].days += val.days;
        }
      }

      groupedRows.push({
        groupName: g,
        rows: rowsWithIndex,
        groupTotals
      });
    }
  } else {
    const sortedUsers = baseUsers.sort((a, b) => a.userName.localeCompare(b.userName, "th"));
    displayRows = sortedUsers.map((u, i) => ({ ...u, index: i + 1 }));
  }

  // 3. Dynamic visible columns
  let visibleTypes = [...canonicalReport.canonicalTypes];
  if (options.hideUnusedTypes && displayRows.length > 0) {
    const activeTypes = visibleTypes.filter(t => {
      return displayRows.some(u => (u.byType[t.type]?.times || 0) > 0);
    });
    if (activeTypes.length > 0) {
      visibleTypes = activeTypes;
    } else {
      visibleTypes = visibleTypes.filter(t => t.type === "SICK" || t.type === "PERSONAL");
    }
  }

  // 4. Calculate Totals strictly over displayRows
  const totals = {
    totalUsers: displayRows.length,
    totalTimes: 0,
    totalDays: 0,
    byType: {} as Record<string, { times: number; days: number }>
  };

  for (const t of visibleTypes) {
    totals.byType[t.type] = { times: 0, days: 0 };
  }

  for (const u of displayRows) {
    totals.totalTimes += u.totalTimes;
    totals.totalDays += u.totalDays;
    for (const t of visibleTypes) {
      const typeData = u.byType[t.type];
      if (typeData) {
        totals.byType[t.type].times += typeData.times;
        totals.byType[t.type].days += typeData.days;
      }
    }
  }

  return {
    visibleTypes,
    displayRows,
    groupedRows,
    totals
  };
}
