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
}
