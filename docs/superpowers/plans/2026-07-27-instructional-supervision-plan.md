# Instructional Supervision Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lean, zero-bloat Instructional Supervision Subsystem (`/supervision`) seamlessly integrated into the existing school eLeave web application with a Weekly Supervision Timetable UI, One-Click Evaluation Drawer, Teacher Acknowledgment, and Director Override Authority.

**Architecture:** A modular subsystem sharing authentication and visual design system with eLeave Core. Uses a Weekly Matrix Timetable Grid view (Monday-Friday, Periods 1-8), Link-based Video references, Single PDF Lesson Plan attachment, and In-App Data Dashboards (no heavy PDF rendering engine).

**Tech Stack:** Native JavaScript (ESM / Web Components), Vanilla CSS (eLeave Theme Tokens & Glassmorphism), Node.js E2E Test Runner with Fetch API.

## Global Constraints

- Design System: Inherit eLeave CSS custom properties, HSL color tokens, typography, dark/light theme, and modal dialog styles.
- Data Storage: Store JSON objects in memory/mock server & append-only DB logs without video upload overhead.
- Video Link Validation: Must validate YouTube/Google Drive/OneDrive URL formats.
- YAGNI: No PDF export engine for supervision reports — all data viewed in-app.

---

### Task 1: Data Model & Service Layer (`supervisionService.js`)

**Files:**
- Create: `eLeave/src/services/supervisionService.js`
- Create: `eLeave/tests/unit/supervisionService.test.js`

**Interfaces:**
- Consumes: User Auth Session (`currentUser` with roles: `TEACHER`, `SUPERVISOR`, `DIRECTOR`, `ADMIN`)
- Produces: `getWeeklySupervisionSlots(year, term, weekNumber)`, `createSupervisionSlot(slotData)`, `submitEvaluation(sessionId, evaluationData)`, `acknowledgeSupervision(sessionId, reflectionText)`, `overrideDirectorScore(sessionId, newScores, comment)`

- [ ] **Step 1: Write the failing unit test for Supervision Data Service**

```javascript
// eLeave/tests/unit/supervisionService.test.js
import { assert, assertEquals } from 'node:assert';
import { SupervisionService } from '../../src/services/supervisionService.js';

const mockStore = [];
const service = new SupervisionService(mockStore);

// Test 1: Create Slot
const newSlot = service.createSlot({
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

assertEquals(newSlot.session_id.startsWith('SUP-'), true);
assertEquals(newSlot.status_flow.current_status, 'SCHEDULED');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test eLeave/tests/unit/supervisionService.test.js`
Expected: FAIL with "Cannot find module '../../src/services/supervisionService.js'"

- [ ] **Step 3: Implement `supervisionService.js`**

