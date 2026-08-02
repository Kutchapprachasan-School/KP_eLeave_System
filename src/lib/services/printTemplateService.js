/**
 * Print Template Service for Customizing A4 Timetable Sheets & WYSIWYG Preview
 */

export class PrintTemplateService {
  /**
   * Return Default Print Preset Configuration
   */
  static getDefaultPreset() {
    return {
      schoolName: "โรงเรียนกุดจับประชาสรรค์",
      academicYear: "2569",
      term: 1,
      subHeaderText: "สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี",
      logoUrl: "",
      orientation: "LANDSCAPE", // "LANDSCAPE" | "PORTRAIT"
      colorScheme: "MODERN",     // "MODERN" | "MONOCHROME" | "PASTEL"
      showWorkloadSummary: true,
      showSignaturesBlock: true,
      signature1Title: "ครูผู้สอน / ครูประจำชั้น",
      signature2Title: "หัวหน้างานฝ่ายวิชาการ",
      signature3Title: "ผู้อำนวยการโรงเรียน"
    };
  }

  /**
   * Calculate Workload Statistics summary for a given set of ScheduleBlocks
   */
  static calculateWorkloadSummary(blocks = []) {
    let academicPeriods = 0;
    let activityPeriods = 0;
    let lunchPeriods = 0;

    for (const b of blocks) {
      if (b.type === "ACADEMIC_SUBJECT") {
        academicPeriods++;
      } else if (b.type === "LUNCH") {
        lunchPeriods++;
      } else {
        activityPeriods++;
      }
    }

    const totalTeachingPeriods = academicPeriods + activityPeriods;

    return {
      academicPeriods,
      activityPeriods,
      lunchPeriods,
      totalTeachingPeriods
    };
  }
}
