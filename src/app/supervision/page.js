'use client';

import React, { useState, useMemo } from 'react';

// Mock Initial Supervision Dataset
const initialSessions = [
  {
    session_id: 'SUP-2026-001',
    academic_year: '2569',
    term: 1,
    week_number: 6,
    day_of_week: 'MONDAY',
    period_number: 2,
    time_slot: '09:20 - 10:10 น.',
    teacher_id: 'EMP-042',
    teacher_name: 'นายเดชาธร ศรีสุข',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    subject_code: 'ว23101',
    subject_name: 'วิทยาศาสตร์ 5',
    class_level: 'ม.3/1',
    room_number: 'ห้อง 324',
    supervision_type: 'ONLINE',
    video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    lesson_plan_file_url: 'https://drive.google.com/file/d/sample/view',
    supervisor_name: 'นางสุลาวัลย์ มาชัย (หัวหน้ากลุ่มสาระ)',
    status: 'COMPLETED',
    evaluation: {
      scores: { c1: 5, c2: 5, c3: 4, c4: 5, c5: 5 },
      total_score: 24,
      max_score: 25,
      percentage: 96,
      strengths: 'การใช้เทคโนโลยีและสื่อดิจิทัลกระตุ้นความสนใจนักเรียนได้ดีมาก มีการทดลองเสมือนจริง',
      improvement_points: 'เพิ่มเวลาให้นักเรียนอภิปรายสรุปผลช่วงท้ายคาบอีกประมาณ 5 นาที'
    },
    teacher_ack: { acknowledged: true, reflection: 'จะนำข้อเสนอแนะเรื่องการบริหารเวลาช่วงสรุปไปปรับใช้ในแผนต่อไปครับ' },
    director_approval: { approved: true, director_name: 'นายอภิชาติ มาตรสีกลาง (ผู้อำนวยการ)', overridden: false }
  },
  {
    session_id: 'SUP-2026-002',
    academic_year: '2569',
    term: 1,
    week_number: 6,
    day_of_week: 'TUESDAY',
    period_number: 3,
    time_slot: '10:10 - 11:00 น.',
    teacher_id: 'EMP-061',
    teacher_name: 'นางสาวอนุสรา เหล็กดี',
    department: 'คณิตศาสตร์',
    subject_code: 'ค21101',
    subject_name: 'คณิตศาสตร์พื้นฐาน',
    class_level: 'ม.1/2',
    room_number: 'ห้อง 211',
    supervision_type: 'ONSITE',
    video_link: '',
    lesson_plan_file_url: 'https://drive.google.com/file/d/sample2/view',
    supervisor_name: 'นายสุวรรณ ไชยลาภ',
    status: 'WAITING_TEACHER_ACK',
    evaluation: {
      scores: { c1: 5, c2: 4, c3: 4, c4: 4, c5: 5 },
      total_score: 22,
      max_score: 25,
      percentage: 88,
      strengths: 'ครูอธิบายเนื้อหาชัดเจนและมีแบบฝึกหัดทบทวนรายบุคคลอย่างทั่วถึง',
      improvement_points: 'ควรเสริมสื่อการสอนคณิตศาสตร์แบบโต้ตอบเพื่อดึงดูดความสนใจเพิ่มเติม'
    },
    teacher_ack: { acknowledged: false, reflection: '' },
    director_approval: { approved: false }
  },
  {
    session_id: 'SUP-2026-003',
    academic_year: '2569',
    term: 1,
    week_number: 6,
    day_of_week: 'THURSDAY',
    period_number: 4,
    time_slot: '11:00 - 11:50 น.',
    teacher_id: 'EMP-066',
    teacher_name: 'นางสาวกนิษฐา พินิจมนตรี',
    department: 'ภาษาต่างประเทศ',
    subject_code: 'อ22101',
    subject_name: 'ภาษาอังกฤษ 3',
    class_level: 'ม.2/4',
    room_number: 'ห้อง 412',
    supervision_type: 'ONLINE',
    video_link: 'https://youtu.be/sample-english',
    lesson_plan_file_url: 'https://drive.google.com/file/d/sample3/view',
    supervisor_name: 'MR. Navjot Singh',
    status: 'SCHEDULED',
    evaluation: null,
    teacher_ack: { acknowledged: false, reflection: '' },
    director_approval: { approved: false }
  }
];

