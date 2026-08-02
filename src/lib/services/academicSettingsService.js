/**
 * Academic Settings & Operations Management Service
 * Centralized Manager for Academic Year, Terms, Periods, Workload Thresholds, Departments, Classrooms, and Activity Locks
 */

const DEFAULT_SETTINGS = {
  academicYear: "2569",
  term: 1,
  startDate: "2026-05-16",
  endDate: "2026-10-10",
  dailyPeriodsCount: 8,
  periodDurationMinutes: 50,
  lunchPeriodIndex: 4,

  // Teacher Workload Policy Limits
  workloadLimits: {
    minWeeklyPeriods: 18,
    maxWeeklyPeriods: 22,
    maxDailyPeriods: 5,
    allowConsecutivePeriods: 3
  },

  // Standard 8 Learning Departments
  departments: [
    { id: "DEP-SCI", name: "วิทยาศาสตร์และเทคโนโลยี", headTeacher: "นายเดชาธร ศรีสุข", teacherCount: 12 },
    { id: "DEP-MATH", name: "คณิตศาสตร์", headTeacher: "นางสาวอนุสรา เหล็กดี", teacherCount: 10 },
    { id: "DEP-THAI", name: "ภาษาไทย", headTeacher: "ครูวิชัย ภาษาไทย", teacherCount: 8 },
    { id: "DEP-ENG", name: "ภาษาต่างประเทศ", headTeacher: "ครูนภา ต่างประเทศ", teacherCount: 9 },
    { id: "DEP-SOC", name: "สังคมศึกษา ศาสนา และวัฒนธรรม", headTeacher: "ครูเดชา สังคมศึกษา", teacherCount: 8 },
    { id: "DEP-ART", name: "ศิลปะ (ดนตรี/นาฏศิลป์)", headTeacher: "ครูอารีย์ ศิลปะ", teacherCount: 4 },
    { id: "DEP-HEALTH", name: "สุขศึกษาและพลศึกษา", headTeacher: "ครูสมศักดิ์ พลศึกษา", teacherCount: 5 },
    { id: "DEP-WORK", name: "การงานอาชีพ", headTeacher: "ครูสมศรี การงาน", teacherCount: 4 }
  ],

  // Classrooms & Grade Levels
  classrooms: [
    { id: "m1-1", name: "ม.1/1", level: "ม.ต้น", studentCount: 35, advisorTeacher: "ครูสมชาย" },
    { id: "m1-2", name: "ม.1/2", level: "ม.ต้น", studentCount: 34, advisorTeacher: "ครูสมหญิง" },
    { id: "m2-1", name: "ม.2/1", level: "ม.ต้น", studentCount: 36, advisorTeacher: "ครูวิชัย" },
    { id: "m3-1", name: "ม.3/1", level: "ม.ต้น", studentCount: 38, advisorTeacher: "ครูนภา" },
    { id: "m4-1", name: "ม.4/1", level: "ม.ปลาย", studentCount: 32, advisorTeacher: "ครูเดชา" },
    { id: "m5-1", name: "ม.5/1", level: "ม.ปลาย", studentCount: 30, advisorTeacher: "ครูอารีย์" },
    { id: "m6-1", name: "ม.6/1", level: "ม.ปลาย", studentCount: 28, advisorTeacher: "ครูสมศักดิ์" }
  ],

  // Student Development Activities Locks
  lockedActivities: [
    { id: "act-assembly", name: "เข้าแถวเคารพธงชาติ & สวดมนต์", dayOfWeek: 1, periodIndex: 1, scope: "ทั้งโรงเรียน" },
    { id: "act-lunch", name: "พักกลางวันประจำวัน", dayOfWeek: 0, periodIndex: 4, scope: "ทั้งโรงเรียน" },
    { id: "act-scout", name: "ลูกเสือ - เนตรนารี", dayOfWeek: 3, periodIndex: 7, scope: "ม.ต้น" },
    { id: "act-club", name: "กิจกรรมชุมนุม", dayOfWeek: 4, periodIndex: 7, scope: "ม.ปลาย" }
  ]
};

let currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

export class AcademicSettingsService {
  static getSettings() {
    return currentSettings;
  }

  static updateSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    return currentSettings;
  }

  static resetToDefaults() {
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    return currentSettings;
  }

  static addDepartment(dept) {
    const newDept = {
      id: `DEP-${Date.now()}`,
      teacherCount: 1,
      ...dept
    };
    currentSettings.departments.push(newDept);
    return newDept;
  }

  static addClassroom(classroom) {
    const newClass = {
      id: `cls-${Date.now()}`,
      studentCount: 30,
      ...classroom
    };
    currentSettings.classrooms.push(newClass);
    return newClass;
  }
}
