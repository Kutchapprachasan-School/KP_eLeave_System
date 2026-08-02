/**
 * Excel / CSV Import & Validation Service for Master Timetable Data
 */

export class ExcelImportService {
  /**
   * Parse raw text / JSON rows from Excel/CSV upload into normalized Timetable Entities
   */
  static parseTeacherRows(rows = []) {
    return rows.map((r, i) => {
      const teacherId = String(r.teacherId || r["รหัสครู"] || `t-${i + 1}`).trim();
      const teacherName = String(r.teacherName || r["ชื่อ-นามสกุล"] || "").trim();
      const department = String(r.department || r["กลุ่มสาระ"] || "ทั่วไป").trim();
      const maxPeriodsPerDay = parseInt(r.maxPeriodsPerDay || r["จำนวนคาบสูงสุด/วัน"] || "5", 10);

      const isValid = Boolean(teacherId && teacherName);
      const errors = [];
      if (!teacherId) errors.push("ไม่พบรหัสครู");
      if (!teacherName) errors.push("ไม่พบชื่อครู");

      return {
        rowNumber: i + 1,
        teacherId,
        teacherName,
        department,
        maxPeriodsPerDay,
        isValid,
        errors
      };
    });
  }

  static parseOfferingRows(rows = []) {
    return rows.map((r, i) => {
      const subjectCode = String(r.subjectCode || r["รหัสวิชา"] || "").trim();
      const subjectName = String(r.subjectName || r["ชื่อวิชา"] || "").trim();
      const periodsPerWeek = parseInt(r.periodsPerWeek || r["คาบ/สัปดาห์"] || "2", 10);
      const classroomName = String(r.classroomName || r["ชั้นเรียน"] || "").trim();
      const teacherId = String(r.teacherId || r["รหัสครูผู้สอน"] || "").trim();
      const teacherName = String(r.teacherName || r["ชื่อครูผู้สอน"] || "").trim();
      const roomId = String(r.roomId || r["รหัสห้อง"] || "").trim();

      const isValid = Boolean(subjectCode && subjectName && classroomName);
      const errors = [];
      if (!subjectCode) errors.push("ไม่พบรหัสวิชา");
      if (!subjectName) errors.push("ไม่พบชื่อวิชา");
      if (!classroomName) errors.push("ไม่พบชั้นเรียน");

      return {
        rowNumber: i + 1,
        offeringId: `off-${i + 1}`,
        subjectCode,
        subjectName,
        periodsPerWeek,
        classroomName,
        teacherId,
        teacherName,
        roomId,
        isValid,
        errors
      };
    });
  }

  /**
   * Convert validated offering rows into ScheduleBlocks
   */
  static convertOfferingsToScheduleBlocks(offerings = []) {
    const blocks = [];
    for (const off of offerings) {
      if (!off.isValid) continue;
      for (let p = 0; p < off.periodsPerWeek; p++) {
        blocks.push({
          id: `b-import-${off.offeringId}-${p + 1}`,
          type: "ACADEMIC_SUBJECT",
          title: off.subjectName,
          subjectCode: off.subjectCode,
          teacherIds: off.teacherId ? [off.teacherId] : [],
          teacherNames: off.teacherName ? [off.teacherName] : [],
          roomId: off.roomId,
          targetClassroomIds: [off.classroomName],
          isLocked: false,
          isFrozen: false
        });
      }
    }
    return blocks;
  }

  /**
   * Generate Sample CSV / Excel content for Template Download
   */
  static getSampleTemplateCSV() {
    return [
      "รหัสวิชา,ชื่อวิชา,กลุ่มสาระ,คาบ/สัปดาห์,ชั้นเรียน,รหัสครูผู้สอน,ชื่อครูผู้สอน,รหัสห้อง",
      "ว23101,วิทยาศาสตร์ 5,วิทยาศาสตร์,3,ม.3/1,t-1,ครูสมชาย สายวิทย์,r-lab",
      "ค23101,คณิตศาสตร์ 5,คณิตศาสตร์,3,ม.3/1,t-2,ครูสมหญิง คณิตศาสตร์,r-101",
      "ท23101,ภาษาไทย 5,ภาษาไทย,2,ม.3/1,t-3,ครูวิชัย ภาษาไทย,r-101",
      "อ23101,ภาษาอังกฤษ 5,ภาษาต่างประเทศ,2,ม.3/2,t-4,ครูนภา ภาษาต่างประเทศ,r-102"
    ].join("\n");
  }
}
