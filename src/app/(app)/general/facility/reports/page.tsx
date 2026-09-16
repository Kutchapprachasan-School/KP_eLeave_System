"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  ArrowLeft,
  Building,
  Bus,
  CheckCircle2,
  Clock,
  Car,
  ChevronRight,
  TrendingUp,
  Download,
  AlertCircle
} from "lucide-react";
import { getFacilityReservationsAction, getFacilityResourcesAction } from "@/app/actions/facility";
import {
  calculateApprovedCount,
  calculateActualUsageCount,
  calculateCompletedCount,
  calculateNoShowCount,
  calculateUtilizedHours
} from "@/lib/facility/FacilityKpiContract";
import {
  getAcademicYearDateRange,
  getFiscalYearDateRange,
  getCalendarYearDateRange
} from "@/lib/academicYearUtils";
import { toThaiDateString, toThaiTimeString } from "@/app/(app)/facility/_components/facility-shared";

type ReportDimension = "WEEKLY" | "MONTHLY" | "FISCAL_YEAR" | "CALENDAR_YEAR" | "ACADEMIC_YEAR";

export default function FacilityReportsPage() {
  const [dimension, setDimension] = useState<ReportDimension>("MONTHLY");
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear() + 543);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [resourceFilter, setResourceFilter] = useState<"ALL" | "MEETING_ROOM" | "VEHICLE">("ALL");

  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [bookings, resList] = await Promise.all([
          getFacilityReservationsAction(),
          getFacilityResourcesAction()
        ]);
        setReservations(bookings || []);
        setResources(resList || []);
      } catch (err) {
        console.error("Failed to load reservations for report:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute active date boundary
  const dateRange = useMemo(() => {
    const ceYear = targetYear - 543;
    if (dimension === "FISCAL_YEAR") {
      return getFiscalYearDateRange(targetYear);
    }
    if (dimension === "ACADEMIC_YEAR") {
      return getAcademicYearDateRange(targetYear);
    }
    if (dimension === "CALENDAR_YEAR") {
      return getCalendarYearDateRange(targetYear);
    }
    if (dimension === "MONTHLY") {
      const start = new Date(Date.UTC(ceYear, targetMonth, 1, 0, 0, 0));
      const end = new Date(Date.UTC(ceYear, targetMonth + 1, 0, 23, 59, 59, 999));
      const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      return {
        startUtc: start.toISOString(),
        endUtc: end.toISOString(),
        label: `ประจำเดือน${thaiMonths[targetMonth]} พ.ศ. ${targetYear}`
      };
    }
    // WEEKLY (last 7 days from today)
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startUtc: start.toISOString(),
      endUtc: now.toISOString(),
      label: `ประจำสัปดาห์ (${toThaiDateString(start)} - ${toThaiDateString(now)})`
    };
  }, [dimension, targetYear, targetMonth]);

  // Filter reservations within the selected date boundary and resource type
  const filteredList = useMemo(() => {
    return reservations.filter((r) => {
      const startIso = new Date(r.startAt).toISOString();
      const endIso = new Date(r.endAt).toISOString();
      const inRange = startIso <= dateRange.endUtc && endIso >= dateRange.startUtc;
      if (!inRange) return false;

      if (resourceFilter !== "ALL" && r.consumerModule !== resourceFilter) {
        return false;
      }
      return true;
    });
  }, [reservations, dateRange, resourceFilter]);

  // Apply Canonical KPI Contract formulas
  const kpiApproved = useMemo(() => calculateApprovedCount(filteredList), [filteredList]);
  const kpiActual = useMemo(() => calculateActualUsageCount(filteredList), [filteredList]);
  const kpiCompleted = useMemo(() => calculateCompletedCount(filteredList), [filteredList]);
  const kpiNoShow = useMemo(() => calculateNoShowCount(filteredList), [filteredList]);
  const kpiHours = useMemo(() => calculateUtilizedHours(filteredList), [filteredList]);

  // Meeting Room vs Vehicle Sub-totals
  const roomCount = filteredList.filter((r) => r.consumerModule === "MEETING_ROOM").length;
  const vehicleCount = filteredList.filter((r) => r.consumerModule === "VEHICLE").length;

  const handlePrint = () => {
    window.print();
  };

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-6xl mx-auto font-sans print:p-0 print:bg-white print:text-black">
      {/* 1. Header & Dimension Controls (Hidden on Print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/general/facility"
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
              title="กลับไประบบจอง"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                รายงานสถิติการใช้ทรัพยากรส่วนกลาง (4 มิติราชการ)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ประมวลผลข้อมูลสถิติห้องประชุมและยานพาหนะตามมาตรฐาน KPI ของสถานศึกษา
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงานราชการ (Print)</span>
            </button>
          </div>
        </div>

        {/* Dimension Selector Tabs */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">มิติเวลา:</span>
            {[
              { id: "MONTHLY", label: "รายเดือน" },
              { id: "WEEKLY", label: "รายสัปดาห์ (7 วันล่าสุด)" },
              { id: "FISCAL_YEAR", label: "ปีงบประมาณ (1 ต.ค. - 30 ก.ย.)" },
              { id: "ACADEMIC_YEAR", label: "ปีการศึกษา (16 พ.ค. - 15 พ.ค.)" },
              { id: "CALENDAR_YEAR", label: "ปีปฏิทิน (1 ม.ค. - 31 ธ.ค.)" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDimension(tab.id as ReportDimension)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dimension === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Filters: Month, Year, Resource Type */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {dimension === "MONTHLY" && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">เดือน:</span>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {dimension !== "WEEKLY" && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">พ.ศ.:</span>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium font-mono"
                >
                  {[targetYear - 2, targetYear - 1, targetYear, targetYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="font-semibold text-slate-500">ประเภททรัพยากร:</span>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              >
                <option value="ALL">ทั้งหมด (ห้องประชุม & รถโรงเรียน)</option>
                <option value="MEETING_ROOM">เฉพาะห้องประชุม</option>
                <option value="VEHICLE">เฉพาะยานพาหนะ</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Official Printable Document Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 print:border-0 print:p-0 print:shadow-none print:text-black">
        {/* Official Letterhead */}
        <div className="text-center space-y-1.5 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white print:text-black">
            โรงเรียนกุดจับประชาสรรค์ สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี
          </div>
          <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 print:text-black">
            รายงานสถิติการขอใช้บริการทรัพยากรส่วนกลาง (ห้องประชุมและยานพาหนะ)
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono print:text-black">
            ช่วงเวลา: {dateRange.label} • ข้อมูล ณ วันที่ {toThaiDateString(new Date())}
          </div>
        </div>

        {/* KPI Contract Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 print:bg-slate-50 print:border-slate-300">
            <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 print:text-black">อนุมัติแล้ว (Approved)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300 print:text-black mt-1">
              {kpiApproved} <span className="text-xs font-normal">รายการ</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 print:bg-slate-50 print:border-slate-300">
            <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 print:text-black">ใช้งานจริง (In Use)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 print:text-black mt-1">
              {kpiActual} <span className="text-xs font-normal">รายการ</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 print:bg-slate-50 print:border-slate-300">
            <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 print:text-black">เสร็จสมบูรณ์ (Done)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-blue-700 dark:text-blue-300 print:text-black mt-1">
              {kpiCompleted} <span className="text-xs font-normal">ภารกิจ</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 print:bg-slate-50 print:border-slate-300">
            <div className="text-[11px] font-semibold text-purple-900 dark:text-purple-200 print:text-black">ชั่วโมงรวม (Hours)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-700 dark:text-purple-300 print:text-black mt-1">
              {kpiHours} <span className="text-xs font-normal">ชม.</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 print:bg-slate-50 print:border-slate-300 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-rose-900 dark:text-rose-200 print:text-black">ยกเลิกหลังอนุมัติ (No-Show)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 dark:text-rose-300 print:text-black mt-1">
              {kpiNoShow} <span className="text-xs font-normal">รายการ</span>
            </div>
          </div>
        </div>

        {/* Sub-Categorical Ratio */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 print:bg-white print:border-slate-300 print:text-black">
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>การใช้ห้องประชุม: <b>{roomCount}</b> ครั้ง</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Bus className="w-4 h-4 text-emerald-600" />
            <span>การใช้ยานพาหนะ: <b>{vehicleCount}</b> ครั้ง</span>
          </div>
          <span>•</span>
          <div>
            <span>จำนวนคำขอทั้งหมดในรอบรายงาน: <b>{filteredList.length}</b> รายการ</span>
          </div>
        </div>

        {/* Detailed Records Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-400">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 print:bg-slate-100 print:text-black">
                <th className="p-2.5 w-12 text-center">ลำดับ</th>
                <th className="p-2.5 w-28">วันที่ใช้งาน</th>
                <th className="p-2.5 w-24">ช่วงเวลา</th>
                <th className="p-2.5">ทรัพยากร</th>
                <th className="p-2.5">หัวข้อภารกิจ / วัตถุประสงค์</th>
                <th className="p-2.5 w-32">ผู้ขอรับบริการ</th>
                <th className="p-2.5 w-24 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    ไม่มีบันทึกการขอใช้ทรัพยากรในช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-mono whitespace-nowrap">{toThaiDateString(item.startAt)}</td>
                    <td className="p-2.5 font-mono whitespace-nowrap">
                      {toThaiTimeString(item.startAt)} - {toThaiTimeString(item.endAt)}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white print:text-black">
                      {item.resource?.name || "-"}
                      <span className="text-[10px] text-slate-400 font-mono block">
                        ({item.consumerModule === "MEETING_ROOM" ? "ห้องประชุม" : "ยานพาหนะ"})
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium line-clamp-1">{item.title}</div>
                      {item.purpose && (
                        <div className="text-[10.5px] text-slate-500 line-clamp-1">{item.purpose}</div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium">{item.reservedByUser?.name || "-"}</div>
                      <div className="text-[10px] text-slate-400">{item.department || "คณะครู"}</div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        item.status === "COMPLETED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                          : item.status === "APPROVED" || item.status === "IN_USE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                          : item.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Block (For Government Endorsement) */}
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-700 dark:text-slate-300 print:text-black">
          <div className="space-y-12">
            <div>ลงชื่อ..........................................................</div>
            <div>
              <div className="font-semibold">(..........................................................)</div>
              <div className="text-[11px] text-slate-500">เจ้าหน้าที่บันทึกสถิติข้อมูล</div>
            </div>
          </div>

          <div className="space-y-12">
            <div>ลงชื่อ..........................................................</div>
            <div>
              <div className="font-semibold">(..........................................................)</div>
              <div className="text-[11px] text-slate-500">หัวหน้างานสถานที่และยานพาหนะ</div>
            </div>
          </div>

          <div className="space-y-12">
            <div>ลงชื่อ..........................................................</div>
            <div>
              <div className="font-semibold">(..........................................................)</div>
              <div className="text-[11px] text-slate-500">ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