export default function AcademicSupervisionApp() {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedSession, setSelectedSession] = useState(null);
  const [userRole, setUserRole] = useState('SUPERVISOR');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form State for Evaluation Modal
  const [rubricScores, setRubricScores] = useState({ c1: 5, c2: 5, c3: 5, c4: 5, c5: 5 });
  const [strengthsText, setStrengthsText] = useState('');
  const [improvementText, setImprovementText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [directorCommentText, setDirectorCommentText] = useState('');

  // Form State for New Slot Schedule
  const [newSlotForm, setNewSlotForm] = useState({
    teacher_name: '',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    subject_code: '',
    subject_name: '',
    class_level: 'ม.3/1',
    room_number: 'ห้อง 321',
    day_of_week: 'WEDNESDAY',
    period_number: 2,
    supervision_type: 'ONSITE',
    video_link: '',
    lesson_plan_file_url: 'https://drive.google.com/file/d/plan/view'
  });

  const daysList = [
    { key: 'MONDAY', label: 'วันจันทร์', color: 'bg-amber-500/10 text-amber-600 border-amber-300' },
    { key: 'TUESDAY', label: 'วันอังคาร', color: 'bg-pink-500/10 text-pink-600 border-pink-300' },
    { key: 'WEDNESDAY', label: 'วันพุธ', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300' },
    { key: 'THURSDAY', label: 'วันพฤหัสบดี', color: 'bg-orange-500/10 text-orange-600 border-orange-300' },
    { key: 'FRIDAY', label: 'วันศุกร์', color: 'bg-blue-500/10 text-blue-600 border-blue-300' }
  ];

  const periodsList = [1, 2, 3, 4, 5, 6, 7, 8];

  // Metrics KPI Calculations
  const metrics = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'COMPLETED').length;
    const pendingAck = sessions.filter(s => s.status === 'WAITING_TEACHER_ACK').length;
    const onlineCount = sessions.filter(s => s.supervision_type === 'ONLINE').length;
    const avgScore = sessions.filter(s => s.evaluation)
      .reduce((acc, curr) => acc + (curr.evaluation.percentage / 20), 0) / (sessions.filter(s => s.evaluation).length || 1);

    return { total, completed, pendingAck, onlineCount, avgScore: avgScore.toFixed(2) };
  }, [sessions]);

  // Open Modal for Session
  const handleOpenModal = (session) => {
    setSelectedSession(session);
    if (session.evaluation) {
      setRubricScores(session.evaluation.scores);
      setStrengthsText(session.evaluation.strengths);
      setImprovementText(session.evaluation.improvement_points);
    } else {
      setRubricScores({ c1: 5, c2: 5, c3: 5, c4: 5, c5: 5 });
      setStrengthsText('');
      setImprovementText('');
    }
    setReflectionText(session.teacher_ack?.reflection || '');
    setDirectorCommentText(session.director_approval?.director_comment || '');
  };

  // Submit Supervisor Evaluation
  const handleSubmitEvaluation = (e) => {
    e.preventDefault();
    if (!selectedSession) return;

    const total = Object.values(rubricScores).reduce((a, b) => a + Number(b), 0);
    const percentage = Math.round((total / 25) * 100);

    const updated = sessions.map(s => {
      if (s.session_id === selectedSession.session_id) {
        return {
          ...s,
          status: 'WAITING_TEACHER_ACK',
          evaluation: {
            scores: rubricScores,
            total_score: total,
            max_score: 25,
            percentage,
            strengths: strengthsText,
            improvement_points: improvementText
          }
        };
      }
      return s;
    });

    setSessions(updated);
    setSelectedSession(null);
  };

  // Teacher Acknowledge
  const handleTeacherAck = () => {
    const updated = sessions.map(s => {
      if (s.session_id === selectedSession.session_id) {
        return {
          ...s,
          status: 'WAITING_DIRECTOR_SIGN',
          teacher_ack: { acknowledged: true, reflection: reflectionText }
        };
      }
      return s;
    });
    setSessions(updated);
    setSelectedSession(null);
  };

  // Director Approval
  const handleDirectorSign = () => {
    const updated = sessions.map(s => {
      if (s.session_id === selectedSession.session_id) {
        return {
          ...s,
          status: 'COMPLETED',
          director_approval: {
            approved: true,
            director_name: 'นายอภิชาติ มาตรสีกลาง (ผู้อำนวยการ)',
            director_comment: directorCommentText,
            overridden: false
          }
        };
      }
      return s;
    });
    setSessions(updated);
    setSelectedSession(null);
  };

  // Create New Schedule Slot
  const handleCreateSlot = (e) => {
    e.preventDefault();
    const newSession = {
      session_id: `SUP-2026-${String(sessions.length + 1).padStart(3, '0')}`,
      academic_year: '2569',
      term: 1,
      week_number: 6,
      time_slot: 'ตามตารางคาบเรียน',
      teacher_id: `EMP-${Math.floor(Math.random() * 90 + 10)}`,
      supervisor_name: 'หัวหน้ากลุ่มสาระการเรียนรู้',
      status: 'SCHEDULED',
      evaluation: null,
      teacher_ack: { acknowledged: false, reflection: '' },
      director_approval: { approved: false },
      ...newSlotForm
    };

    setSessions([...sessions, newSession]);
    setShowScheduleModal(false);
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchDept = departmentFilter === 'ALL' || s.department === departmentFilter;
      const matchQuery = !searchQuery || 
        s.teacher_name.includes(searchQuery) || 
        s.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.subject_name.includes(searchQuery);
      return matchDept && matchQuery;
    });
  }, [sessions, departmentFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* 🟢 Top Minimal Page Header (Matching App Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            📖 นิเทศการสอนออนไลน์ (Instructional Supervision)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ปฏิทินนิเทศและแบบประเมินการจัดการเรียนรู้รายสัปดาห์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">มุมมองบทบาท:</span>
            <select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-transparent text-xs font-bold text-purple-600 dark:text-purple-400 focus:outline-none cursor-pointer"
            >
              <option value="SUPERVISOR">👨‍🏫 ผู้นิเทศ (Supervisor)</option>
              <option value="TEACHER">👩‍🏫 ครูผู้รับการนิเทศ (Teacher)</option>
              <option value="DIRECTOR">👑 ผู้อำนวยการ (Director)</option>
            </select>
          </div>

          <button 
            onClick={() => setShowScheduleModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition"
          >
            <span>+</span> ส่งนัดหมายนิเทศใหม่
          </button>
        </div>
      </div>

      {/* 1. Subsystem KPI Executive Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>นิเทศทั้งหมด</span>
            <span>📋</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
          <div className="text-[11px] text-purple-600 font-semibold">ภาคเรียนที่ 1/2569</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>เสร็จสิ้นสมบูรณ์</span>
            <span>✅</span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.completed} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
          <div className="text-[11px] text-emerald-500 font-medium">ผอ. ลงนามรับทราบแล้ว</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>รอครูรับทราบผล</span>
            <span>⏳</span>
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.pendingAck} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
          <div className="text-[11px] text-amber-500 font-medium">รอสะท้อนคิด (Reflection)</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>นิเทศออนไลน์ (คลิป)</span>
            <span>🎥</span>
          </div>
          <div className="text-2xl font-black text-cyan-600">{metrics.onlineCount} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
          <div className="text-[11px] text-cyan-500 font-medium">คลิปวิดีโอ YouTube/Drive</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>คะแนนเฉลี่ยการสอน</span>
            <span>⭐</span>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{metrics.avgScore} <span className="text-xs font-normal text-slate-400">/ 5.00</span></div>
          <div className="text-[11px] text-indigo-500 font-medium">เกณฑ์คุณภาพดีเยี่ยม</div>
        </div>
      </section>

      {/* 2. Control Toolbar & Filtering */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <select 
            value={departmentFilter} 
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-semibold focus:ring-2 focus:ring-purple-500 border-none"
          >
            <option value="ALL">ทุกกลุ่มสาระการเรียนรู้</option>
            <option value="วิทยาศาสตร์และเทคโนโลยี">วิทยาศาสตร์และเทคโนโลยี</option>
            <option value="คณิตศาสตร์">คณิตศาสตร์</option>
            <option value="ภาษาต่างประเทศ">ภาษาต่างประเทศ</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อครู, รหัสวิชา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 border-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="absolute left-3 top-2 text-xs text-slate-400">🔍</span>
          </div>
        </div>
      </section>

      {/* 3. Weekly Supervision Matrix Timetable */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              🗓️ ตารางนิเทศรายสัปดาห์ (Weekly Supervision Timetable)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              คลิกที่ช่องคาบเรียนเพื่อเปิดแบบประเมินผลการสอน
            </p>
          </div>
          <div className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200">
            สัปดาห์ที่ 6 (ภาคเรียนที่ 1/2569)
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[960px] grid grid-cols-9 gap-3">
            {/* Header Row */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center text-xs font-bold text-slate-500">
              วัน \ คาบ
            </div>
            {periodsList.map(p => (
              <div key={p} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center text-xs font-bold text-purple-600 dark:text-purple-400">
                คาบ {p}
              </div>
            ))}

            {/* Day Rows */}
            {daysList.map(dayObj => (
              <React.Fragment key={dayObj.key}>
                {/* Day Label */}
                <div className={`${dayObj.color} border rounded-xl p-3 flex items-center justify-center text-xs font-bold`}>
                  {dayObj.label}
                </div>

                {/* Period Slots */}
                {periodsList.map(p => {
                  const slotData = filteredSessions.find(
                    s => s.day_of_week === dayObj.key && Number(s.period_number) === p
                  );

                  return (
                    <div 
                      key={p}
                      onClick={() => slotData && handleOpenModal(slotData)}
                      className={`min-h-[105px] rounded-xl p-3 border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                        slotData 
                          ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:border-purple-500 hover:shadow-md' 
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 border-dashed hover:bg-slate-100'
                      }`}
                    >
                      {slotData ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 truncate">
                                {slotData.supervision_type === 'ONLINE' ? '🎥 ' : ''}{slotData.subject_code}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">{slotData.class_level}</span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
                              {slotData.teacher_name}
                            </div>
                            <div className="text-[10px] text-slate-400">{slotData.room_number}</div>
                          </div>

                          <div className="mt-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                            {slotData.status === 'COMPLETED' && (
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                ✓ ประเมินเรียบร้อย ({slotData.evaluation?.total_score}/25)
                              </span>
                            )}
                            {slotData.status === 'WAITING_TEACHER_ACK' && (
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                ⏳ รอครูรับทราบผล
                              </span>
                            )}
                            {slotData.status === 'SCHEDULED' && (
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                📅 รอนิเทศ
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
                          + ว่าง
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Evaluation Modal Dialog */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📖</span> แบบประเมินนิเทศการสอนออนไลน์ ({selectedSession.session_id})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedSession.teacher_name} | {selectedSession.subject_name} ({selectedSession.subject_code}) {selectedSession.class_level}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Session Details Box */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><strong className="text-slate-500">รูปแบบนิเทศ:</strong> {selectedSession.supervision_type === 'ONLINE' ? '🎥 ออนไลน์ (คลิปวิดีโอ)' : '🏫 ออนไซต์ (เข้าชั้นเรียน)'}</div>
                <div><strong className="text-slate-500">ผู้นิเทศ:</strong> {selectedSession.supervisor_name}</div>
                <div><strong className="text-slate-500">ห้องเรียน:</strong> {selectedSession.room_number}</div>
                <div><strong className="text-slate-500">สถานะ:</strong> <span className="font-bold text-purple-600">{selectedSession.status}</span></div>
              </div>

              {selectedSession.video_link && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <a 
                    href={selectedSession.video_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 font-bold hover:underline"
                  >
                    ▶️ ดูวิดีโอบันทึกการสอน (คลิกที่นี่)
                  </a>
                </div>
              )}
            </div>

            {/* Form Actions for Supervisor / Teacher / Director */}
            {userRole === 'SUPERVISOR' && selectedSession.status === 'SCHEDULED' && (
              <form onSubmit={handleSubmitEvaluation} className="space-y-4 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">ให้คะแนนการประเมิน 5 ด้าน (1 - 5 ดาว):</div>
                <div className="space-y-2">
                  {Object.entries({
                    c1: '1. การเตรียมการสอนและแผนการจัดการเรียนรู้',
                    c2: '2. เทคนิคและวิธีการจัดการเรียนรู้',
                    c3: '3. การใช้สื่อและเทคโนโลยีนวัตกรรม',
                    c4: '4. การวัดและประเมินผลการเรียนรู้',
                    c5: '5. บรรยากาศและการจัดชั้นเรียน'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span>{label}</span>
                      <select 
                        value={rubricScores[key]} 
                        onChange={e => setRubricScores({ ...rubricScores, [key]: Number(e.target.value) })}
                        className="bg-slate-100 dark:bg-slate-800 font-bold px-2 py-1 rounded-lg text-purple-600"
                      >
                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ดาว</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="font-bold">จุดเด่นที่ควรชื่นชม:</label>
                  <textarea 
                    rows={2} 
                    value={strengthsText} 
                    onChange={e => setStrengthsText(e.target.value)}
                    placeholder="กรอกจุดเด่น..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">ข้อเสนอแนะในการพัฒนา:</label>
                  <textarea 
                    rows={2} 
                    value={improvementText} 
                    onChange={e => setImprovementText(e.target.value)}
                    placeholder="กรอกข้อเสนอแนะ..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700"
                  >
                    บันทึกผลการนิเทศ & ส่งให้ครูรับทราบ
                  </button>
                </div>
              </form>
            )}

            {/* Read-Only Evaluation View for Completed / Pending */}
            {selectedSession.evaluation && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-900 dark:text-purple-300 flex justify-between items-center">
                  <span className="font-bold">คะแนนรวมการประเมิน:</span>
                  <span className="text-lg font-black">{selectedSession.evaluation.total_score} / 25 ({selectedSession.evaluation.percentage}%)</span>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-500 block">จุดเด่นที่ควรชื่นชม:</strong>
                  <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{selectedSession.evaluation.strengths}</p>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-500 block">ข้อเสนอแนะในการพัฒนา:</strong>
                  <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{selectedSession.evaluation.improvement_points}</p>
                </div>

                {/* Teacher Acknowledge Step */}
                {userRole === 'TEACHER' && selectedSession.status === 'WAITING_TEACHER_ACK' && (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold text-slate-900 dark:text-white block">ข้อความสะท้อนคิดของครู (Teacher Reflection):</label>
                    <textarea 
                      rows={2} 
                      value={reflectionText} 
                      onChange={e => setReflectionText(e.target.value)}
                      placeholder="กรอกข้อความสะท้อนคิดเพื่อปรับใช้ในการสอนครั้งถัดไป..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    />
                    <button 
                      onClick={handleTeacherAck}
                      className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700"
                    >
                      ✓ กดรับทราบผลการนิเทศ
                    </button>
                  </div>
                )}

                {/* Director Approval Step */}
                {userRole === 'DIRECTOR' && selectedSession.status === 'WAITING_DIRECTOR_SIGN' && (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold text-slate-900 dark:text-white block">ข้อเสนอแนะจากผู้อำนวยการ:</label>
                    <textarea 
                      rows={2} 
                      value={directorCommentText} 
                      onChange={e => setDirectorCommentText(e.target.value)}
                      placeholder="กรอกข้อเสนอแนะจากผู้อำนวยการ..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    />
                    <button 
                      onClick={handleDirectorSign}
                      className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700"
                    >
                      ✒️ ผู้อำนวยการลงนามอนุมัติรับทราบผล
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">📅 ส่งนัดหมายนิเทศการสอนใหม่</h3>
            <form onSubmit={handleCreateSlot} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">ชื่อครูผู้รับการนิเทศ:</label>
                <input 
                  type="text" 
                  required
                  value={newSlotForm.teacher_name}
                  onChange={e => setNewSlotForm({ ...newSlotForm, teacher_name: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">รหัสวิชา / ชื่อวิชา:</label>
                <input 
                  type="text" 
                  required
                  placeholder="เช่น ว23101 วิทยาศาสตร์ 5"
                  value={newSlotForm.subject_code}
                  onChange={e => setNewSlotForm({ ...newSlotForm, subject_code: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">วัน:</label>
                  <select 
                    value={newSlotForm.day_of_week}
                    onChange={e => setNewSlotForm({ ...newSlotForm, day_of_week: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent font-bold"
                  >
                    <option value="MONDAY">วันจันทร์</option>
                    <option value="TUESDAY">วันอังคาร</option>
                    <option value="WEDNESDAY">วันพุธ</option>
                    <option value="THURSDAY">วันพฤหัสบดี</option>
                    <option value="FRIDAY">วันศุกร์</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">คาบเรียน:</label>
                  <select 
                    value={newSlotForm.period_number}
                    onChange={e => setNewSlotForm({ ...newSlotForm, period_number: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <option key={p} value={p}>คาบที่ {p}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl"
                >
                  สร้างนัดหมาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
