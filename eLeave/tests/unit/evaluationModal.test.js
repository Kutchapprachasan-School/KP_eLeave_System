import test from 'node:test';
import assert from 'node:assert/strict';
import { EvaluationModal } from '../../src/components/EvaluationModal.js';

test('EvaluationModal - formatEvaluationFormData parses scores into integers (1-5 range) and trims strings', (t) => {
  const input = {
    c1_lesson_prep: '5',
    c2_learning_activity: 4,
    c3_media_technology: '3',
    c4_assessment: '2',
    c5_classroom_mgmt: 1,
    strengths: '   เตรียมการสอนได้ดีเยี่ยม  ',
    improvement_points: '   ควรเพิ่มสื่อปฏิสัมพันธ์   '
  };

  const formatted = EvaluationModal.formatEvaluationFormData(input);

  assert.deepEqual(formatted.scores, {
    c1_lesson_prep: 5,
    c2_learning_activity: 4,
    c3_media_technology: 3,
    c4_assessment: 2,
    c5_classroom_mgmt: 1
  });
  assert.equal(formatted.strengths, 'เตรียมการสอนได้ดีเยี่ยม');
  assert.equal(formatted.improvement_points, 'ควรเพิ่มสื่อปฏิสัมพันธ์');
  assert.equal(formatted.total_score, 15);
  assert.equal(formatted.max_score, 25);
  assert.equal(formatted.percentage, 60);
});

test('EvaluationModal - formatEvaluationFormData clamps scores outside 1-5 range and defaults invalid values', (t) => {
  const input = {
    c1: '10', // out of range high -> clamp to 5
    c2: '0',  // out of range low -> clamp to 1
    c3: -5,   // out of range low -> clamp to 1
    c4: 'invalid', // invalid -> default to 1
    c5: 4,
    strengths: null,
    improvement_points: undefined
  };

  const formatted = EvaluationModal.formatEvaluationFormData(input);

  assert.deepEqual(formatted.scores, {
    c1_lesson_prep: 5,
    c2_learning_activity: 1,
    c3_media_technology: 1,
    c4_assessment: 1,
    c5_classroom_mgmt: 4
  });
  assert.equal(formatted.strengths, '');
  assert.equal(formatted.improvement_points, '');
});

test('EvaluationModal - renderModalContent for SUPERVISOR role', (t) => {
  const session = {
    session_id: 'SUP-001',
    subject_code: 'ว23101',
    subject_name: 'วิทยาศาสตร์ 5',
    class_level: 'ม.3/1',
    room_number: '324',
    teacher_name: 'นายเดชาธร ศรีสุข',
    supervision_type: 'ONLINE',
    video_link: 'https://youtube.com/watch?v=sample',
    lesson_plan_file_url: 'https://drive.google.com/file/sample.pdf',
    status_flow: { current_status: 'SCHEDULED' }
  };

  const html = EvaluationModal.renderModalContent(session, 'SUPERVISOR');

  // Check header
  assert.ok(html.includes('ว23101'), 'Should display subject code');
  assert.ok(html.includes('วิทยาศาสตร์ 5'), 'Should display subject name');
  assert.ok(html.includes('ม.3/1'), 'Should display class level');
  assert.ok(html.includes('324'), 'Should display room number');
  assert.ok(html.includes('id="closeModalBtn"'), 'Should contain close button');

  // Check file attachment links
  assert.ok(html.includes('lesson-plan-link'), 'Should include lesson plan link');
  assert.ok(html.includes('https://drive.google.com/file/sample.pdf'), 'Should contain lesson plan URL');
  assert.ok(html.includes('video-link'), 'Should include video link for online supervision');
  assert.ok(html.includes('https://youtube.com/watch?v=sample'), 'Should contain video URL');

  // Check 5 rubric criteria fields
  assert.ok(html.includes('c1_lesson_prep'), 'Should contain c1_lesson_prep criterion');
  assert.ok(html.includes('c2_learning_activity'), 'Should contain c2_learning_activity criterion');
  assert.ok(html.includes('c3_media_technology'), 'Should contain c3_media_technology criterion');
  assert.ok(html.includes('c4_assessment'), 'Should contain c4_assessment criterion');
  assert.ok(html.includes('c5_classroom_mgmt'), 'Should contain c5_classroom_mgmt criterion');

  // Check SUPERVISOR specific elements
  assert.ok(html.includes('id="evaluationForm"'), 'Should contain supervisor form');
  assert.ok(html.includes('id="strengths"'), 'Should contain strengths textarea');
  assert.ok(html.includes('id="improvement_points"'), 'Should contain improvement_points textarea');
  assert.ok(html.includes('id="submitEvaluationBtn"'), 'Should contain Submit evaluation button');
  assert.ok(html.includes('บันทึกผลการนิเทศ'), 'Should contain Submit evaluation button text');
});

