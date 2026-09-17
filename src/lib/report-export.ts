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
