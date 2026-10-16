export interface DashboardWidgetConfig {
  // Main Section Widgets
  heroBanner: boolean;
  subsystemQuickHub: boolean;
  kpiStatsGrid: boolean;
  learningOutcomeChart: boolean;
  attendanceDonutCard: boolean;
  operationsStrip: boolean;
  distributionCharts: boolean;
  studentAffairsOverview: boolean;
  announcementsCard: boolean;
  academicCalendarCard: boolean;
  approvalQueue: boolean;
  monthlyTrendChart: boolean;
  leaveCalendar: boolean;

  // Granular Modular KPI Cards
  kpiStaffLeavePending: boolean;
  kpiStaffOnLeave: boolean;
  kpiStaffProxyTeaching: boolean;
  kpiStaffAttendance: boolean;
  kpiStudentTotal: boolean;
  kpiStudentPresentToday: boolean;
  kpiStudentLeavesToday: boolean;
  kpiStudentRiskEws: boolean;
  kpiDocumentPending: boolean;
  kpiRepairActive: boolean;
  kpiFacilityToday: boolean;

  // Backward compatibility alias
  kpiStats?: boolean;
  studentLeaveOverview?: boolean;
  executiveAnalytics?: boolean;
}

export const DEFAULT_WIDGET_CONFIG: DashboardWidgetConfig = {
  // Main Section Widgets
  heroBanner: true,
  subsystemQuickHub: true,
  kpiStatsGrid: true,
  learningOutcomeChart: true,
  attendanceDonutCard: true,
  operationsStrip: true,
  distributionCharts: true,
  studentAffairsOverview: true,
  announcementsCard: true,
  academicCalendarCard: true,
  approvalQueue: true,
  monthlyTrendChart: true,
  leaveCalendar: true,

  // Granular Modular KPI Cards
  kpiStaffLeavePending: true,
  kpiStaffOnLeave: true,
  kpiStaffProxyTeaching: true,
  kpiStaffAttendance: true,
  kpiStudentTotal: true,
  kpiStudentPresentToday: true,
  kpiStudentLeavesToday: true,
  kpiStudentRiskEws: true,
  kpiDocumentPending: true,
  kpiRepairActive: true,
  kpiFacilityToday: true,

  // Compatibility
  kpiStats: true,
  studentLeaveOverview: true,
  executiveAnalytics: true,
};