```javascript
// eLeave/src/services/supervisionService.js
export class SupervisionService {
  constructor(dataStore = []) {
    this.store = dataStore;
  }

  isValidUrl(url) {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return ['youtube.com', 'www.youtube.com', 'youtu.be', 'drive.google.com', 'onedrive.live.com', '1drv.ms'].some(
        domain => parsed.hostname.includes(domain)
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
      s => s.academic_year === academicYear && s.term === term && s.week_number === weekNumber
    );
  }

  submitEvaluation(sessionId, evaluationData, supervisorId) {
    const session = this.store.find(s => s.session_id === sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const totalScore = Object.values(evaluationData.scores).reduce((a, b) => a + b, 0);
    const maxScore = Object.keys(evaluationData.scores).length * 5;

    session.evaluation = {
      rubric_version: 'v2026.1',
      scores: evaluationData.scores,
      total_score: totalScore,
      max_score: maxScore,
      percentage: (totalScore / maxScore) * 100,
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
    const session = this.store.find(s => s.session_id === sessionId);
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
    const session = this.store.find(s => s.session_id === sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const originalScores = session.evaluation ? { ...session.evaluation.scores } : null;
    const totalScore = Object.values(newScores).reduce((a, b) => a + b, 0);
    const maxScore = Object.keys(newScores).length * 5;

    session.evaluation = {
      ...session.evaluation,
      scores: newScores,
      total_score: totalScore,
      percentage: (totalScore / maxScore) * 100,
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
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `node --test eLeave/tests/unit/supervisionService.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add eLeave/src/services/supervisionService.js eLeave/tests/unit/supervisionService.test.js
git commit -m "feat(supervision): implement supervision data service layer with validation and status flow"
```

---

### Task 2: Weekly Timetable UI Component (`WeeklyTimetable.js`)

**Files:**
- Create: `eLeave/src/components/WeeklyTimetable.js`
- Create: `eLeave/src/styles/supervision.css`

**Interfaces:**
- Consumes: `supervisionService.getWeeklySlots()`, eLeave Theme CSS tokens
- Produces: Web Component / HTML Matrix Grid rendering (Days Mon-Fri vs Periods 1-8) with clickable slot cards.

- [ ] **Step 1: Create `supervision.css` with eLeave design tokens**

```css
/* eLeave/src/styles/supervision.css */
.timetable-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--bg-card, #ffffff);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.timetable-grid {
  display: grid;
  grid-template-columns: 100px repeat(8, 1fr);
  gap: 8px;
  overflow-x: auto;
}

