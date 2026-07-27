import test from 'node:test';
import assert from 'node:assert/strict';
import { SupervisionService } from '../../src/services/supervisionService.js';

test('Supervision E2E - Full 4-Step Instructional Supervision Workflow', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  // Step 1: Create a Supervision Slot (online with video URL validation and lesson plan URL)
  const slotData = {
    academic_year: '2569',
    term: 1,
    week_number: 6,
    day_of_week: 'MONDAY',
    period_number: 2,
    time_slot: '09:20-10:10',
    teacher_id: 'EMP-042',
    teacher_name: 'นายเดชาธร ศรีสุข',
    department: 'วิทยาศาสตร์',
    subject_code: 'ว23101',
    subject_name: 'วิทยาศาสตร์ 5',
    class_level: 'ม.3/1',
    room_number: '324',
    supervision_type: 'ONLINE',
    video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    lesson_plan_file_url: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H/view',
    supervisor_ids: ['EMP-018']
  };

  const slot = service.createSlot(slotData);

  assert.ok(slot.session_id.startsWith('SUP-'), 'Session ID should start with SUP-');
  assert.equal(slot.status_flow.current_status, 'SCHEDULED', 'Initial status must be SCHEDULED');
  assert.equal(slot.status_flow.teacher_ack.acknowledged, false, 'Teacher ack should initially be false');
  assert.equal(slot.status_flow.director_approval.approved, false, 'Director approval should initially be false');
  assert.equal(slot.video_link, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video URL should match input');
  assert.equal(slot.lesson_plan_file_url, 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H/view', 'Lesson plan URL should match input');

  // Step 2: Supervisor submits evaluation with Rubric scores (c1-c5) and comments
  const evaluationInput = {
    scores: {
      c1_lesson_prep: 4,
      c2_learning_activity: 5,
      c3_media_technology: 4,
      c4_assessment: 4,
      c5_classroom_mgmt: 5
    },
    strengths: 'กระบวนการจัดการเรียนรู้เน้นผู้เรียนเป็นสำคัญ มีการใช้สื่อเทคโนโลยีทันสมัย',
    improvement_points: 'เปิดโอกาสให้นักเรียนสรุปบทเรียนด้วยตนเองมากขึ้น'
  };
  const supervisorId = 'EMP-018';

  const evaluatedSession = service.submitEvaluation(slot.session_id, evaluationInput, supervisorId);

  assert.equal(evaluatedSession.status_flow.current_status, 'WAITING_TEACHER_ACK', 'Status must transition to WAITING_TEACHER_ACK');
  assert.equal(evaluatedSession.evaluation.total_score, 22, 'Total score should be 4+5+4+4+5 = 22');
  assert.equal(evaluatedSession.evaluation.max_score, 25, 'Max score for 5 rubric criteria should be 25');
  assert.equal(evaluatedSession.evaluation.percentage, 88, 'Percentage should be (22/25)*100 = 88%');
  assert.equal(evaluatedSession.evaluation.evaluated_by, 'EMP-018', 'Evaluated by ID should match supervisor ID');
  assert.equal(evaluatedSession.evaluation.rubric_version, 'v2026.1', 'Rubric version should be v2026.1');
  assert.equal(evaluatedSession.evaluation.strengths, evaluationInput.strengths);
  assert.equal(evaluatedSession.evaluation.improvement_points, evaluationInput.improvement_points);

  // Step 3: Teacher acknowledges evaluation and submits reflection text
  const teacherReflection = 'ขอบคุณสำหรับคำแนะนำครับ จะนำไปปรับปรุงการสรุปบทเรียนในคาบถัดไป';
  const ackSession = service.acknowledgeTeacher(slot.session_id, teacherReflection);

  assert.equal(ackSession.status_flow.current_status, 'WAITING_DIRECTOR_SIGN', 'Status must transition to WAITING_DIRECTOR_SIGN');
  assert.equal(ackSession.status_flow.teacher_ack.acknowledged, true, 'teacher_ack.acknowledged must be true');
  assert.equal(ackSession.status_flow.teacher_ack.teacher_reflection, teacherReflection, 'Teacher reflection text must match');
  assert.ok(ackSession.status_flow.teacher_ack.acknowledged_at, 'Acknowledged timestamp must be populated');

  // Step 4: Director overrides scores, adds director comment, and signs off
  const directorId = 'DIR-001';
  const overriddenScores = {
    c1_lesson_prep: 5,
    c2_learning_activity: 5,
    c3_media_technology: 5,
    c4_assessment: 5,
    c5_classroom_mgmt: 5
  };
  const directorComment = 'อนุมัติผลการนิเทศ ปรับคะแนนตามศักยภาพและการปฏิบัตินวัตกรรมการสอน';

  const completedSession = service.overrideDirectorScore(
    slot.session_id,
    directorId,
    overriddenScores,
    directorComment
  );

  assert.equal(completedSession.status_flow.current_status, 'COMPLETED', 'Status must transition to COMPLETED');
  assert.equal(completedSession.status_flow.director_approval.approved, true, 'director_approval.approved must be true');
  assert.equal(completedSession.status_flow.director_approval.score_overridden, true, 'score_overridden must be true');
  assert.equal(completedSession.status_flow.director_approval.director_id, directorId, 'Director ID must match');
  assert.equal(completedSession.status_flow.director_approval.director_comment, directorComment, 'Director comment must match');
  assert.ok(completedSession.status_flow.director_approval.approved_at, 'Director approval timestamp must be set');

  // Audit trail verification
  assert.deepEqual(
    completedSession.status_flow.director_approval.original_scores,
    {
      c1_lesson_prep: 4,
      c2_learning_activity: 5,
      c3_media_technology: 4,
      c4_assessment: 4,
      c5_classroom_mgmt: 5
    },
    'Original scores must be backed up in director_approval.original_scores audit trail'
  );
  assert.equal(completedSession.evaluation.total_score, 25, 'Total score after director override must be recalculated to 25');
  assert.equal(completedSession.evaluation.percentage, 100, 'Percentage after director override must be 100%');

  // Data Store persistence verification
  const weeklySlots = service.getWeeklySlots('2569', 1, 6);
  assert.equal(weeklySlots.length, 1, 'Data store should persist 1 session for week 6');
  assert.equal(weeklySlots[0].status_flow.current_status, 'COMPLETED', 'Persisted session status should be COMPLETED');
});

test('Supervision E2E - Invalid Video URL Rejection', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  // Test invalid domain
  assert.throws(
    () => {
      service.createSlot({
        academic_year: '2569',
        term: 1,
        week_number: 6,
        supervision_type: 'ONLINE',
        video_link: 'https://unauthorized-video-hosting.com/video/123'
      });
    },
    (err) => {
      return err instanceof Error && err.message.includes('INVALID_VIDEO_URL');
    },
    'Should throw INVALID_VIDEO_URL for non-whitelisted video URL'
  );

  // Test malformed URL string
  assert.throws(
    () => {
      service.createSlot({
        academic_year: '2569',
        term: 1,
        week_number: 6,
        supervision_type: 'ONLINE',
        video_link: 'not_a_valid_url_at_all'
      });
    },
    (err) => {
      return err instanceof Error && err.message.includes('INVALID_VIDEO_URL');
    },
    'Should throw INVALID_VIDEO_URL for malformed URL string'
  );
});

