"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  Printer, 
  Laptop, 
  Bus, 
  Search,
  Check
} from "lucide-react";
import { FacilityReservationService } from "@/lib/services/facilityReservationService";

export default function ResourceFacilityPage() {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "CALENDAR" | "FORM" | "PRINT">("CATALOG");
  const [facilityService] = useState(() => new FacilityReservationService());
  const [facilities] = useState(() => facilityService.getFacilityList());
  const [reservations, setReservations] = useState(() => facilityService.getReservations());

  // Form State
  const [selectedResourceId, setSelectedResourceId] = useState("res-lab-1");
  const [teacherName, setTeacherName] = useState("ครูสมชาย สายวิทย์");
  const [purpose, setPurpose] = useState("การทดลองวิทยาศาสตร์เสมือนจริง ม.3/1");
  const [resDate, setResDate] = useState("2026-08-05");
  const [startTime, setStartTime] = useState("09:20");
  const [endTime, setEndTime] = useState("10:10");

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = facilityService.createReservation({
        resourceId: selectedResourceId,
        resourceName: facilities.find(f => f.id === selectedResourceId)?.name || "ทรัพยากรโรงเรียน",
        reservedByTeacher: teacherName,
        purpose,
        startTime: `${resDate}T${startTime}:00Z`,
        endTime: `${resDate}T${endTime}:00Z`
      });
      setReservations([...facilityService.getReservations()]);
      alert(`จองทรัพยากรสำเร็จ! รหัสการจอง: ${res.reservationId}`);
      setActiveTab("CALENDAR");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            ระบบจองทรัพยากร & ห้องปฏิบัติการกลาง (Resource Platform)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            จองห้องแล็บ หอประชุม อุปกรณ์โสตทัศนูปกรณ์ และรถโรงเรียน แบบเชื่อมโยงตารางสอนแม่บท
          </p>
        </div>

        <button
          onClick={() => setActiveTab("FORM")}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          ยื่นขอจองทรัพยากรใหม่
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("CATALOG")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "CATALOG" ? "bg-cyan-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          รายการทรัพยากรโรงเรียน ({facilities.length})
        </button>

        <button
          onClick={() => setActiveTab("CALENDAR")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "CALENDAR" ? "bg-cyan-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          รายการจองที่อนุมัติแล้ว ({reservations.length})
        </button>

        <button
          onClick={() => setActiveTab("FORM")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "FORM" ? "bg-cyan-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          ฟอร์มขอจองทรัพยากร
        </button>

        <button
          onClick={() => setActiveTab("PRINT")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "PRINT" ? "bg-cyan-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          พิมพ์ใบขอใช้ทรัพยากร A4
        </button>
      </div>

      {/* TAB 1: Catalog */}
      {activeTab === "CATALOG" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(fac => (
            <div key={fac.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-extrabold text-[10px]">
                  {fac.type}
                </span>
                <span className="text-xs font-bold text-emerald-600">✓ พร้อมใช้งาน</span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{fac.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{fac.location}</p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>ความจุสูงสุด: <strong>{fac.capacity}</strong></span>
                <button
                  onClick={() => { setSelectedResourceId(fac.id); setActiveTab("FORM"); }}
                  className="text-cyan-600 font-bold hover:underline"
                >
                  กดจองทรัพยากรนี้ ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Calendar & Active Reservations */}
      {activeTab === "CALENDAR" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            📅 รายการขอใช้ทรัพยากรที่ได้รับอนุมัติแล้ว
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">รหัสการจอง</th>
                  <th className="p-3">ทรัพยากร / ห้อง</th>
                  <th className="p-3">ครูผู้ขอจอง</th>
                  <th className="p-3">วัตถุประสงค์การใช้งาน</th>
                  <th className="p-3">วันและเวลาที่ขอใช้</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {reservations.map(res => (
                  <tr key={res.reservationId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-cyan-600">{res.reservationId}</td>
                    <td className="p-3 font-bold">{res.resourceName}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{res.reservedByTeacher}</td>
                    <td className="p-3 text-slate-500">{res.purpose}</td>
                    <td className="p-3 font-semibold text-purple-600">{res.startTime.split("T")[0]} ({res.startTime.split("T")[1]?.slice(0, 5)} - {res.endTime.split("T")[1]?.slice(0, 5)} น.)</td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        ✓ {res.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: New Reservation Form */}
      {activeTab === "FORM" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-2xl mx-auto text-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
            ➕ แบบฟอร์มยื่นขอจองทรัพยากรโรงเรียน
          </h2>

          <form onSubmit={handleCreateReservation} className="space-y-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">เลือกทรัพยากรที่ต้องการจอง</label>
              <select
                value={selectedResourceId}
                onChange={e => setSelectedResourceId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-cyan-600"
              >
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.location})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">ชื่อครูผู้ขอใช้ทรัพยากร</label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">วัตถุประสงค์การใช้งาน</label>
              <textarea
                rows={2}
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">วันที่ขอใช้</label>
                <input
                  type="date"
                  required
                  value={resDate}
                  onChange={e => setResDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">เวลาเริ่ม</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">เวลาสิ้นสุด</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-bold shadow-md hover:bg-cyan-700"
              >
                ยืนยันการจองทรัพยากร
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Print Approval Sheet */}
      {activeTab === "PRINT" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ใบอนุมัติใช้ทรัพยากร A4
            </button>
          </div>

          <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-300 shadow-2xl space-y-6 max-w-4xl mx-auto font-sans text-xs">
            <div className="text-center space-y-1 border-b border-slate-300 pb-4">
              <h1 className="text-xl font-black">โรงเรียนกุดจับประชาสรรค์</h1>
              <h2 className="text-base font-bold text-cyan-700">
                ใบอกนุญาตใช้ห้องปฏิบัติการและทรัพยากรส่วนกลาง
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong>ชื่อผู้ขอใช้:</strong> {teacherName}</div>
              <div><strong>ทรัพยากรที่ขอใช้:</strong> {facilities.find(f => f.id === selectedResourceId)?.name}</div>
              <div><strong>วัตถุประสงค์:</strong> {purpose}</div>
              <div><strong>วันเวลาที่ได้รับอนุมัติ:</strong> {resDate} ({startTime} - {endTime} น.)</div>
            </div>

            <div className="pt-8 text-center text-slate-600 border-t border-slate-300 grid grid-cols-2 gap-6">
              <div>
                <div>ลงชื่อ..........................................................</div>
                <div className="font-semibold mt-1">({teacherName})</div>
                <div className="text-[10px] text-slate-400">ผู้ขออนุญาตใช้ทรัพยากร</div>
              </div>
              <div>
                <div>ลงชื่อ..........................................................</div>
                <div className="font-semibold mt-1">(ผู้ดูแลอาคารและสถานที่)</div>
                <div className="text-[10px] text-slate-400">ผู้อนุมัติการใช้ทรัพยากร</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