test('EvaluationModal - renderModalContent for TEACHER role when status is WAITING_TEACHER_ACK', (t) => {
  const session = {
    session_id: 'SUP-002',
    subject_code: 'ค21101',
    subject_name: 'คณิตศาสตร์ 1',
    class_level: 'ม.1/2',
    room_number: '112',
    teacher_name: 'นางสาวสมหญิง มีสุข',
    supervision_type: 'ONSITE',
    lesson_plan_file_url: 'https://drive.google.com/file/math_plan.pdf',
    evaluation: {
      scores: {
        c1_lesson_prep: 5,
        c2_learning_activity: 4,
        c3_media_technology: 5,
        c4_assessment: 4,
        c5_classroom_mgmt: 5
      },
      total_score: 23,
      max_score: 25,
      percentage: 92,
      strengths: 'จัดกิจกรรมได้น่าสนใจมาก',
      improvement_points: 'สื่อการสอนชัดเจน'
    },
    status_flow: {
      current_status: 'WAITING_TEACHER_ACK',
      teacher_ack: { acknowledged: false, teacher_reflection: '' }
    }
  };

  const html = EvaluationModal.renderModalContent(session, 'TEACHER');

  // Attachment link check (no video link for ONSITE)
  assert.ok(html.includes('lesson-plan-link'), 'Should include lesson plan link');
  assert.ok(!html.includes('video-link'), 'Should not include video link for ONSITE');

  // Display evaluation scores & summary
  assert.ok(html.includes('คะแนนรวม:'), 'Should display total score section');
  assert.ok(html.includes('23 / 25'), 'Should display total score value');
  assert.ok(html.includes('จัดกิจกรรมได้น่าสนใจมาก'), 'Should display strengths text');

  // Teacher reflection & Ack button
  assert.ok(html.includes('id="teacherReflection"'), 'Should contain teacher reflection textarea');
  assert.ok(html.includes('id="ackEvaluationBtn"'), 'Should contain ack evaluation button');
  assert.ok(html.includes('รับทราบผลการนิเทศ'), 'Should contain "รับทราบผลการนิเทศ" button text');
});

test('EvaluationModal - renderModalContent for TEACHER role when status is COMPLETED (No Ack Button)', (t) => {
  const session = {
    session_id: 'SUP-003',
    subject_code: 'ค21101',
    status_flow: { current_status: 'COMPLETED' },
    evaluation: { scores: { c1: 5, c2: 5, c3: 5, c4: 5, c5: 5 }, total_score: 25 }
  };

  const html = EvaluationModal.renderModalContent(session, 'TEACHER');

  assert.ok(!html.includes('id="ackEvaluationBtn"'), 'Ack button should not be present when status is COMPLETED');
});

test('EvaluationModal - renderModalContent for DIRECTOR role', (t) => {
  const session = {
    session_id: 'SUP-004',
    subject_code: 'อ32101',
    subject_name: 'ภาษาอังกฤษ 3',
    class_level: 'ม.5/4',
    room_number: '415',
    teacher_name: 'Mr. John Doe',
    supervision_type: 'ONSITE',
    evaluation: {
      scores: {
        c1_lesson_prep: 4,
        c2_learning_activity: 4,
        c3_media_technology: 4,
        c4_assessment: 4,
        c5_classroom_mgmt: 4
      },
      total_score: 20,
      max_score: 25,
      percentage: 80,
      strengths: 'Good classroom management',
      improvement_points: 'Use more native materials'
    },
    status_flow: {
      current_status: 'WAITING_DIRECTOR_SIGN',
      director_approval: {
        score_overridden: false,
        director_comment: ''
      }
    }
  };

  const html = EvaluationModal.renderModalContent(session, 'DIRECTOR');

  // Scores display & Total score
  assert.ok(html.includes('คะแนนรวม:'), 'Should display total score');
  assert.ok(html.includes('20 / 25'), 'Should display 20 / 25 score');

  // Director comment input & Override button
  assert.ok(html.includes('id="directorComment"'), 'Should contain director comment input');
  assert.ok(html.includes('id="overrideDirectorBtn"'), 'Should contain director override button');
  assert.ok(html.includes('ลงนาม / แก้ไขคะแนน (Override)'), 'Should contain "ลงนาม / แก้ไขคะแนน (Override)" button text');
});
