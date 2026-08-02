"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  Sparkles, 
  Layers, 
  Search, 
  Building2, 
  Users, 
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import { TimetableService } from "@/lib/services/timetableService";

// Mock Master Data
const MOCK_SLOTS_INITIAL = [
  { id: "s1", timetableVersionId: "v1", offeringId: "off-101", subjectCode: "ว23101", subjectName: "วิทยาศาสตร์ 5", teacherName: "ครูสมชาย สายวิทย์", className: "ม.3/1", roomId: "r101", roomName: "ห้อง 301", dayOfWeek: 1, periodNumber: 1 },
  { id: "s2", timetableVersionId: "v1", offeringId: "off-102", subjectCode: "ค23101", subjectName: "คณิตศาสตร์ 5", teacherName: "ครูสมหญิง คณิตศาสตร์", className: "ม.3/1", roomId: "r101", dayOfWeek: 1, periodNumber: 2 },
  { id: "s3", timetableVersionId: "v1", offeringId: "off-103", subjectCode: "ท23101", subjectName: "ภาษาไทย 5", teacherName: "ครูวิชัย ภาษาไทย", className: "ม.3/1", roomId: "r101", dayOfWeek: 2, periodNumber: 3 },
  { id: "s4", timetableVersionId: "v1", offeringId: "off-104", subjectCode: "อ23101", subjectName: "ภาษาอังกฤษ 5", teacherName: "ครูนภา ภาษาต่างประเทศ", className: "ม.3/2", roomId: "r102", dayOfWeek: 3, periodNumber: 1 }
];

const DAYS = [
  { id: 1, name: "วันจันทร์", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: 2, name: "วันอังคาร", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { id: 3, name: "วันพุธ", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: 4, name: "วันพฤหัสบดี", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { id: 5, name: "วันศุกร์", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetableBuilderPage() {
  const [dragMode, setDragMode] = useState<"DIRECT" | "CHAIN">("DIRECT");
  const [slots, setSlots] = useState(MOCK_SLOTS_INITIAL);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("ม.3/1");

  const handleDirectMove = (slotId: string, newDay: number, newPeriod: number) => {
    const service = new TimetableService({ versions: [], slots, offerings: [], rooms: [] });
    try {
      const updated = service.directMoveSlot(slotId, newDay, newPeriod);
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, dayOfWeek: newDay, periodNumber: newPeriod, hasCollision: updated.hasCollision } : s));
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              ระบบจัดตารางสอนแม่บท (Timetable Builder)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              จัดตารางสอนระดับโรงเรียน
            </h1>
            <p className="text-purple-100 text-sm max-w-2xl leading-relaxed">
              วางตารางสอนครูรายบุคคล ตรวจสอบคาบซ้อน 4 มิติ สลับคาบโดยตรงหรือใช้ AI ช่วยจัดอัตโนมัติ
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("พิมพ์รายงานตารางสอนรายชั้น/รายครูสำเร็จ!")}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ส่งออก PDF / Excel
            </button>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อครู/วิชา/ห้อง..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold border-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ม.3/1">ชั้น ม.3/1</option>
            <option value="ม.3/2">ชั้น ม.3/2</option>
            <option value="ม.3/3">ชั้น ม.3/3</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setDragMode(dragMode === "DIRECT" ? "CHAIN" : "DIRECT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              dragMode === "DIRECT"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                : "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
            }`}
          >
            {dragMode === "DIRECT" ? (
              <>📍 โหมดขยับคาบโดยตรง (Direct Move)</>
            ) : (
              <>🔗 โหมดสลับลูกโซ่ AI (Chain Swap)</>
            )}
          </button>

          <button
            onClick={() => alert("AI Auto-Scheduler กำลังประมวลผลตารางสอนไร้คาบชน...")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            AI จัดตารางอัตโนมัติ
          </button>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 w-32 font-bold text-center">วัน / คาบ</th>
              {PERIODS.map(p => (
                <th key={p} className="p-4 font-bold text-center border-l border-slate-200 dark:border-slate-800">
                  คาบที่ {p}
                  <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                    {p === 4 ? "พักกลางวัน" : `${8 + p - 1}:30 - ${8 + p}:20`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {DAYS.map(day => (
              <tr key={day.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="p-3 font-bold text-center">
                  <span className={`inline-block px-3 py-1.5 rounded-xl border ${day.color} text-xs shadow-xs`}>
                    {day.name}
                  </span>
                </td>
                {PERIODS.map(period => {
                  const slot = slots.find(s => s.dayOfWeek === day.id && s.periodNumber === period);
                  return (
                    <td key={period} className="p-2 border-l border-slate-200 dark:border-slate-800 h-24 align-top">
                      {slot ? (
                        <div
                          onClick={() => {
                            const newP = prompt("ย้ายไปคาบที่เท่าไหร่? (1-8)", String(period));
                            if (newP) handleDirectMove(slot.id, day.id, parseInt(newP, 10));
                          }}
                          className={`h-full p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
                            slot.hasCollision
                              ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
                              : "bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 hover:border-purple-400 text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300">
                                {slot.subjectCode}
                              </span>
                              {slot.hasCollision && (
                                <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold animate-pulse">
                                  ⚠️ ซ้อน
                                </span>
                              )}
                            </div>
                            <div className="font-semibold line-clamp-1">{slot.subjectName}</div>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-2 border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-purple-500" />
                              <span className="truncate">{slot.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{slot.roomName}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            const code = prompt("ระบุรหัสวิชาที่จะจัดใส่คาบนี้:", "ว23101");
                            if (code) {
                              setSlots(prev => [...prev, {
                                id: `s-${Date.now()}`,
                                timetableVersionId: "v1",
                                offeringId: "off-new",
                                subjectCode: code,
                                subjectName: "วิชาเลือกเพิ่มเติม",
                                teacherName: "ครูผู้สอน",
                                className: selectedClass,
                                roomId: "r101",
                                roomName: "ห้อง 301",
                                dayOfWeek: day.id,
                                periodNumber: period
                              }]);
                            }
                          }}
                          className="h-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 flex items-center justify-center text-slate-400 text-[11px] font-medium cursor-pointer transition-colors"
                        >
                          + เพิ่มคาบ
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
