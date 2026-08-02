"use client";

import React, { useState } from "react";
import { 
  Award, 
  Star, 
  Printer, 
  CheckCircle2, 
  FileCheck, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  UserCheck, 
  Download,
  Plus
} from "lucide-react";
import { CompetencyService } from "@/lib/services/competencyService";

export default function TeacherCompetencyPage() {
  const [activeTab, setActiveTab] = useState<"COMPETENCY" | "PA_AGREEMENT" | "PD_HOURS" | "PRINT">("COMPETENCY");
  const [scores, setScores] = useState({ c1_pedagogy: 5, c2_innovation: 4, c3_classroom: 5, c4_evaluation: 4, c5_ethics: 5 });
  const [pdHoursList, setPdHoursList] = useState([
    { id: "pd-1", title: "การอบรมปัญญาประดิษฐ์ทางการศึกษา (AI in Education)", hours: 12, organizer: "สพฐ.", date: "2026-06-15" },
    { id: "pd-2", title: "การจัดทำข้อตกลง PA และการประเมินวิทยฐานะ", hours: 12, organizer: "มหาวิทยาลัยนเรศวร", date: "2026-07-20" }
  ]);

  // Form State
  const [newPdTitle, setNewPdTitle] = useState("");
  const [newPdHours, setNewPdHours] = useState(6);
  const [newPdOrganizer, setNewPdOrganizer] = useState("");

  const evalResult = CompetencyService.calculateCompetencyScore(scores);
  const totalPdHours = pdHoursList.reduce((acc, curr) => acc + curr.hours, 0);

  const handleAddPdRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPdTitle) return;
    setPdHoursList(prev => [
      ...prev,
      {
        id: `pd-${Date.now()}`,
        title: newPdTitle,
        hours: newPdHours,
        organizer: newPdOrganizer || "หน่วยงานภายนอก",
        date: new Date().toISOString().split("T")[0]
      }
    ]);
    setNewPdTitle("");
    setNewPdHours(6);
    setNewPdOrganizer("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ระบบแฟ้มสะสมงาน & ประเมินสมรรถนะครู (PA Portfolio)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บันทึกข้อตกลงในการพัฒนางาน (PA) ชั่วโมงพัฒนาวิชาชีพ (PD Hours) และสรุปแฟ้มสะสมผลงาน
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-700 dark:text-purple-300 text-xs font-bold">
            ระดับสมรรถนะ: {evalResult.gradeLevel} ({evalResult.percentage}%)
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("COMPETENCY")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "COMPETENCY" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          สมรรถนะครู 5 ด้าน
        </button>

        <button
          onClick={() => setActiveTab("PA_AGREEMENT")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "PA_AGREEMENT" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          ข้อตกลงในการพัฒนางาน (PA)
        </button>

        <button
          onClick={() => setActiveTab("PD_HOURS")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "PD_HOURS" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          ชั่วโมงอบรมพัฒนาวิชาชีพ ({totalPdHours} ชม.)
        </button>

        <button
          onClick={() => setActiveTab("PRINT")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "PRINT" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          พิมพ์สรุปแฟ้มสะสมงาน PA A4
        </button>
      </div>

      {/* TAB 1: 5-Dimension Competency */}
      {activeTab === "COMPETENCY" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ⭐ สรุปการประเมินสมรรถนะการจัดการเรียนรู้ 5 ด้าน
            </h2>
            <span className="text-xs font-black text-purple-600">คะแนนรวม {evalResult.total} / 25</span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { key: "c1_pedagogy", label: "ด้านที่ 1: การออกแบบและการจัดการเรียนรู้ (Pedagogy & Lesson Design)", score: scores.c1_pedagogy },
              { key: "c2_innovation", label: "ด้านที่ 2: การพัฒนาสื่อและนวัตกรรมเทคโนโลยี (Innovation & EdTech)", score: scores.c2_innovation },
              { key: "c3_classroom", label: "ด้านที่ 3: การบริหารจัดการชั้นเรียนและบรรยากาศ (Classroom Management)", score: scores.c3_classroom },
              { key: "c4_evaluation", label: "ด้านที่ 4: การวัดและประเมินผลการเรียนรู้ (Measurement & Assessment)", score: scores.c4_evaluation },
              { key: "c5_ethics", label: "ด้านที่ 5: จรรยาบรรณวิชาชีพและการพัฒนาตนเอง (Ethics & Professional Development)", score: scores.c5_ethics }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <span className="font-bold">{item.label}</span>
                <select
                  value={item.score}
                  onChange={e => setScores({ ...scores, [item.key]: Number(e.target.value) })}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-purple-600"
                >
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ดาว ({n === 5 ? "ดีเยี่ยม" : n === 4 ? "ดีมาก" : n === 3 ? "ดี" : "ต้องพัฒนา"})</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PA Agreement */}
      {activeTab === "PA_AGREEMENT" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            📑 ข้อตกลงในการพัฒนางาน (Performance Agreement - PA) ประจำปีการศึกษา 2569
          </h2>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="font-bold text-purple-600 text-sm">🎯 ประเด็นท้าทาย (Challenge Issue):</div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                การพัฒนาผลสัมฤทธิ์ทางการเรียนวิชาวิทยาศาสตร์ เรื่อง พันธุศาสตร์ สำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 3 โดยใช้ห้องเรียนทดลองเสมือนจริง (Virtual Lab) ร่วมกับสื่อการเรียนรู้แบบโต้ตอบ
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="font-bold text-emerald-600 text-sm">📈 ตัวชี้วัดความสำเร็จ (Success KPIs):</div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li>นักเรียนร้อยละ 85 มีผลสัมฤทธิ์ทางการเรียนผ่านเกณฑ์ระดับดีขึ้นไป</li>
                <li>นักเรียนมีความพึงพอใจต่อการเรียนด้วยสื่อทดลองเสมือนจริงในระดับดีเยี่ยม</li>
                <li>มีบันทึกร่องรอยแผนการจัดการเรียนรู้และไฟล์คลิปการนิเทศการสอนออนไลน์ผ่านระบบครบถ้วน</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PD Hours Tracker */}
      {activeTab === "PD_HOURS" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              🎓 บันทึกชั่วโมงการพัฒนาวิชาชีพ (PD Hours Tracker)
            </h2>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              สะสมรวม: {totalPdHours} ชั่วโมง / ปี
            </span>
          </div>

          <form onSubmit={handleAddPdRecord} className="flex flex-col md:flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <input
              type="text"
              placeholder="ชื่อหลักสูตร / การอบรมที่ผ่าน..."
              value={newPdTitle}
              onChange={e => setNewPdTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="number"
              value={newPdHours}
              onChange={e => setNewPdHours(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center bg-white dark:bg-slate-900 font-bold"
            />
            <input
              type="text"
              placeholder="หน่วยงานผู้จัด..."
              value={newPdOrganizer}
              onChange={e => setNewPdOrganizer(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" /> เพิ่มประวัติอบรม
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">ชื่อหลักสูตรอบรม</th>
                  <th className="p-3 text-center">จำนวนชั่วโมง</th>
                  <th className="p-3">หน่วยงานผู้จัด</th>
                  <th className="p-3">วันที่สำเร็จ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pdHoursList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{item.title}</td>
                    <td className="p-3 text-center font-black text-purple-600">{item.hours} ชม.</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.organizer}</td>
                    <td className="p-3 text-slate-400">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Print Portfolio Sheet */}
      {activeTab === "PRINT" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              พิมพ์แฟ้มสะสมงาน PA A4
            </button>
          </div>

          <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-300 shadow-2xl space-y-6 max-w-4xl mx-auto font-sans">
            <div className="text-center space-y-1 border-b border-slate-300 pb-4">
              <h1 className="text-xl font-black">โรงเรียนกุดจับประชาสรรค์</h1>
              <h2 className="text-base font-bold text-purple-700">
                สรุปแฟ้มสะสมผลงานและข้อตกลงในการพัฒนางาน (PA Portfolio Sheet)
              </h2>
              <p className="text-xs text-slate-500">ประจำปีการศึกษา 2569</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong>ชื่อ-สกุล ครูผู้รับการประเมิน:</strong> นายเดชาธร ศรีสุข</div>
              <div><strong>ตำแหน่ง/วิทยฐานะ:</strong> ครู ชำนาญการพิเศษ</div>
              <div><strong>กลุ่มสาระการเรียนรู้:</strong> วิทยาศาสตร์และเทคโนโลยี</div>
              <div><strong>ชั่วโมงอบรมสะสม (PD Hours):</strong> {totalPdHours} ชั่วโมง/ปี</div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-purple-700">⭐ ผลการประเมินสมรรถนะการสอน (5 ด้าน):</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div>• คะแนนรวมประเมิน: <strong>{evalResult.total} / 25 ({evalResult.percentage}%)</strong></div>
                <div>• สรุปผลระดับคุณภาพ: <strong className="text-purple-700">{evalResult.gradeLevel}</strong></div>
              </div>
            </div>

            <div className="pt-8 text-center text-xs text-slate-600 border-t border-slate-300 grid grid-cols-2 gap-6">
              <div>
                <div>ลงชื่อ..........................................................</div>
                <div className="font-semibold mt-1">(นายเดชาธร ศรีสุข)</div>
                <div className="text-[10px] text-slate-400">ครูผู้ขอรับการประเมิน</div>
              </div>
              <div>
                <div>ลงชื่อ..........................................................</div>
                <div className="font-semibold mt-1">(นายอภิชาติ มาตรสีกลาง)</div>
                <div className="text-[10px] text-slate-400">ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
