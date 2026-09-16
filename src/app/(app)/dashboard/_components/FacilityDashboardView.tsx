"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Bus,
  Building,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import {
  getFacilityResourcesAction,
  getFacilityReservationsAction
} from "@/app/actions/facility";
import { toThaiDateString, toThaiTimeString } from "@/app/(app)/facility/_components/facility-shared";

export default function FacilityDashboardView() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resList, allBookings] = await Promise.all([
        getFacilityResourcesAction().catch(() => []),
        getFacilityReservationsAction().catch(() => [])
      ]);
      setResources(resList || []);
      setReservations(allBookings || []);
    } catch (err) {
      console.error("Failed to load facility dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRooms = resources.filter((r) => r.type === "MEETING_ROOM").length;
  const totalVehicles = resources.filter((r) => r.type === "VEHICLE").length;
  const pendingCount = reservations.filter((r) => r.status === "PENDING").length;
  const approvedCount = reservations.filter((r) => r.status === "APPROVED" || r.status === "IN_USE").length;
  const completedCount = reservations.filter((r) => r.status === "COMPLETED").length;

  // Bookings today
  const todayStr = new Date().toISOString().split("T")[0];
  const todayReservations = reservations.filter((r) => {
    const startStr = new Date(r.startAt).toISOString().split("T")[0];
    const endStr = new Date(r.endAt).toISOString().split("T")[0];
    return startStr <= todayStr && todayStr <= endStr;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ห้องประชุมทั้งหมด</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {loading ? "..." : totalRooms} <span className="text-xs font-normal text-slate-400">ห้อง</span>
          </div>
          <div className="text-[11px] text-slate-400">พร้อมรองรับการจัดประชุม & อบรม</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>รถโรงเรียนทั้งหมด</span>
            <Bus className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {loading ? "..." : totalVehicles} <span className="text-xs font-normal text-slate-400">คัน</span>
          </div>
          <div className="text-[11px] text-slate-400">พร้อมให้บริการไปราชการ & กิจกรรม</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>คำขอรออนุมัติ</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {loading ? "..." : pendingCount} <span className="text-xs font-normal text-slate-400">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-400">อยู่ระหว่างการตรวจสอบ 2 ขั้นตอน</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ภารกิจอนุมัติ / สำเร็จแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {loading ? "..." : approvedCount + completedCount} <span className="text-xs font-normal text-slate-400">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-400">เสร็จสมบูรณ์ {completedCount} ภารกิจ</div>
        </div>
      </div>

      {/* 2. Today's Bookings and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              การใช้ทรัพยากรวันนี้ ({todayReservations.length} รายการ)
            </h2>
            <Link
              href="/general/facility"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
            >
              ดูปฏิทินรวม <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">กำลังโหลด...</div>
          ) : todayReservations.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 italic">
              วันนี้ยังไม่มีคิวขอใช้ห้องประชุมหรือรถโรงเรียน
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayReservations.map((res) => {
                const isRoom = res.consumerModule === "MEETING_ROOM";
                return (
                  <div
                    key={res.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isRoom ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}>
                        {isRoom ? <Building className="w-4 h-4" /> : <Bus className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{res.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {res.resource?.name} • ผู้ขอ: {res.reservedByUser?.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-slate-600 dark:text-slate-300 font-medium">
                        {toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)}
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        res.status === "APPROVED" || res.status === "IN_USE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      }`}>
                        {res.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links & Resources Health (1 col) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">ทางลัดระบบทรัพยากรส่วนกลาง</h2>
            <div className="space-y-2">
              <Link
                href="/general/facility"
                className="w-full p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200 font-semibold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>ปฏิทิน & ยื่นจองทรัพยากร</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/general/facility/reports"
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>รายงานสถิติราชการ 4 มิติ</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/general/facility?view=history"
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>ประวัติคำขอของฉัน</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
