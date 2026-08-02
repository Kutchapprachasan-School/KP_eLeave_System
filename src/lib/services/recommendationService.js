/**
 * SROP Phase 3: Recommendation Engine Service
 * Implements 4-Factor Structured Rules (Department 40%, Fairness Penalty 30%, Grade Experience 20%, Slot Suitability 10%), Score Explainability, and Substitute Order Slip Generator.
 */

export class RecommendationService {
  constructor(rules = [], history = []) {
    // Default 4-Factor rules if none provided
    this.rules = rules.length > 0 ? rules : [
      { id: 'r1', field: 'departmentId', operator: 'equals', weight: 40, name: 'ตรงกลุ่มสาระการเรียนรู้ (40%)' },
      { id: 'r2', field: 'gradeExperience', operator: 'equals', weight: 20, name: 'ประสบการณ์สอนช่วงชั้น (20%)' },
      { id: 'r3', field: 'slotSuitability', operator: 'equals', weight: 10, name: 'ความเหมาะสมของช่วงเวลา (10%)' }
    ];
    this.history = history;
  }

  /**
   * Evaluate a single candidate against target context and calculate Match Score with Explainability.
   */
  evaluateCandidate(candidate, targetContext) {
    let totalScore = 0;
    const breakdown = [];

    // 1. Evaluate Structured Rules
    for (const rule of this.rules) {
      let isMatch = false;
      const candidateValue = candidate[rule.field];
      const targetValue = targetContext[rule.field];

      if (rule.operator === 'equals') {
        isMatch = candidateValue !== undefined && candidateValue === targetValue;
      } else if (rule.operator === 'contains') {
        isMatch = String(candidateValue || '').includes(String(targetValue || ''));
      }

      if (isMatch) {
        totalScore += rule.weight;
        breakdown.push({ rule: rule.name, score: rule.weight });
      }
    }

    // 2. Workload Fairness Penalty (Subtract 10 points for each recent substitution in past 30 days up to 30 points)
    const recentSubCount = this.history.filter(h => h.teacherId === candidate.id).length;
    if (recentSubCount > 0) {
      const penalty = Math.min(30, recentSubCount * 10);
      totalScore = Math.max(0, totalScore - penalty);
      breakdown.push({ rule: `ภาระงานสอนแทนสะสม (-${penalty})`, score: -penalty });
    }

    return {
      candidate,
      totalScore,
      matchPercentage: Math.min(100, Math.max(0, totalScore)),
      explainabilityBreakdown: breakdown
    };
  }

  /**
   * Rank a pool of candidates sorted by Match Percentage (highest first).
   */
  rankCandidates(candidates, targetContext) {
    const evaluated = candidates.map(c => this.evaluateCandidate(c, targetContext));
    evaluated.sort((a, b) => b.totalScore - a.totalScore);
    return evaluated;
  }

  /**
   * Generate Substitute Teaching Order Slip Payload (ใบบันทึกการปฏิบัติหน้าที่สอนแทน)
   */
  static generateSubstituteOrderSlipPayload(assignment) {
    return {
      slipId: `SLIP-${Date.now()}`,
      issueDate: new Date().toLocaleDateString("th-TH"),
      absentTeacherName: assignment.absentTeacherName,
      leaveType: assignment.leaveType || "ลากิจ / ลาป่วย",
      substituteTeacherName: assignment.substituteTeacherName,
      subjectName: assignment.subjectName,
      className: assignment.className,
      periodIndex: assignment.periodIndex,
      dayName: assignment.dayName || "วันทำการ",
      roomName: assignment.roomName || "ห้องเรียนปกติ",
      note: "บันทึกการปฏิบัติหน้าที่สอนแทนตามคำสั่งฝ่ายวิชาการ"
    };
  }
}
