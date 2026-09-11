export class SupervisionService {
  constructor(dataStore = []) {
    this.store = dataStore;
  }

  isValidUrl(url) {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return ['youtube.com', 'www.youtube.com', 'youtu.be', 'drive.google.com', 'onedrive.live.com', '1drv.ms'].some(
        (domain) => parsed.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }

  createSlot(data) {
    if (data.video_link && !this.isValidUrl(data.video_link)) {
      throw new Error('INVALID_VIDEO_URL: Must be a valid YouTube, Google Drive, or OneDrive link');
    }

    const session = {
      session_id: `SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...data,
      evaluation: null,
      status_flow: {
        current_status: 'SCHEDULED',
        teacher_ack: { acknowledged: false },
        director_approval: { approved: false }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.store.push(session);
    return session;
  }

  getWeeklySlots(academicYear, term, weekNumber) {
    return this.store.filter(
      (s) => s.academic_year === academicYear && s.term === term && s.week_number === weekNumber
    );
  }

  submitEvaluation(sessionId, evaluationData, supervisorId) {
    const session = this.store.find((s) => s.session_id === sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const scores = evaluationData.scores || {};
    const scoreValues = Object.values(scores);
    const totalScore = scoreValues.reduce((a, b) => a + b, 0);
    const maxScore = scoreValues.length * 5;

    session.evaluation = {
      rubric_version: 'v2026.1',
      scores: scores,
      total_score: totalScore,
      max_score: maxScore,
      percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
      strengths: evaluationData.strengths || '',
      improvement_points: evaluationData.improvement_points || '',
      evaluated_by: supervisorId,
      evaluated_at: new Date().toISOString()
    };
    session.status_flow.current_status = 'WAITING_TEACHER_ACK';
    session.updated_at = new Date().toISOString();
    return session;
  }

  acknowledgeTeacher(sessionId, reflectionText) {
    const session = this.store.find((s) => s.session_id === sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.status_flow.current_status !== 'WAITING_TEACHER_ACK') {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    session.status_flow.teacher_ack = {
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      teacher_reflection: reflectionText || ''
    };
    session.status_flow.current_status = 'WAITING_DIRECTOR_SIGN';
    session.updated_at = new Date().toISOString();
    return session;
  }

  overrideDirectorScore(sessionId, directorId, newScores, comment) {
    const session = this.store.find((s) => s.session_id === sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const originalScores = session.evaluation ? { ...session.evaluation.scores } : null;
    const scoreValues = Object.values(newScores);
    const totalScore = scoreValues.reduce((a, b) => a + b, 0);
    const maxScore = scoreValues.length * 5;

    session.evaluation = {
      ...session.evaluation,
      scores: newScores,
      total_score: totalScore,
      max_score: maxScore,
      percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
      evaluated_at: new Date().toISOString()
    };

    session.status_flow.director_approval = {
      approved: true,
      approved_at: new Date().toISOString(),
      director_id: directorId,
      score_overridden: true,
      original_scores: originalScores,
      director_comment: comment || ''
    };
    session.status_flow.current_status = 'COMPLETED';
    session.updated_at = new Date().toISOString();
    return session;
  }

  // ==========================================
  // 📊 วPA & SUPERVISION REPORTING ENGINE
  // ==========================================

  static getPaRatingBand(percentage) {
    if (percentage >= 90) return { band: 'EXCELLENT', label: 'ดีเยี่ยม', minPercent: 90 };
    if (percentage >= 80) return { band: 'VERY_GOOD', label: 'ดีมาก', minPercent: 80 };
    if (percentage >= 70) return { band: 'GOOD', label: 'ดี', minPercent: 70 };
    if (percentage >= 60) return { band: 'PASS', label: 'ผ่านเกณฑ์', minPercent: 60 };
    return { band: 'NEEDS_IMPROVEMENT', label: 'ควรได้รับการพัฒนา', minPercent: 0 };
  }

  generateDepartmentKpiSummary(academicYear, term) {
    const sessions = this.store.filter(
      (s) =>
        (!academicYear || s.academic_year === academicYear) &&
        (!term || s.term === term)
    );

    const departmentsMap = new Map();

    for (const s of sessions) {
      const dept = s.department || 'ไม่ระบุกลุ่มสาระ';
      if (!departmentsMap.has(dept)) {
        departmentsMap.set(dept, {
          department: dept,
          totalSessions: 0,
          completedSessions: 0,
          pendingAckSessions: 0,
          scheduledSessions: 0,
          scoresTotal: 0,
          percentagesTotal: 0,
          evaluatedCount: 0,
        });
      }

      const entry = departmentsMap.get(dept);
      entry.totalSessions++;

      const status = s.status_flow?.current_status;
      if (status === 'COMPLETED') entry.completedSessions++;
      else if (status === 'WAITING_TEACHER_ACK') entry.pendingAckSessions++;
      else if (status === 'SCHEDULED') entry.scheduledSessions++;

      if (s.evaluation?.percentage !== undefined) {
        entry.percentagesTotal += s.evaluation.percentage;
        entry.scoresTotal += s.evaluation.total_score || 0;
        entry.evaluatedCount++;
      }
    }

    const result = [];
    for (const [dept, data] of departmentsMap.entries()) {
      const avgPercent =
        data.evaluatedCount > 0 ? Number((data.percentagesTotal / data.evaluatedCount).toFixed(2)) : 0;
      const avgScore =
        data.evaluatedCount > 0 ? Number((data.scoresTotal / data.evaluatedCount).toFixed(2)) : 0;
      const complianceRate =
        data.totalSessions > 0 ? Number(((data.completedSessions / data.totalSessions) * 100).toFixed(2)) : 0;

      result.push({
        department: dept,
        totalSessions: data.totalSessions,
        completedSessions: data.completedSessions,
        pendingAckSessions: data.pendingAckSessions,
        scheduledSessions: data.scheduledSessions,
        averagePercentage: avgPercent,
        averageScore: avgScore,
        complianceRate,
        ratingBand: SupervisionService.getPaRatingBand(avgPercent),
      });
    }

    return result.sort((a, b) => b.averagePercentage - a.averagePercentage);
  }

  generateTeacherPaReport(teacherId, academicYear) {
    const sessions = this.store.filter(
      (s) =>
        s.teacher_id === teacherId &&
        (!academicYear || s.academic_year === academicYear)
    );

    const evaluatedSessions = sessions.filter((s) => s.evaluation);

    // Breakdown for the 5 criteria
    const criteriaSums = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
    const criteriaCounts = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };

    const strengthsList = [];
    const improvementsList = [];

    for (const s of evaluatedSessions) {
      const sc = s.evaluation.scores || {};
      for (const [key, val] of Object.entries(sc)) {
        const normalizedKey = key.startsWith('c1')
          ? 'c1'
          : key.startsWith('c2')
          ? 'c2'
          : key.startsWith('c3')
          ? 'c3'
          : key.startsWith('c4')
          ? 'c4'
          : key.startsWith('c5')
          ? 'c5'
          : key;
        if (criteriaSums[normalizedKey] !== undefined) {
          criteriaSums[normalizedKey] += Number(val);
          criteriaCounts[normalizedKey]++;
        }
      }
      if (s.evaluation.strengths) strengthsList.push(s.evaluation.strengths);
      if (s.evaluation.improvement_points) improvementsList.push(s.evaluation.improvement_points);
    }

    const criteriaAverages = {};
    for (const key of ['c1', 'c2', 'c3', 'c4', 'c5']) {
      criteriaAverages[key] =
        criteriaCounts[key] > 0
          ? Number((criteriaSums[key] / criteriaCounts[key]).toFixed(2))
          : 0;
    }

    const totalAverageScore = Number(
      Object.values(criteriaAverages).reduce((a, b) => a + b, 0).toFixed(2)
    );
    const overallPercentage =
      evaluatedSessions.length > 0
        ? Number(((totalAverageScore / 25) * 100).toFixed(2))
        : 0;

    return {
      teacherId,
      academicYear,
      totalSupervisions: sessions.length,
      evaluatedSupervisions: evaluatedSessions.length,
      criteriaAverages: {
        c1_lesson_prep: criteriaAverages.c1,
        c2_learning_activity: criteriaAverages.c2,
        c3_media_technology: criteriaAverages.c3,
        c4_assessment: criteriaAverages.c4,
        c5_classroom_mgmt: criteriaAverages.c5,
      },
      totalAverageScore,
      maxScore: 25,
      overallPercentage,
      ratingBand: SupervisionService.getPaRatingBand(overallPercentage),
      strengthsSummary: strengthsList,
      improvementPointsSummary: improvementsList,
      sessions: sessions.map((s) => ({
        sessionId: s.session_id,
        weekNumber: s.week_number,
        subjectCode: s.subject_code,
        subjectName: s.subject_name,
        supervisionType: s.supervision_type,
        status: s.status_flow?.current_status,
        percentage: s.evaluation?.percentage || 0,
        directorApproval: s.status_flow?.director_approval?.approved || false,
      })),
    };
  }
}
