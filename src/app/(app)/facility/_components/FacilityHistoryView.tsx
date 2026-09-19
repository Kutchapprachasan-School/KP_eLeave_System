"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  RefreshCw,
  AlertCircle,
  Plus,
  Building,
  Bus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { cancelFacilityReservationAction } from "@/app/actions/facility";
import {
  toThaiDateString,
  toThaiTimeString
} from "./facility-shared";
import {
  StatusPillBadge,
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter
} from "@/components/shared-ui/school-ops";

interface FacilityHistoryViewProps {
  myReservations: any[];
  onRefresh: () => void;
  onNavigateToRequest?: () => void;
}

export default function FacilityHistoryView({
  myReservations,
  onRefresh,
  onNavigateToRequest
}: FacilityHistoryViewProps) {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    return myReservations.filter((res) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && res.status !== "PENDING") return false;
        if (statusFilter === "APPROVED" && res.status !== "APPROVED" && res.status !== "IN_USE") return false;
        if (statusFilter === "CANCELLED" && res.status !== "CANCELLED" && res.status !== "REJECTED") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          res.title?.toLowerCase().includes(q) ||
          res.bookingNumber?.toLowerCase().includes(q) ||
          res.resource?.name?.toLowerCase().includes(q) ||
          res.vehicleDetails?.destination?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myReservations, statusFilter, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      const res = await cancelFacilityReservationAction(cancelTarget.id);
      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการยกเลิกคำขอ");
        return;
      }
      showToast("success", "ยกเลิกคำขอจองเรียบร้อยแล้ว");
      setCancelTarget(null);
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาดในการยกเลิกคำขอ");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ประวัติและสถานะคำขอจองของฉัน ({myReservations.length} รายการ)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ติดตามสถานะการพิจารณา พิมพ์ใบขอใช้ทรัพยากรขนาด A4 หรือยกเลิกคำขอที่ยังอยู่ระหว่างรออนุมัติ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToRequest && (
            <button
              onClick={onNavigateToRequest}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" /> ยื่นคำขอจองใหม่
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "ALL", label: "ทั้งหมด" },
            { key: "PENDING", label: "รอพิจารณา" },
            { key: "APPROVED", label: "อนุมัติแล้ว" },
            { key: "CANCELLED", label: "ยกเลิก / ปฏิเสธ" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อภารกิจ, รหัสการจอง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Booking List as Table */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold">ไม่พบรายการคำขอจองตามเงื่อนไขที่เลือก</p>
          {onNavigateToRequest && (
            <button
              onClick={onNavigateToRequest}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เริ่มต้นยื่นคำขอจองแรกของคุณ
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <th className="p-3.5 font-mono">รหัสคำขอ</th>
                  <th className="p-3.5">ประเภท</th>
                  <th className="p-3.5">ภารกิจ / ชื่องาน</th>
                  <th className="p-3.5">ทรัพยากร</th>
                  <th className="p-3.5">วันเวลาใช้งาน</th>
                  <th className="p-3.5 text-center">สถานะ</th>
                  <th className="p-3.5 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((res) => {
                  const isRoom = res.consumerModule === "MEETING_ROOM";

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      {/* Booking Number */}
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div>{res.bookingNumber || "KP-FACILITY"}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {toThaiDateString(res.createdAt)}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isRoom
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}>
                          {isRoom ? <Building className="w-3 h-3" /> : <Bus className="w-3 h-3" />}
                          {isRoom ? "ห้องประชุม" : "รถโรงเรียน"}
                        </span>
                      </td>

                      {/* Title & Details */}
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-[240px]">
                        <div className="truncate" title={res.title}>{res.title}</div>
                        {res.rejectionReason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                            เหตุผลปฏิเสธ: {res.rejectionReason}
                          </div>
                        )}
                        {!isRoom && res.vehicleDetails?.destination && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {res.vehicleDetails.destination}
                          </div>
                        )}
                      </td>

                      {/* Resource */}
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{res.resource?.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">({res.resource?.code})</span>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>{toThaiDateString(res.startAt)}</div>
                        <div className="text-[10px] text-slate-400">{toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)}</div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <StatusPillBadge
                          status={res.status}
                          label={
                            res.status === "APPROVED" ? "อนุมัติแล้ว" :
                            res.status === "PENDING" && res.currentStep === 1 ? "รอตรวจสอบจัดสรร (Step 1/2)" :
                            res.status === "PENDING" && res.currentStep === 2 ? "รอ ผอ.อนุมัติ (Step 2/2)" :
                            res.status === "CANCELLED" ? "ยกเลิกแล้ว" :
                            res.status === "REJECTED" ? "ไม่อนุมัติ / ปฏิเสธ" :
                            res.status === "IN_USE" ? "กำลังใช้งาน" :
                            res.status === "COMPLETED" ? "เสร็จสิ้นภารกิจ" : undefined
                          }
                          size="sm"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={isRoom ? `/print/facility/room/${res.id}` : `/print/facility/vehicle/${res.id}`}
                            target="_blank"
                            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                            title="พิมพ์แบบฟอร์ม A4"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="hidden sm:inline">พิมพ์ A4</span>
                          </Link>

                          {res.status === "PENDING" && (
                            <button
                              onClick={() => setCancelTarget(res)}
                              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                              title="ยกเลิกคำขอ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ยกเลิก</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <UnifiedModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        size="sm"
      >
        <UnifiedModalHeader
          title="ยืนยันการยกเลิกคำขอ"
          subtitle={`รหัสการจอง: ${cancelTarget?.bookingNumber || "-"}`}
          icon={AlertCircle}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
          onClose={() => setCancelTarget(null)}
        />
        <UnifiedModalBody>
          {cancelTarget && (
            <p className="text-slate-600 dark:text-slate-300 text-xs text-center py-2 leading-relaxed">
              ท่านต้องการยกเลิกคำขอจอง &ldquo;<strong>{cancelTarget.title}</strong>&rdquo; ({cancelTarget.bookingNumber}) ใช่หรือไม่?
            </p>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setCancelTarget(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={cancelling}
            onClick={handleConfirmCancel}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {cancelling ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>
    </div>
  );
}
