export class EvaluationModal {
  constructor(containerElement = null) {
    this.containerElement = containerElement;
  }

  /**
   * Formats evaluation form data.
   * Parses score inputs (c1-c5) into integers within range 1-5,
   * and trims strengths & improvement_points text.
   *
   * @param {Object} inputs
   * @returns {Object} Formatted evaluation data
   */
  static formatEvaluationFormData(inputs = {}) {
    const parseScore = (val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) return 1;
      return Math.max(1, Math.min(5, num));
    };

    const c1 = parseScore(inputs.c1_lesson_prep ?? inputs.c1);
    const c2 = parseScore(inputs.c2_learning_activity ?? inputs.c2);
    const c3 = parseScore(inputs.c3_media_technology ?? inputs.c3);
    const c4 = parseScore(inputs.c4_assessment ?? inputs.c4);
    const c5 = parseScore(inputs.c5_classroom_mgmt ?? inputs.c5);

    const strengths = typeof inputs.strengths === 'string' ? inputs.strengths.trim() : '';
    const improvement_points = typeof inputs.improvement_points === 'string'
      ? inputs.improvement_points.trim()
      : typeof inputs.improvement === 'string'
      ? inputs.improvement.trim()
      : '';

    const scores = {
      c1_lesson_prep: c1,
      c2_learning_activity: c2,
      c3_media_technology: c3,
      c4_assessment: c4,
      c5_classroom_mgmt: c5
    };

    const total_score = c1 + c2 + c3 + c4 + c5;
    const max_score = 25;
    const percentage = Math.round((total_score / max_score) * 100);

