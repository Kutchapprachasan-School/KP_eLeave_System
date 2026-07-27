import test from 'node:test';
import assert from 'node:assert/strict';
import { SupervisionService } from '../../src/services/supervisionService.js';

test('SupervisionService - Create slot', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  const slot = service.createSlot({
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
    lesson_plan_file_url: 'https://drive.google.com/file/d/sample/view',
    supervisor_ids: ['EMP-018']
  });

  assert.ok(slot.session_id.startsWith('SUP-'));
  assert.equal(slot.status_flow.current_status, 'SCHEDULED');
});

test('SupervisionService - Invalid video URL throws error', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  assert.throws(
    () => {
      service.createSlot({
        academic_year: '2569',
        term: 1,
        week_number: 6,
        video_link: 'https://invalid-video-site.com/watch'
      });
    },
    (err) => {
      return err instanceof Error && err.message.includes('INVALID_VIDEO_URL');
    }
  );
});

test('SupervisionService - Get weekly slots by academic year, term, and week number', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  service.createSlot({ academic_year: '2569', term: 1, week_number: 6, subject_code: 'SUBJ1' });
  service.createSlot({ academic_year: '2569', term: 1, week_number: 6, subject_code: 'SUBJ2' });
  service.createSlot({ academic_year: '2569', term: 1, week_number: 7, subject_code: 'SUBJ3' });
  service.createSlot({ academic_year: '2569', term: 2, week_number: 6, subject_code: 'SUBJ4' });

  const weeklySlots = service.getWeeklySlots('2569', 1, 6);
  assert.equal(weeklySlots.length, 2);
  assert.equal(weeklySlots[0].subject_code, 'SUBJ1');
  assert.equal(weeklySlots[1].subject_code, 'SUBJ2');
});

test('SupervisionService - Submit supervisor evaluation', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  const slot = service.createSlot({ academic_year: '2569', term: 1, week_number: 6 });

  const updatedSession = service.submitEvaluation(
    slot.session_id,
    {
      scores: {
        c1_lesson_prep: 5,
        c2_learning_activity: 4,
        c3_media_technology: 5,
        c4_assessment: 4,
        c5_classroom_mgmt: 5
      },
      strengths: 'เตรียมการสอนได้ดีมาก',
      improvement_points: 'เพิ่มสื่อการสอนปฏิสัมพันธ์'
    },
    'SUPERVISOR-01'
  );

  assert.equal(updatedSession.status_flow.current_status, 'WAITING_TEACHER_ACK');
  assert.equal(updatedSession.evaluation.total_score, 23);
  assert.equal(updatedSession.evaluation.max_score, 25);
  assert.equal(updatedSession.evaluation.percentage, 92);
  assert.equal(updatedSession.evaluation.evaluated_by, 'SUPERVISOR-01');
});

test('SupervisionService - Teacher acknowledgment', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  const slot = service.createSlot({ academic_year: '2569', term: 1, week_number: 6 });
  service.submitEvaluation(
    slot.session_id,
    {
      scores: { c1: 5, c2: 5 }
    },
    'SUPERVISOR-01'
  );

  const ackSession = service.acknowledgeTeacher(slot.session_id, 'ขอบคุณสำหรับคำแนะนำครับ');

  assert.equal(ackSession.status_flow.current_status, 'WAITING_DIRECTOR_SIGN');
  assert.equal(ackSession.status_flow.teacher_ack.acknowledged, true);
  assert.equal(ackSession.status_flow.teacher_ack.teacher_reflection, 'ขอบคุณสำหรับคำแนะนำครับ');
});

test('SupervisionService - Director score override', async (t) => {
  const store = [];
  const service = new SupervisionService(store);

  const slot = service.createSlot({ academic_year: '2569', term: 1, week_number: 6 });
  service.submitEvaluation(
    slot.session_id,
    {
      scores: { c1: 4, c2: 4, c3: 4, c4: 4, c5: 4 }
    },
    'SUPERVISOR-01'
  );
  service.acknowledgeTeacher(slot.session_id, 'รับทราบ');

  const finalSession = service.overrideDirectorScore(
    slot.session_id,
    'DIR-001',
    { c1: 5, c2: 5, c3: 5, c4: 5, c5: 5 },
    'ปรับเป็นเต็ม 25 เนื่องจากผลสัมฤทธิ์ดีเยี่ยม'
  );

  assert.equal(finalSession.status_flow.current_status, 'COMPLETED');
  assert.equal(finalSession.evaluation.total_score, 25);
  assert.equal(finalSession.evaluation.percentage, 100);
  assert.equal(finalSession.status_flow.director_approval.score_overridden, true);
  assert.equal(finalSession.status_flow.director_approval.director_id, 'DIR-001');
  assert.equal(finalSession.status_flow.director_approval.director_comment, 'ปรับเป็นเต็ม 25 เนื่องจากผลสัมฤทธิ์ดีเยี่ยม');
});
