'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SupervisionService } from '../../services/supervisionService.js';
import { WeeklyTimetable } from '../../components/WeeklyTimetable.js';
import { EvaluationModal } from '../../components/EvaluationModal.js';
import '../../styles/supervision.css';

export default function SupervisionPage() {
  const timetableRef = useRef(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [userRole, setUserRole] = useState('SUPERVISOR');
  const [service] = useState(() => new SupervisionService([]));

  useEffect(() => {
    if (!timetableRef.current) return;

    // Seed demonstration sample slot
    if (service.store.length === 0) {
      service.createSlot({
        academic_year: '2569',
        term: 1,
        week_number: 6,
        day_of_week: 'MONDAY',
        period_number: 2,
        time_slot: '09:20-10:10',
        teacher_id: 'EMP-042',
        teacher_name: 'นายเดชาธร ศรีสุข',
        department: 'วิทยาศาสตร์และเทคโนโลยี',
        subject_code: 'ว23101',
        subject_name: 'วิทยาศาสตร์ 5',
        class_level: 'ม.3/1',
        room_number: '324',
        supervision_type: 'ONLINE',
        video_link: 'https://www.youtube.com/watch?v=example',
        lesson_plan_file_url: 'https://drive.google.com/file/d/sample/view',
        supervisor_ids: ['EMP-018']
      });
    }

    const timetable = new WeeklyTimetable(timetableRef.current, ({ sessionId }) => {
      const session = service.store.find(s => s.session_id === sessionId) || {
        subject_code: 'วิชาใหม่',
        subject_name: 'การจัดการเรียนรู้',
        class_level: 'ม.3/1',
        room_number: '324',
        teacher_name: 'ครูผู้สอน',
        status_flow: { current_status: 'SCHEDULED' }
      };
      setSelectedSession(session);
    });

    timetable.render(service.getWeeklySlots('2569', 1, 6));
  }, [service]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="timetable-container">
        <div className="timetable-header-title">
          <h2>📚 ตารางนิเทศการสอนรายสัปดาห์ (Instructional Supervision)</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">ผู้ดูแลระบบ: <strong>panchapon@udkp.ac.th</strong></span>
            <select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
              className="text-xs p-1.5 rounded-md border border-slate-300"
            >
              <option value="SUPERVISOR">ผู้นิเทศ (Supervisor)</option>
              <option value="TEACHER">ครูผู้รับการนิเทศ (Teacher)</option>
              <option value="DIRECTOR">ผู้อำนวยการ (Director)</option>
            </select>
          </div>
        </div>

        <div ref={timetableRef} />
      </div>

      {selectedSession && (
        <div className="modal-overlay">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: EvaluationModal.renderModalContent(selectedSession, userRole) 
            }} 
            onClick={(e) => {
              if (e.target.id === 'closeModalBtn' || e.target.classList.contains('close-btn')) {
                setSelectedSession(null);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
