"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Sparkles, 
  Printer, 
  Grid, 
  Users, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Download,
  Plus,
  RefreshCw
} from "lucide-react";
import { ExamService } from "@/lib/services/examService";

const MOCK_OFFERINGS = [
  { subjectCode: "ว23101", subjectName: "วิทยาศาสตร์ 5", targetClassrooms: ["ม.3/1", "ม.3/2"], assignedRoom: "ห้อง 301" },
  { subjectCode: "ค23101", subjectName: "คณิตศาสตร์ 5", targetClassrooms: ["ม.3/1", "ม.3/2"], assignedRoom: "ห้อง 301" },
  { subjectCode: "ท23101", subjectName: "ภาษาไทย 5", targetClassrooms: ["ม.3/1"], assignedRoom: "ห้อง 302" },
  { subjectCode: "อ23101", subjectName: "ภาษาอังกฤษ 5", targetClassrooms: ["ม.3/2"], assignedRoom: "ห้อง 302" }
];

const MOCK_TEACHERS = [
  { name: "ครูสมชาย สายวิทย์" },
  { name: "ครูสมหญิง คณิตศาสตร์" },
  { name: "ครูวิชัย ภาษาไทย" },
  { name: "ครูนภา ภาษาต่างประเทศ" }
];

export default function AcademicExamPage() {
  const [activeTab, setActiveTab] = useState<"TIMETABLE" | "SEATING" | "SUPERVISORS" | "PRINT">("TIMETABLE");
  const [examType, setExamType] = useState<"MIDTERM" | "FINAL">("MIDTERM");
  const [examDaysCount, setExamDaysCount] = useState(3);
  const [selectedRoom, setSelectedRoom] = useState("ห้อง 301");

  // State
  const [examSlots, setExamSlots] = useState(() => ExamService.generateExamSlots(MOCK_OFFERINGS, 3));
  const [seatingMatrix, setSeatingMatrix] = useState(() => ExamService.generateSeatingMatrix(5, 6, []));

  const handleGenerateExamSlots = () => {
    const newSlots = ExamService.generateExamSlots(MOCK_OFFERINGS, examDaysCount);
    const assigned = ExamService.assignExamSupervisors(MOCK_TEACHERS, newSlots);
    setExamSlots(assigned);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            ระบบจัดตารางสอบ & ผังที่นั่งสอบ (Exam Generator)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            จัดตารางสอบกลางภาค/ปลายภาค ผังที่นั่งสลับเลขที่ และจัดครูคุมสอบประจำห้อง
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={examType}
            onChange={e => setExamType(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
          >
            <option value="MIDTERM">การสอบกลางภาคเรียน</option>
            <option value="FINAL">การสอบปลายภาคเรียน</option>
          </select>

          <button
            onClick={handleGenerateExamSlots}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            สั่ง AI จัดตารางสอบอัตโนมัติ
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("TIMETABLE")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "TIMETABLE" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          ตารางสอบรายวัน
        </button>

        <button
          onClick={() => setActiveTab("SEATING")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "SEATING" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          ผังที่นั่งสอบสลับเลขที่
        </button>

        <button
          onClick={() => setActiveTab("SUPERVISORS")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "SUPERVISORS" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          จัดครูคุมสอบ
        </button>

        <button
          onClick={() => setActiveTab("PRINT")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "PRINT" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          พิมพ์ใบติดหน้าห้องสอบ A4
        </button>
      </div>

      {/* TAB 1: Exam Timetable Matrix */}
      {activeTab === "TIMETABLE" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              📝 ตารางสอบ{examType === "MIDTERM" ? "กลางภาค" : "ปลายภาค"} (Exam Timetable Matrix)
            </h2>
            <span className="text-xs text-slate-500 font-semibold">จำนวนวันสอบ: {examDaysCount} วัน</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">วันสอบ</th>
                  <th className="p-3 text-center">เวลาสอบ</th>
                  <th className="p-3">รหัสวิชา & วิชาสอบ</th>
                  <th className="p-3">ชั้นเรียนสอบ</th>
                  <th className="p-3">ห้องสอบ</th>
                  <th className="p-3">ครูผู้คุมสอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {examSlots.map(slot => (
                  <tr key={slot.examSlotId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-indigo-600">{slot.dayName}</td>
                    <td className="p-3 text-center font-semibold text-slate-500">{slot.startTime} - {slot.endTime} น.</td>
                    <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                      {slot.subjectCode} - {slot.subjectName}
                    </td>
                    <td className="p-3 font-bold text-purple-600">{slot.targetClassrooms?.join(", ")}</td>
                    <td className="p-3 font-semibold text-emerald-600">{slot.assignedRoom}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{slot.supervisors?.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Seating Matrix */}
      {activeTab === "SEATING" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                🪑 ผังที่นั่งสอบออนไลน์สลับเลขที่ ({selectedRoom})
              </h2>
              <p className="text-xs text-slate-500 mt-1">จัดที่นั่งสลับชั้นเรียน/ห้องเรียน ป้องกันการลอกข้อสอบ</p>
            </div>

            <select
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value="ห้อง 301">ห้องสอบ 301</option>
              <option value="ห้อง 302">ห้องสอบ 302</option>
            </select>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="text-center font-bold text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 py-2 rounded-xl">
              🚪 โต๊ะครูผู้คุมสอบ / หน้าห้องสอบ 🚪
            </div>

            <div className="grid grid-cols-6 gap-3">
              {seatingMatrix.flatMap((row, rIdx) =>
                row.map((seat, cIdx) => (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`p-3 rounded-2xl border text-center space-y-1 shadow-xs transition ${
                      seat.classRoom === "ม.3/1"
                        ? "bg-purple-50 border-purple-200 text-purple-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <div className="text-[10px] font-extrabold text-slate-400">เลขที่นั่ง {seat.seatNumber}</div>
                    <div className="text-xs font-black">{seat.studentName}</div>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80">
                      {seat.classRoom}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Supervisors */}
      {activeTab === "SUPERVISORS" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            👨‍🏫 จัดตารางครูผู้คุมสอบ (Exam Supervisor Roster)
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">วัน / เวลาสอบ</th>
                  <th className="p-3">ห้องสอบ</th>
                  <th className="p-3">วิชาสอบ</th>
                  <th className="p-3">ครูคุมสอบคนที่ 1</th>
                  <th className="p-3">ครูคุมสอบคนที่ 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {examSlots.map(slot => (
                  <tr key={slot.examSlotId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold">{slot.dayName} ({slot.startTime} - {slot.endTime} น.)</td>
                    <td className="p-3 font-bold text-emerald-600">{slot.assignedRoom}</td>
                    <td className="p-3">{slot.subjectCode} {slot.subjectName}</td>
                    <td className="p-3 font-bold text-indigo-600">{slot.supervisors?.[0]}</td>
                    <td className="p-3 font-bold text-purple-600">{slot.supervisors?.[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Print Room Door Poster */}
      {activeTab === "PRINT" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ใบปิดประกาศหน้าห้องสอบ A4
            </button>
          </div>

          <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-300 shadow-2xl space-y-6 max-w-4xl mx-auto font-sans">
            <div className="text-center space-y-1 border-b border-slate-300 pb-4">
              <h1 className="text-xl font-black">โรงเรียนกุดจับประชาสรรค์</h1>
              <h2 className="text-base font-bold text-indigo-700">
                ใบติดประกาศหน้าห้องสอบ ({selectedRoom}) - การสอบ{examType === "MIDTERM" ? "กลางภาค" : "ปลายภาค"}
              </h2>
              <p className="text-xs text-slate-500">ภาคเรียนที่ 1 ปีการศึกษา 2569</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700">📋 รายวิชาที่ทำการสอบห้องนี้:</div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>• ว23101 วิทยาศาสตร์ 5 (ม.3/1, ม.3/2)</div>
                <div>• ค23101 คณิตศาสตร์ 5 (ม.3/1, ม.3/2)</div>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-700">🪑 ผังเลขที่นั่งสอบประจำห้อง:</div>
            <div className="grid grid-cols-6 gap-2 text-center text-[10px]">
              {seatingMatrix.flatMap((row, rIdx) =>
                row.map((seat, cIdx) => (
                  <div key={`${rIdx}-${cIdx}`} className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                    <div className="font-bold text-indigo-700">{seat.seatNumber}</div>
                    <div className="truncate">{seat.studentName}</div>
                    <div className="text-slate-500 font-bold">{seat.classRoom}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-8 text-center text-xs text-slate-600 border-t border-slate-300">
              ลงชื่อ.......................................................... ครูผู้คุมสอบ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