    return {
      scores,
      strengths,
      improvement_points,
      total_score,
      max_score,
      percentage
    };
  }

  formatEvaluationFormData(inputs) {
    return EvaluationModal.formatEvaluationFormData(inputs);
  }

  /**
   * Escapes special HTML characters to prevent XSS.
   */
  static escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Renders HTML content for evaluation modal dialog based on session and user role.
   *
   * @param {Object} session
   * @param {string} userRole SUPERVISOR | TEACHER | DIRECTOR
   * @returns {string} HTML content string
   */
  static renderModalContent(session = {}, userRole = '') {
    const role = String(userRole || '').toUpperCase();
    const status = session.status_flow?.current_status || session.status || 'SCHEDULED';
    const evalData = session.evaluation || {};
    const scores = evalData.scores || {};

    const getScore = (key1, key2) => {
      const val = scores[key1] ?? scores[key2];
      return val !== undefined && val !== null ? Number(val) : 5;
    };

    const s1 = getScore('c1_lesson_prep', 'c1');
    const s2 = getScore('c2_learning_activity', 'c2');
    const s3 = getScore('c3_media_technology', 'c3');
    const s4 = getScore('c4_assessment', 'c4');
    const s5 = getScore('c5_classroom_mgmt', 'c5');

    const totalScore = evalData.total_score ?? (s1 + s2 + s3 + s4 + s5);
    const maxScore = evalData.max_score ?? 25;
    const percentage = evalData.percentage ?? Math.round((totalScore / maxScore) * 100);

    const subjectCode = session.subject_code || '';
    const subjectName = session.subject_name || '';
    const classLevel = session.class_level || '';
    const roomNumber = session.room_number || '';
    const teacherName = session.teacher_name || '';

    const lessonPlanUrl = session.lesson_plan_file_url || '';
    const videoUrl = session.video_link || '';
    const isOnline = session.supervision_type === 'ONLINE';

    // Header
    let html = `<div class="modal-dialog evaluation-modal">`;
    html += `<div class="modal-header">`;
    html += `<h3>แบบประเมินการนิเทศ: ${EvaluationModal.escapeHtml(subjectCode)} ${EvaluationModal.escapeHtml(subjectName)}</h3>`;
    html += `<div class="modal-subtitle">ชั้น: ${EvaluationModal.escapeHtml(classLevel)} | ห้อง: ${EvaluationModal.escapeHtml(roomNumber)}${teacherName ? ' | ครูผู้สอน: ' + EvaluationModal.escapeHtml(teacherName) : ''}</div>`;
    html += `<button class="close-btn" id="closeModalBtn" aria-label="Close">&times;</button>`;
    html += `</div>`;

    // File attachments
    html += `<div class="modal-attachments">`;
    if (lessonPlanUrl) {
      html += `<a href="${EvaluationModal.escapeHtml(lessonPlanUrl)}" target="_blank" class="file-link lesson-plan-link">📄 แผนการจัดการเรียนรู้ (PDF)</a>`;
    }
    if (isOnline && videoUrl) {
      html += `<a href="${EvaluationModal.escapeHtml(videoUrl)}" target="_blank" class="file-link video-link">🎥 ลิงก์วิดีโอการสอน (Online)</a>`;
    }
    html += `</div>`;

    // Modal Body
    html += `<div class="modal-body">`;

    const criteriaList = [
      { key: 'c1_lesson_prep', label: 'c1_lesson_prep: การเตรียมการสอน (Lesson Prep)', score: s1 },
      { key: 'c2_learning_activity', label: 'c2_learning_activity: การจัดกิจกรรมการเรียนรู้ (Learning Activity)', score: s2 },
      { key: 'c3_media_technology', label: 'c3_media_technology: การใช้สื่อและเทคโนโลยี (Media & Technology)', score: s3 },
      { key: 'c4_assessment', label: 'c4_assessment: การวัดและประเมินผล (Assessment)', score: s4 },
      { key: 'c5_classroom_mgmt', label: 'c5_classroom_mgmt: การบริหารจัดการชั้นเรียน (Classroom Mgmt)', score: s5 }
    ];

    if (role === 'SUPERVISOR') {
      const isEvaluated = Boolean(session.evaluation);
      html += `<form id="evaluationForm" class="supervisor-form">`;
      html += `<h4>แบบประเมินสำหรับผู้นิเทศ (Rubric 5 ด้าน)</h4>`;
      html += `<div class="rubric-criteria-list">`;
      criteriaList.forEach(c => {
        html += `<div class="criterion-item">`;
        html += `<label for="${c.key}">${c.label}</label>`;
        html += `<input type="number" id="${c.key}" name="${c.key}" min="1" max="5" value="${c.score}" class="score-input" required />`;
        html += `</div>`;
      });
      html += `</div>`;

      html += `<div class="form-group">`;
      html += `<label for="strengths">จุดเด่น (Strengths):</label>`;
      html += `<textarea id="strengths" name="strengths" rows="3" placeholder="ระบุจุดเด่น">${EvaluationModal.escapeHtml(evalData.strengths || '')}</textarea>`;
      html += `</div>`;

      html += `<div class="form-group">`;
      html += `<label for="improvement_points">ข้อที่ควรพัฒนา (Improvement Points):</label>`;
      html += `<textarea id="improvement_points" name="improvement_points" rows="3" placeholder="ระบุข้อที่ควรพัฒนา">${EvaluationModal.escapeHtml(evalData.improvement_points || '')}</textarea>`;
      html += `</div>`;

      if (!isEvaluated || status === 'SCHEDULED') {
        html += `<button type="submit" id="submitEvaluationBtn" class="btn-submit">บันทึกผลการนิเทศ</button>`;
      } else {
        html += `<button type="submit" id="submitEvaluationBtn" class="btn-submit">อัปเดตผลการนิเทศ</button>`;
      }
      html += `</form>`;
    } else if (role === 'TEACHER') {
      html += `<div class="teacher-view">`;
      html += `<h4>ผลการประเมินการนิเทศ</h4>`;
      html += `<div class="rubric-criteria-list">`;
      criteriaList.forEach(c => {
        html += `<div class="criterion-item display-only">`;
        html += `<span class="criterion-label">${c.label}</span>: <strong class="criterion-score">${c.score} / 5</strong>`;
        html += `</div>`;
      });
      html += `</div>`;

      html += `<div class="evaluation-summary">`;
      html += `<p class="total-score"><strong>คะแนนรวม:</strong> ${totalScore} / ${maxScore} (${percentage}%)</p>`;
      if (evalData.strengths) {
        html += `<p class="strengths-text"><strong>จุดเด่น:</strong> ${EvaluationModal.escapeHtml(evalData.strengths)}</p>`;
      }
      if (evalData.improvement_points) {
        html += `<p class="improvement-text"><strong>ข้อที่ควรพัฒนา:</strong> ${EvaluationModal.escapeHtml(evalData.improvement_points)}</p>`;
      }
      html += `</div>`;

      const teacherReflection = session.status_flow?.teacher_ack?.teacher_reflection || '';
      html += `<div class="form-group">`;
      html += `<label for="teacherReflection">ข้อคิดเห็น / การสะท้อนคิดของครู (Reflection):</label>`;
      html += `<textarea id="teacherReflection" name="teacher_reflection" rows="3" placeholder="กรอกความคิดเห็นสะท้อนการสอน">${EvaluationModal.escapeHtml(teacherReflection)}</textarea>`;
      html += `</div>`;

      if (status === 'WAITING_TEACHER_ACK') {
        html += `<button type="button" id="ackEvaluationBtn" class="btn-ack">รับทราบผลการนิเทศ</button>`;
      }
      html += `</div>`;
    } else if (role === 'DIRECTOR') {
      html += `<div class="director-view">`;
      html += `<h4>ผลการประเมินและการลงนามของผู้อำนวยการ</h4>`;
      html += `<div class="rubric-criteria-list">`;
      criteriaList.forEach(c => {
        html += `<div class="criterion-item">`;
        html += `<label for="override_${c.key}">${c.label}</label>`;
        html += `<input type="number" id="override_${c.key}" name="${c.key}" min="1" max="5" value="${c.score}" class="score-override-input" />`;
        html += `</div>`;
      });
      html += `</div>`;

      html += `<div class="total-score-display">`;
      html += `<strong>คะแนนรวม:</strong> ${totalScore} / ${maxScore} (${percentage}%)`;
      html += `</div>`;

      const directorComment = session.status_flow?.director_approval?.director_comment || '';
      html += `<div class="form-group">`;
      html += `<label for="directorComment">ความคิดเห็นของผู้อำนวยการ:</label>`;
      html += `<textarea id="directorComment" name="director_comment" rows="3" placeholder="ระบุความคิดเห็นของผู้อำนวยการ">${EvaluationModal.escapeHtml(directorComment)}</textarea>`;
      html += `</div>`;

      html += `<button type="button" id="overrideDirectorBtn" class="btn-override">ลงนาม / แก้ไขคะแนน (Override)</button>`;
      html += `</div>`;
    }

    html += `</div>`; // end modal-body
    html += `</div>`; // end modal-dialog

    return html;
  }

  renderModalContent(session, userRole) {
    return EvaluationModal.renderModalContent(session, userRole);
  }
}
