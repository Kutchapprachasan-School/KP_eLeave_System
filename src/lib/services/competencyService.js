/**
 * Teacher Competency & Performance Agreement (PA) Portfolio Service
 * Manages 5-Dimension Competency Scoring, PD Hours Tracking, and PA Portfolio Summary Generation
 */

export class CompetencyService {
  /**
   * Calculate 5-Dimension Competency Score
   */
  static calculateCompetencyScore(scores = {}) {
    const {
      c1_pedagogy = 5,
      c2_innovation = 4,
      c3_classroom = 5,
      c4_evaluation = 4,
      c5_ethics = 5
    } = scores;

    const total = c1_pedagogy + c2_innovation + c3_classroom + c4_evaluation + c5_ethics;
    const maxScore = 25;
    const percentage = Math.round((total / maxScore) * 100);

    let gradeLevel = "ปรับปรุง";
    if (percentage >= 90) gradeLevel = "ดีเยี่ยม";
    else if (percentage >= 80) gradeLevel = "ดีมาก";
    else if (percentage >= 70) gradeLevel = "ดี";
    else if (percentage >= 60) gradeLevel = "พอใช้";

    return {
      scores: { c1_pedagogy, c2_innovation, c3_classroom, c4_evaluation, c5_ethics },
      total,
      maxScore,
      percentage,
      gradeLevel
    };
  }

  /**
   * Generate PA Portfolio Summary Payload
   */
  static generatePAPortfolioSummary(teacher = {}) {
    return {
      portfolioId: `PA-${Date.now()}`,
      teacherName: teacher.name || "ครูผู้ขอรับการประเมิน",
      position: teacher.position || "ครู ชำนาญการพิเศษ",
      department: teacher.department || "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
      academicYear: teacher.academicYear || "2569",
      pdHoursTotal: teacher.pdHoursTotal || 24,
      teachingHoursWeekly: teacher.teachingHoursWeekly || 20,
      paStatus: "PASSED_DIRECTOR_REVIEW",
      issueDate: new Date().toLocaleDateString("th-TH")
    };
  }
}