test('Supervision E2E - Invalid Status Transition Rejection', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  const slot = service.createSlot({
    academic_year: '2569',
    term: 1,
    week_number: 6,
    supervision_type: 'ONSITE'
  });

  // Attempting teacher acknowledgment directly when status is SCHEDULED (before supervisor evaluation)
  assert.throws(
    () => {
      service.acknowledgeTeacher(slot.session_id, 'พยายามยืนยันข้ามขั้นตอน');
    },
    (err) => {
      return err instanceof Error && err.message.includes('INVALID_STATUS_TRANSITION');
    },
    'Should throw INVALID_STATUS_TRANSITION when acknowledging prior to evaluation'
  );
});

test('Supervision E2E - Non-Existent Session Error Handling', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  assert.throws(
    () => {
      service.submitEvaluation('SUP-NONEXISTENT-999', { scores: { c1: 5 } }, 'SUPERVISOR-01');
    },
    (err) => err instanceof Error && err.message === 'SESSION_NOT_FOUND',
    'Submit evaluation on non-existent session should throw SESSION_NOT_FOUND'
  );

  assert.throws(
    () => {
      service.acknowledgeTeacher('SUP-NONEXISTENT-999', 'คำรับรอง');
    },
    (err) => err instanceof Error && err.message === 'SESSION_NOT_FOUND',
    'Teacher acknowledge on non-existent session should throw SESSION_NOT_FOUND'
  );

  assert.throws(
    () => {
      service.overrideDirectorScore('SUP-NONEXISTENT-999', 'DIR-001', { c1: 5 }, 'ความคิดเห็น');
    },
    (err) => err instanceof Error && err.message === 'SESSION_NOT_FOUND',
    'Director override on non-existent session should throw SESSION_NOT_FOUND'
  );
});
