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
    { key: 'MONDAY', label: 'วันจันทร์', color: 'from-amber-500/10 to-yellow-500/5 text-amber-700 border-amber-200' },
    { key: 'TUESDAY', label: 'วันอังคาร', color: 'from-pink-500/10 to-rose-500/5 text-pink-700 border-pink-200' },
    { key: 'WEDNESDAY', label: 'วันพุธ', color: 'from-emerald-500/10 to-green-500/5 text-emerald-700 border-emerald-200' },
    { key: 'THURSDAY', label: 'วันพฤหัสบดี', color: 'from-orange-500/10 to-amber-500/5 text-orange-700 border-orange-200' },
    { key: 'FRIDAY', label: 'วันศุกร์', color: 'from-blue-500/10 to-cyan-500/5 text-blue-700 border-blue-200' }
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

  // Director Sign & Override
  const handleDirectorOverride = () => {
    const total = Object.values(rubricScores).reduce((a, b) => a + Number(b), 0);
    const percentage = Math.round((total / 25) * 100);

    const updated = sessions.map(s => {
      if (s.session_id === selectedSession.session_id) {
        return {
          ...s,
          status: 'COMPLETED',
          evaluation: {
            scores: rubricScores,
            total_score: total,
            max_score: 25,
            percentage,
            strengths: strengthsText,
            improvement_points: improvementText
          },
          director_approval: {
            approved: true,
            director_name: 'นายอภิชาติ มาตรสีกลาง (ผู้อำนวยการ)',
            director_comment: directorCommentText,
            overridden: true
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* 🟢 Main Navigation Header (Shared eLeave Shell) */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left: Brand & Department Subsystem Context */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-xl">📖</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  ฝ่ายวิชาการ (Academic Affairs)
                </span>
                <span className="text-xs text-slate-400">• ระบบย่อยบริหารงานวิชาการ</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                ระบบนิเทศการสอนออนไลน์ (Instructional Supervision System)
              </h1>
            </div>
          </div>

          {/* Right: Subsystem Links & Profile Switcher */}
          <div className="flex items-center gap-4">
            {/* Department Navigation Pills */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <span className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/20 rounded-lg">
                📚 นิเทศการสอน
              </span>
              <span className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer transition">
                📂 งานสารบรรณ/เอกสาร
              </span>
              <span className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer transition">
                🛠️ แจ้งซ่อมบำรุง
              </span>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400">บทบาท:</span>
              <select 
                value={userRole} 
                onChange={(e) => setUserRole(e.target.value)}
                className="bg-transparent text-xs font-bold text-purple-300 focus:outline-none cursor-pointer"
              >
                <option value="SUPERVISOR" className="bg-slate-800 text-white">👨‍🏫 ผู้นิเทศ (Supervisor)</option>
                <option value="TEACHER" className="bg-slate-800 text-white">👩‍🏫 ครูผู้รับการนิเทศ (Teacher)</option>
                <option value="DIRECTOR" className="bg-slate-800 text-white">👑 ผู้อำนวยการ (Director)</option>
              </select>
            </div>

            {/* Admin Profile */}
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                PG
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white">panchapon@udkp.ac.th</div>
                <div className="text-[10px] text-purple-400 font-medium">ผู้อำนวยการโรงเรียน</div>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* 📊 Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 1. Subsystem KPI Executive Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">จำนวนการนิเทศทั้งหมด</span>
              <span className="text-lg">📋</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">{metrics.total} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
            <div className="text-[11px] text-purple-400 mt-1">ประจำภาคเรียนที่ 1/2569</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">เสร็จสิ้นสมบูรณ์</span>
              <span className="text-lg">✅</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">{metrics.completed} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
            <div className="text-[11px] text-emerald-500 mt-1">ผอ. ลงนามรับทราบเรียบร้อย</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">รอครูรับทราบผล</span>
              <span className="text-lg">⏳</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">{metrics.pendingAck} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
            <div className="text-[11px] text-amber-500 mt-1">รอครูกดสะท้อนคิด (Reflection)</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden group hover:border-cyan-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">นิเทศออนไลน์ (คลิป)</span>
              <span className="text-lg">🎥</span>
            </div>
            <div className="text-2xl font-extrabold text-cyan-400 mt-2">{metrics.onlineCount} <span className="text-xs font-normal text-slate-400">คาบ</span></div>
            <div className="text-[11px] text-cyan-500 mt-1">ส่งผ่านลิงก์วิดีโอ YouTube/Drive</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">คะแนนเฉลี่ยการสอน</span>
              <span className="text-lg">⭐</span>
            </div>
            <div className="text-2xl font-extrabold text-indigo-300 mt-2">{metrics.avgScore} <span className="text-xs font-normal text-slate-400">/ 5.00</span></div>
            <div className="text-[11px] text-indigo-400 mt-1">เกณฑ์คุณภาพระดับดีเยี่ยม</div>
          </div>
        </section>

        {/* 2. Control Toolbar & Filtering */}
        <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Department Filter */}
            <select 
              value={departmentFilter} 
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="ALL">ทุกกลุ่มสาระการเรียนรู้</option>
              <option value="วิทยาศาสตร์และเทคโนโลยี">กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี</option>
              <option value="คณิตศาสตร์">กลุ่มสาระฯ 수학/คณิตศาสตร์</option>
              <option value="ภาษาต่างประเทศ">กลุ่มสาระฯ ภาษาต่างประเทศ</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อครู, รหัสวิชา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition"
          >
            <span>+</span> ลงนัดหมายนิเทศใหม่
          </button>
        </section>

        {/* 3. Weekly Supervision Matrix Timetable */}
        <section className="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🗓️</span> ตารางนิเทศรายสัปดาห์ (Weekly Supervision Timetable)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                คลิกที่ช่องคาบเรียนเพื่อเปิดหน้าต่างประเมินและกรอกผลการสอนได้ทันที
              </p>
            </div>
            <div className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20">
              สัปดาห์ที่ 6 (ภาคเรียนที่ 1/2569)
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[960px] grid grid-cols-9 gap-3">
              
              {/* Header Row */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center text-xs font-bold text-slate-400 flex items-center justify-center">
                วัน \ คาบ
              </div>
              {periodsList.map(p => (
                <div key={p} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center text-xs font-bold text-purple-300">
                  คาบ {p}
                </div>
              ))}

              {/* Day Rows */}
              {daysList.map(dayObj => (
                <React.Fragment key={dayObj.key}>
                  {/* Day Label */}
                  <div className={`bg-gradient-to-b ${dayObj.color} border rounded-xl p-3 flex items-center justify-center text-xs font-bold`}>
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
                            ? 'bg-slate-800/90 border-slate-700/80 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1' 
                            : 'bg-slate-900/30 border-slate-800/50 border-dashed hover:border-slate-700 hover:bg-slate-800/20'
                        }`}
                      >
                        {slotData ? (
                          <>
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-purple-300 truncate">
                                  {slotData.supervision_type === 'ONLINE' ? '🎥 ' : ''}{slotData.subject_code}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">{slotData.class_level}</span>
                              </div>
                              <div className="text-[11px] font-medium text-slate-200 mt-1 line-clamp-1">
                                {slotData.teacher_name}
                              </div>
                              <div className="text-[10px] text-slate-400">{slotData.room_number}</div>
                            </div>

                            <div className="mt-2">
                              {slotData.status === 'COMPLETED' && (
                                <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                  ✓ ประเมินเรียบร้อย ({slotData.evaluation?.total_score}/25)
                                </span>
                              )}
                              {slotData.status === 'WAITING_TEACHER_ACK' && (
                                <span className="inline-block text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                  ⏳ รอครูรับทราบ
                                </span>
                              )}
                              {slotData.status === 'SCHEDULED' && (
                                <span className="inline-block text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                                  📌 นัดหมายแล้ว
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-600 text-xs font-semibold hover:text-slate-400">
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

      </main>

      {/* 🔴 Evaluation Drawer / Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                  {selectedSession.subject_code} • {selectedSession.class_level}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  แบบประเมินการนิเทศ: {selectedSession.subject_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ครูผู้สอน: <strong>{selectedSession.teacher_name}</strong> | ผู้นิเทศ: <strong>{selectedSession.supervisor_name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Attached Documents */}
            <div className="flex items-center gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <a 
                href={selectedSession.lesson_plan_file_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-3 py-2 rounded-xl hover:bg-purple-500/30 transition"
              >
                📄 ดูแผนการจัดการเรียนรู้ (PDF)
              </a>

              {selectedSession.supervision_type === 'ONLINE' && selectedSession.video_link && (
                <a 
                  href={selectedSession.video_link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-3 py-2 rounded-xl hover:bg-rose-500/30 transition"
                >
                  🎥 เปิดดูคลิปการสอนออนไลน์ (YouTube/Drive)
                </a>
              )}
            </div>

            {/* Role Dynamic Form */}
            {userRole === 'SUPERVISOR' && (
              <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  ประเมินเกณฑ์ Rubric 5 ด้าน (1 - 5 คะแนน)
                </h4>

                <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                  {[
                    { key: 'c1', label: '1. การเตรียมการสอนและแผนการเรียนรู้' },
                    { key: 'c2', label: '2. การจัดกิจกรรมการเรียนรู้' },
                    { key: 'c3', label: '3. การใช้สื่อและเทคโนโลยี' },
                    { key: 'c4', label: '4. การวัดและประเมินผล' },
                    { key: 'c5', label: '5. การบริหารจัดการชั้นเรียน' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.label}</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="5"
                        value={rubricScores[item.key] || 5}
                        onChange={(e) => setRubricScores({ ...rubricScores, [item.key]: Number(e.target.value) })}
                        className="w-16 bg-slate-900 border border-slate-700 text-center text-purple-300 font-bold py-1.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">จุดเด่น (Strengths)</label>
                  <textarea 
                    rows={2}
                    value={strengthsText}
                    onChange={(e) => setStrengthsText(e.target.value)}
                    placeholder="ระบุจุดเด่นการสอน..."
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ข้อเสนอแนะที่ควรพัฒนา (Improvement Points)</label>
                  <textarea 
                    rows={2}
                    value={improvementText}
                    onChange={(e) => setImprovementText(e.target.value)}
                    placeholder="ระบุข้อเสนอแนะ..."
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 transition shadow-lg shadow-purple-500/20"
                >
                  บันทึกผลการประเมินการนิเทศ
                </button>
              </form>
            )}

            {userRole === 'TEACHER' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-2">
                  <div className="text-xs font-bold text-emerald-400">
                    คะแนนรวม: {selectedSession.evaluation?.total_score || 0} / 25 ({selectedSession.evaluation?.percentage || 0}%)
                  </div>
                  <p className="text-xs text-slate-300"><strong>จุดเด่น:</strong> {selectedSession.evaluation?.strengths || '-'}</p>
                  <p className="text-xs text-slate-300"><strong>ข้อควรพัฒนา:</strong> {selectedSession.evaluation?.improvement_points || '-'}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ข้อคิดเห็น / การสะท้อนคิดของครู (Reflection)</label>
                  <textarea 
                    rows={3}
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="พิมพ์ความคิดเห็นตอบกลับ..."
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <button 
                  onClick={handleTeacherAck}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  กดรับทราบผลการนิเทศ
                </button>
              </div>
            )}

            {userRole === 'DIRECTOR' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-2">
                  <div className="text-xs font-bold text-purple-400">
                    คะแนนประเมินปัจจุบัน: {selectedSession.evaluation?.total_score || 0} / 25
                  </div>
                  <p className="text-xs text-slate-300"><strong>ความคิดเห็นครูสะท้อนคิด:</strong> {selectedSession.teacher_ack?.reflection || 'รับทราบผลการประเมินแล้ว'}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ความคิดเห็นของผู้อำนวยการ</label>
                  <textarea 
                    rows={2}
                    value={directorCommentText}
                    onChange={(e) => setDirectorCommentText(e.target.value)}
                    placeholder="พิมพ์ความคิดเห็นรับทราบ..."
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <button 
                  onClick={handleDirectorOverride}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-amber-500/20"
                >
                  ลงนามรับทราบ / แก้ไขคะแนน (Director Override)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 🟢 Modal Schedule New Slot */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ลงนัดหมายการนิเทศใหม่</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">ชื่อครูผู้รับการนิเทศ</label>
                <input 
                  type="text" 
                  required
                  placeholder="เช่น นายเดชาธร ศรีสุข"
                  value={newSlotForm.teacher_name}
                  onChange={(e) => setNewSlotForm({...newSlotForm, teacher_name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">รหัสวิชา</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ว23101"
                    value={newSlotForm.subject_code}
                    onChange={(e) => setNewSlotForm({...newSlotForm, subject_code: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">ชื่อวิชา</label>
                  <input 
                    type="text" 
                    required
                    placeholder="วิทยาศาสตร์ 5"
                    value={newSlotForm.subject_name}
                    onChange={(e) => setNewSlotForm({...newSlotForm, subject_name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">วันในสัปดาห์</label>
                  <select 
                    value={newSlotForm.day_of_week}
                    onChange={(e) => setNewSlotForm({...newSlotForm, day_of_week: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                  >
                    <option value="MONDAY">วันจันทร์</option>
                    <option value="TUESDAY">วันอังคาร</option>
                    <option value="WEDNESDAY">วันพุธ</option>
                    <option value="THURSDAY">วันพฤหัสบดี</option>
                    <option value="FRIDAY">วันศุกร์</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">คาบเรียน</label>
                  <select 
                    value={newSlotForm.period_number}
                    onChange={(e) => setNewSlotForm({...newSlotForm, period_number: Number(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                  >
                    {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>คาบ {p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">รูปแบบการนิเทศ</label>
                <select 
                  value={newSlotForm.supervision_type}
                  onChange={(e) => setNewSlotForm({...newSlotForm, supervision_type: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                >
                  <option value="ONSITE">นิเทศในชั้นเรียน (Onsite)</option>
                  <option value="ONLINE">นิเทศแบบออนไลน์ (ส่งคลิปวิดีโอ)</option>
                </select>
              </div>

              {newSlotForm.supervision_type === 'ONLINE' && (
                <div>
                  <label className="text-slate-300 block mb-1">ลิงก์คลิปวิดีโอ (YouTube/Drive)</label>
                  <input 
                    type="url" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newSlotForm.video_link}
                    onChange={(e) => setNewSlotForm({...newSlotForm, video_link: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl mt-2"
              >
                ยืนยันการบันทึกนัดหมาย
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