.timetable-header-cell {
  background: var(--bg-primary-light, #f1f5f9);
  color: var(--text-muted, #475569);
  font-weight: 600;
  font-size: 0.85rem;
  padding: 10px 6px;
  text-align: center;
  border-radius: 6px;
}

.timetable-day-cell {
  font-weight: 700;
  color: var(--text-main, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-subtle, #f8fafc);
  border-radius: 6px;
}

.timetable-slot {
  min-height: 90px;
  border: 1.5px dashed var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  background: #ffffff;
}

.timetable-slot:hover {
  border-color: var(--primary-color, #2563eb);
  background: var(--primary-light, #eff6ff);
  transform: translateY(-2px);
}

.timetable-slot.occupied {
  border-style: solid;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.slot-subject {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--primary-dark, #1e40af);
}

.slot-room {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
}

.slot-teacher {
  font-size: 0.75rem;
  color: #334155;
  margin-top: 4px;
}

.badge-status {
  display: inline-block;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-top: 6px;
}

.badge-scheduled { background: #e0f2fe; color: #0369a1; }
.badge-waiting { background: #fef3c7; color: #b45309; }
.badge-completed { background: #dcfce7; color: #15803d; }
```

- [ ] **Step 2: Implement `WeeklyTimetable.js`**

```javascript
// eLeave/src/components/WeeklyTimetable.js
export class WeeklyTimetable {
  constructor(containerEl, onSlotClick) {
    this.container = containerEl;
    this.onSlotClick = onSlotClick;
    this.days = [
      { id: 'MONDAY', label: 'จันทร์' },
      { id: 'TUESDAY', label: 'อังคาร' },
      { id: 'WEDNESDAY', label: 'พุธ' },
      { id: 'THURSDAY', label: 'พฤหัสบดี' },
      { id: 'FRIDAY', label: 'ศุกร์' }
    ];
    this.periods = [1, 2, 3, 4, 5, 6, 7, 8];
  }

  render(slotsData = []) {
    let html = `<div class="timetable-container"><div class="timetable-grid">`;
    html += `<div class="timetable-header-cell">วัน / คาบ</div>`;
    
    this.periods.forEach(p => {
      html += `<div class="timetable-header-cell">คาบ ${p}</div>`;
    });

    this.days.forEach(day => {
      html += `<div class="timetable-day-cell">${day.label}</div>`;
      this.periods.forEach(p => {
        const slot = slotsData.find(s => s.day_of_week === day.id && s.period_number === p);
        if (slot) {
          const statusClass = slot.status_flow.current_status === 'COMPLETED' ? 'badge-completed' :
                              slot.status_flow.current_status === 'WAITING_TEACHER_ACK' ? 'badge-waiting' : 'badge-scheduled';
          const statusText = slot.status_flow.current_status === 'COMPLETED' ? 'เสร็จสิ้น' :
                            slot.status_flow.current_status === 'WAITING_TEACHER_ACK' ? 'รอรับทราบ' : 'นัดหมายแล้ว';

          html += `
            <div class="timetable-slot occupied" data-session-id="${slot.session_id}">
              <div class="slot-subject">${slot.subject_code} (${slot.class_level})</div>
              <div class="slot-room">ห้อง ${slot.room_number || '-'}</div>
              <div class="slot-teacher">${slot.teacher_name}</div>
              <span class="badge-status ${statusClass}">${statusText} ${slot.supervision_type === 'ONLINE' ? '🎥' : ''}</span>
            </div>`;
        } else {
          html += `<div class="timetable-slot empty" data-day="${day.id}" data-period="${p}">
                    <div style="color: #cbd5e1; font-size: 0.75rem; text-align: center; margin-top: 30px;">+ นัดหมาย</div>
                   </div>`;
        }
      });
    });

    html += `</div></div>`;
    this.container.innerHTML = html;

    this.container.querySelectorAll('.timetable-slot').forEach(el => {
      el.addEventListener('click', () => {
        const sessionId = el.getAttribute('data-session-id');
        const day = el.getAttribute('data-day');
        const period = el.getAttribute('data-period');
        this.onSlotClick({ sessionId, day, period });
      });
    });
  }
}
```

- [ ] **Step 3: Commit Task 2**

```bash
git add eLeave/src/components/WeeklyTimetable.js eLeave/src/styles/supervision.css
git commit -m "feat(supervision): add weekly timetable grid matrix component and styling"
```

---

### Task 3: One-Click Quick Evaluation Modal Component (`EvaluationModal.js`)

**Files:**
- Create: `eLeave/src/components/EvaluationModal.js`
- Test: `eLeave/tests/unit/evaluationModal.test.js`

**Interfaces:**
- Consumes: `sessionData`, `currentUserRole`
- Produces: Modal view with Rubric Criteria inputs (1-5), Strengths, Improvement Notes, Reflection & Director Override controls.

- [ ] **Step 1: Write Unit Test for Evaluation Form Data Aggregation**

```javascript
// eLeave/tests/unit/evaluationModal.test.js
import { assertEquals } from 'node:assert';
import { EvaluationModal } from '../../src/components/EvaluationModal.js';

const modal = new EvaluationModal();
const payload = modal.formatEvaluationFormData({
  c1: '5', c2: '4', c3: '5', c4: '4', c5: '5',
  strengths: 'สอนดีมาก',
  improvement_points: 'เพิ่มสื่อ'
});

assertEquals(payload.scores.c1_lesson_prep, 5);
assertEquals(payload.scores.c5_classroom_mgmt, 5);
assertEquals(payload.strengths, 'สอนดีมาก');
```

- [ ] **Step 2: Implement `EvaluationModal.js`**

```javascript
// eLeave/src/components/EvaluationModal.js
export class EvaluationModal {
  formatEvaluationFormData(inputs) {
    return {
      scores: {
        c1_lesson_prep: parseInt(inputs.c1 || '0', 10),
        c2_learning_activity: parseInt(inputs.c2 || '0', 10),
        c3_media_technology: parseInt(inputs.c3 || '0', 10),
        c4_assessment: parseInt(inputs.c4 || '0', 10),
        c5_classroom_mgmt: parseInt(inputs.c5 || '0', 10)
      },
      strengths: inputs.strengths || '',
      improvement_points: inputs.improvement_points || ''
    };
  }

  renderModalContent(session, userRole) {
    const isEvaluated = !!session.evaluation;
    const isSupervisor = userRole === 'SUPERVISOR' || userRole === 'ADMIN';
    const isDirector = userRole === 'DIRECTOR';
    const isTeacher = userRole === 'TEACHER';

    return `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>การนิเทศการสอน: ${session.subject_name} (${session.subject_code})</h3>
            <button class="btn-close">&times;</button>
          </div>
          <div class="modal-body">
            <p><strong>ผู้สอน:</strong> ${session.teacher_name} | <strong>ชั้น:</strong> ${session.class_level} | <strong>ห้อง:</strong> ${session.room_number}</p>
            <p><strong>แผนการสอน:</strong> <a href="${session.lesson_plan_file_url}" target="_blank">📄 เปิดดูแผนการสอน (PDF)</a></p>
            ${session.video_link ? `<p><strong>คลิปการสอนออนไลน์:</strong> <a href="${session.video_link}" target="_blank">🎥 เปิดดูคลิปการสอน</a></p>` : ''}
            
            <hr />
            
            <form id="evaluationForm">
              <h4>แบบประเมินการสอน (Rubrics 5 ด้าน)</h4>
              <div class="rubric-group">
                <label>1. การเตรียมการสอนและแผนการเรียนรู้ (1-5):</label>
                <input type="number" name="c1" min="1" max="5" value="${session.evaluation?.scores?.c1_lesson_prep || 5}" ${!isSupervisor || isEvaluated ? 'disabled' : ''} />
              </div>
              <div class="rubric-group">
                <label>2. การจัดกิจกรรมการเรียนรู้ (1-5):</label>
                <input type="number" name="c2" min="1" max="5" value="${session.evaluation?.scores?.c2_learning_activity || 5}" ${!isSupervisor || isEvaluated ? 'disabled' : ''} />
              </div>
              <div class="rubric-group">
                <label>3. การใช้สื่อและเทคโนโลยี (1-5):</label>
                <input type="number" name="c3" min="1" max="5" value="${session.evaluation?.scores?.c3_media_technology || 5}" ${!isSupervisor || isEvaluated ? 'disabled' : ''} />
              </div>
              <div class="rubric-group">
                <label>4. การวัดและประเมินผล (1-5):</label>
                <input type="number" name="c4" min="1" max="5" value="${session.evaluation?.scores?.c4_assessment || 5}" ${!isSupervisor || isEvaluated ? 'disabled' : ''} />
              </div>
              <div class="rubric-group">
                <label>5. การบริหารจัดการชั้นเรียน (1-5):</label>
                <input type="number" name="c5" min="1" max="5" value="${session.evaluation?.scores?.c5_classroom_mgmt || 5}" ${!isSupervisor || isEvaluated ? 'disabled' : ''} />
              </div>

              <div class="form-group">
                <label>จุดเด่น:</label>
                <textarea name="strengths" ${!isSupervisor || isEvaluated ? 'disabled' : ''}>${session.evaluation?.strengths || ''}</textarea>
              </div>
              <div class="form-group">
                <label>ข้อควรพัฒนา:</label>
                <textarea name="improvement_points" ${!isSupervisor || isEvaluated ? 'disabled' : ''}>${session.evaluation?.improvement_points || ''}</textarea>
              </div>

              ${isSupervisor && !isEvaluated ? `<button type="submit" class="btn-primary">บันทึกผลการประเมิน</button>` : ''}
            </form>

            ${session.status_flow.current_status === 'WAITING_TEACHER_ACK' && isTeacher ? `
              <div class="ack-section">
                <h4>รับทราบผลการนิเทศ</h4>
                <textarea id="teacherReflection" placeholder="ข้อคิดเห็นสะท้อนกลับ (Reflection)..."></textarea>
                <button id="btnAckTeacher" class="btn-success">กดรับทราบผลการนิเทศ</button>
              </div>` : ''}

            ${isDirector ? `
              <div class="director-override-section">
                <h4>การลงนามและปรับแก้ไขคะแนนโดยผู้อำนวยการ</h4>
                <p>คะแนนรวมปัจจุบัน: <strong>${session.evaluation?.total_score || 0} / 25</strong></p>
                <input type="text" id="directorComment" placeholder="ความคิดเห็นผู้อำนวยการ..." />
                <button id="btnDirectorSign" class="btn-warning">ลงนามรับทราบ / แก้ไขคะแนน (Override)</button>
              </div>` : ''}
          </div>
        </div>
      </div>`;
  }
}
```

- [ ] **Step 3: Run unit tests to verify they pass**

Run: `node --test eLeave/tests/unit/evaluationModal.test.js`
Expected: PASS

- [ ] **Step 4: Commit Task 3**

```bash
git add eLeave/src/components/EvaluationModal.js eLeave/tests/unit/evaluationModal.test.js
git commit -m "feat(supervision): add interactive evaluation modal component and tests"
```

---

### Task 4: E2E Integration Test Suite (`supervision.test.js`)

**Files:**
- Create: `eLeave/tests/e2e/supervision.test.js`
- Modify: `TEST_INFRA.md:15-20`

**Interfaces:**
- Exercises: Complete 4-step workflow (Create Slot -> Evaluate -> Teacher Ack -> Director Override Sign).

- [ ] **Step 1: Write E2E Integration Test for 4-Step Supervision Flow**

```javascript
// eLeave/tests/e2e/supervision.test.js
import { assertEquals } from 'node:assert';
import { SupervisionService } from '../../src/services/supervisionService.js';

const store = [];
const service = new SupervisionService(store);

// Step 1: Create Slot
const slot = service.createSlot({
  academic_year: '2569', term: 1, week_number: 6,
  day_of_week: 'MONDAY', period_number: 2,
  teacher_id: 'EMP-042', teacher_name: 'ครูเดชาธร',
  subject_code: 'ว23101', subject_name: 'วิทยาศาสตร์ 5',
  class_level: 'ม.3/1', room_number: '324',
  supervision_type: 'ONLINE',
  video_link: 'https://youtu.be/sample123',
  lesson_plan_file_url: 'https://drive.google.com/sample.pdf'
});
assertEquals(slot.status_flow.current_status, 'SCHEDULED');

// Step 2: Supervisor Evaluation
const evalSession = service.submitEvaluation(slot.session_id, {
  scores: { c1_lesson_prep: 5, c2_learning_activity: 4, c3_media_technology: 5, c4_assessment: 5, c5_classroom_mgmt: 4 },
  strengths: 'คุมห้องได้ดี', improvement_points: 'เพิ่มเวลาสรุป'
}, 'SUP-001');
assertEquals(evalSession.status_flow.current_status, 'WAITING_TEACHER_ACK');
assertEquals(evalSession.evaluation.total_score, 23);

// Step 3: Teacher Ack
const ackSession = service.acknowledgeTeacher(slot.session_id, 'รับทราบและจะนำไปปรับปรุง');
assertEquals(ackSession.status_flow.current_status, 'WAITING_DIRECTOR_SIGN');
assertEquals(ackSession.status_flow.teacher_ack.acknowledged, true);

// Step 4: Director Override
const finalSession = service.overrideDirectorScore(slot.session_id, 'DIR-001', {
  c1_lesson_prep: 5, c2_learning_activity: 5, c3_media_technology: 5, c4_assessment: 5, c5_classroom_mgmt: 5
}, 'ปรับเป็นเต็ม 25 คะแนนเนื่องจากสื่อสมบูรณ์มาก');

assertEquals(finalSession.status_flow.current_status, 'COMPLETED');
assertEquals(finalSession.evaluation.total_score, 25);
assertEquals(finalSession.status_flow.director_approval.score_overridden, true);
console.log('✅ All 4 Supervision Steps E2E Passed Successfully!');
```

- [ ] **Step 2: Run E2E Test**

Run: `node eLeave/tests/e2e/supervision.test.js`
Expected: "✅ All 4 Supervision Steps E2E Passed Successfully!"

- [ ] **Step 3: Commit Task 4**

```bash
git add eLeave/tests/e2e/supervision.test.js
git commit -m "test(supervision): add e2e test suite covering complete 4-step supervision workflow"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-instructional-supervision-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
