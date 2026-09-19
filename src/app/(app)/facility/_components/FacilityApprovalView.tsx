"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  UserCheck,
  Check,
  AlertCircle,
  Clock,
  Calendar,
  Building,
  Bus,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  reviewFacilityReservationHeadAction,
  approveFacilityReservationDirectorAction,
  rejectFacilityReservationAction
} from "@/app/actions/facility";
import {
  toThaiDateString,
  toThaiTimeString,
  parseRoomConfig,
  ROOM_LAYOUT_LABELS
} from "./facility-shared";
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
  StatusPillBadge
} from "@/components/shared-ui/school-ops";

interface FacilityApprovalViewProps {
  reservations: any[];
  drivers: any[];
  onRefresh: () => void;
}

export default function FacilityApprovalView({
  reservations,
  drivers,
  onRefresh
}: FacilityApprovalViewProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"PENDING" | "PROCESSED">("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Step 1: Head Review Modal State
  const [reviewingReservation, setReviewingReservation] = useState<any>(null);
  const [reviewDriverId, setReviewDriverId] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  // Step 2: Director Final Approval Modal State
  const [directorApprovalTarget, setDirectorApprovalTarget] = useState<any>(null);
  const [directorComment, setDirectorComment] = useState("อนุมัติตามเสนอ");

  // Reject Modal State
  const [rejectingTarget, setRejectingTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const pendingList = useMemo(() => {
    return reservations.filter((r) => r.status === "PENDING");
  }, [reservations]);

  const processedList = useMemo(() => {
    return reservations.filter((r) => r.status !== "PENDING");
  }, [reservations]);

  const currentList = activeTab === "PENDING" ? pendingList : processedList;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase();
    return currentList.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.bookingNumber?.toLowerCase().includes(q) ||
        r.reservedByUser?.name?.toLowerCase().includes(q) ||
        r.resource?.name?.toLowerCase().includes(q)
    );
  }, [currentList, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Step 1 Submit
  const handleHeadReviewSubmit = async () => {
    if (!reviewingReservation) return;
    try {
      setSubmitting(true);
      const res = await reviewFacilityReservationHeadAction(reviewingReservation.id, {
        driverProfileId: reviewDriverId || undefined,
        comment: reviewComment.trim() || undefined
      });

      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการตรวจสอบจัดสรร");
        return;
      }

      showToast("success", "บันทึกผลการตรวจสอบจัดสรร (Step 1) และส่งต่อผู้อำนวยการเรียบร้อยแล้ว");
      setReviewingReservation(null);
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 Submit
  const handleDirectorApproveSubmit = async () => {
    if (!directorApprovalTarget) return;
    try {
      setSubmitting(true);
      const res = await approveFacilityReservationDirectorAction(directorApprovalTarget.id, {
        comment: directorComment.trim() || undefined
      });

      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการอนุมัติ");
        return;
      }

      showToast("success", "ผู้อำนวยการอนุมัติคำขอจองเรียบร้อยแล้ว (Step 2)");
      setDirectorApprovalTarget(null);
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  // Reject Submit
  const handleRejectSubmit = async () => {
    if (!rejectingTarget) return;
    if (!rejectionReason.trim()) {
      showToast("error", "กรุณาระบุเหตุผลในการไม่อนุมัติ/ปฏิเสธ");
      return;
    }

    try {
      setSubmitting(true);
      const res = await rejectFacilityReservationAction(rejectingTarget.id, rejectionReason.trim());

      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการปฏิเสธคำขอ");
        return;
      }

      showToast("success", "บันทึกการปฏิเสธคำขอเรียบร้อยแล้ว");
      setRejectingTarget(null);
      setRejectionReason("");
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ศูนย์พิจารณาอนุมัติคำขอจอง (Official 2-Tier Approval Hub)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            กระบวนการอนุมัติ 2 ระดับ: Step 1 หัวหน้างานตรวจสอบจัดสรร ➔ Step 2 ผู้อำนวยการอนุมัติขั้นสุดท้าย
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            รอการพิจารณา
            {pendingList.length > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("PROCESSED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "PROCESSED"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            ประวัติที่พิจารณาแล้ว ({processedList.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อภารกิจ, รหัส, ผู้ขอ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Approval List or Processed Table */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
          <p className="text-sm font-semibold">
            {activeTab === "PENDING"
              ? "ไม่มีรายการคำขอค้างรอการพิจารณาในขณะนี้"
              : "ไม่พบประวัติรายการที่พิจารณาแล้ว"}
          </p>
        </div>
      ) : activeTab === "PROCESSED" ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <th className="p-3.5 font-mono">รหัสคำขอ</th>
                  <th className="p-3.5">ประเภท</th>
                  <th className="p-3.5">ภารกิจ / ชื่องาน</th>
                  <th className="p-3.5">ทรัพยากร</th>
                  <th className="p-3.5">ผู้ขอใช้</th>
                  <th className="p-3.5">วันเวลาใช้งาน</th>
                  <th className="p-3.5 text-center">สถานะ</th>
                  <th className="p-3.5 text-center">เอกสาร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((res) => {
                  const isRoom = res.consumerModule === "MEETING_ROOM";
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {res.bookingNumber || "KP-FACILITY"}
                      </td>
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
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-[220px]">
                        <div className="truncate" title={res.title}>{res.title}</div>
                        {isRoom && res.roomDetails?.layoutType && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ผัง: {ROOM_LAYOUT_LABELS[res.roomDetails.layoutType] || res.roomDetails.layoutType}
                          </div>
                        )}
                        {!isRoom && res.vehicleDetails?.destination && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {res.vehicleDetails.destination}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{res.resource?.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">({res.resource?.code})</span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        <div>{res.reservedByUser?.name || "-"}</div>
                        <div className="text-[10px] text-slate-400">{res.department || "โรงเรียน"}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>{toThaiDateString(res.startAt)}</div>
                        <div className="text-[10px] text-slate-400">{toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)}</div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <StatusPillBadge
                          status={res.status}
                          label={
                            res.status === "APPROVED" ? "อนุมัติแล้ว" :
                            res.status === "CANCELLED" ? "ยกเลิกแล้ว" :
                            res.status === "REJECTED" ? "ไม่อนุมัติ / ปฏิเสธ" : undefined
                          }
                          size="sm"
                        />
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <a
                          href={isRoom ? `/print/facility/room/${res.id}` : `/print/facility/vehicle/${res.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
                          title="พิมพ์แบบฟอร์ม A4"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>ใบงาน A4</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((res) => {
            const isRoom = res.consumerModule === "MEETING_ROOM";
            const isStep1 = res.currentStep === 1;
            const isStep2 = res.currentStep === 2;

            return (
              <div
                key={res.id}
                className={`p-5 rounded-2xl border-2 transition space-y-3 ${
                  res.status === "PENDING"
                    ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/15"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20"
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {res.bookingNumber || "KP-FACILITY"}
                    </span>

                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      isRoom
                        ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                    }`}>
                      {isRoom ? <Building className="w-3 h-3" /> : <Bus className="w-3 h-3" />}
                      {isRoom ? "ห้องประชุม" : "รถโรงเรียน"}
                    </span>

                    <StatusPillBadge
                      status={res.status}
                      label={
                        res.status === "APPROVED" ? "อนุมัติแล้ว" :
                        res.status === "PENDING" && isStep1 ? "รอหัวหน้างานจัดสรร (Step 1/2)" :
                        res.status === "PENDING" && isStep2 ? "รอ ผอ.อนุมัติขั้นสุดท้าย (Step 2/2)" :
                        res.status === "CANCELLED" ? "ยกเลิกแล้ว" :
                        res.status === "REJECTED" ? "ไม่อนุมัติ / ปฏิเสธ" : undefined
                      }
                      size="sm"
                    />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ยื่นเมื่อ {toThaiDateString(res.createdAt)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">ชื่องาน / ภารกิจราชการ:</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{res.title}</p>
                    {res.purpose && <p className="text-slate-500 mt-1">{res.purpose}</p>}
                  </div>

                  <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                    <div>
                      <strong>ทรัพยากร:</strong> {res.resource?.name} ({res.resource?.code})
                    </div>
                    <div>
                      <strong>ผู้ขอใช้:</strong> {res.reservedByUser?.name} ({res.department || "โรงเรียน"})
                    </div>
                    <div>
                      <strong>ช่วงเวลา:</strong> {toThaiDateString(res.startAt)} ({toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)})
                    </div>
                    {res.vehicleDetails?.destination && (
                      <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                        <MapPin className="w-3 h-3" /> ปลายทาง: {res.vehicleDetails.destination}
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Layout & Equipment Setup Section */}
                {isRoom && (() => {
                  const roomConfig = parseRoomConfig(res.resource?.description);
                  const defaultLayout = roomConfig.defaultLayout || "THEATER";
                  const reqLayout = res.roomDetails?.layoutType || "THEATER";
                  const isModified = reqLayout !== defaultLayout;
                  const hasCustomLayoutNotes = Boolean(res.roomDetails?.layoutNotes?.trim());
                  const hasExtraEquipment = Boolean(res.roomDetails?.audioVisualNotes?.trim());

                  if (isModified || hasCustomLayoutNotes) {
                    return (
                      <div className="p-3 bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>⚠️ มีการปรับเปลี่ยนผังจัดห้องใหม่: {ROOM_LAYOUT_LABELS[reqLayout] || reqLayout}</span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-normal">
                            (มาตรฐานเดิม: {ROOM_LAYOUT_LABELS[defaultLayout] || "เธียเตอร์"})
                          </span>
                        </div>
                        {hasCustomLayoutNotes && (
                          <div className="text-xs text-amber-950 dark:text-amber-100 pl-5.5">
                            <strong>รายละเอียดผังที่ขอจัด:</strong> {res.roomDetails.layoutNotes}
                          </div>
                        )}
                        {hasExtraEquipment && (
                          <div className="text-xs text-amber-950 dark:text-amber-100 pl-5.5">
                            <strong>อุปกรณ์โสตฯ ที่ขอเพิ่มเติม:</strong> {res.roomDetails.audioVisualNotes}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>ผังห้อง: ตามมาตรฐานห้อง ({ROOM_LAYOUT_LABELS[defaultLayout] || "เธียเตอร์"})</span>
                      {res.roomDetails?.requireAirCon ? " • เปิดแอร์" : " • ไม่เปิดแอร์"}
                      {hasExtraEquipment && (
                        <span className="text-slate-600 dark:text-slate-300 ml-1">
                          (อุปกรณ์: {res.roomDetails.audioVisualNotes})
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Card Footer / Actions */}
                {res.status === "PENDING" && (
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {isStep1
                        ? "รอการตรวจสอบจัดสรรโดย: หัวหน้างานอาคารสถานที่ / หัวหน้างานยานพาหนะ"
                        : "รอการอนุมัติขั้นสุดท้ายโดย: ผู้อำนวยการโรงเรียน"}
                    </div>

                    <div className="flex items-center gap-2">
                      {isStep1 && (
                        <button
                          onClick={() => {
                            setReviewingReservation(res);
                            setReviewDriverId(res.vehicleDetails?.driverProfileId || "");
                            setReviewComment("");
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          ตรวจสอบจัดสรร (Step 1)
                        </button>
                      )}

                      {isStep2 && (
                        <button
                          onClick={() => {
                            setDirectorApprovalTarget(res);
                            setDirectorComment("อนุมัติตามเสนอ");
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ผู้อำนวยการอนุมัติ (Step 2)
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setRejectingTarget(res);
                          setRejectionReason("");
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
                      >
                        ไม่อนุมัติ / ปฏิเสธ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: STEP 1 REVIEW & DRIVER ASSIGNMENT */}
      <UnifiedModal
        isOpen={Boolean(reviewingReservation)}
        onClose={() => setReviewingReservation(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="จัดสรรและตรวจสอบคำขอ (Step 1 Review)"
          subtitle={`รหัสการจอง: ${reviewingReservation?.bookingNumber || "-"}`}
          icon={UserCheck}
          iconClass="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
          onClose={() => setReviewingReservation(null)}
        />
        <UnifiedModalBody>
          {reviewingReservation && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div><strong>ภารกิจ:</strong> {reviewingReservation.title}</div>
                <div><strong>ทรัพยากร:</strong> {reviewingReservation.resource?.name}</div>
                <div><strong>ผู้ขอใช้:</strong> {reviewingReservation.reservedByUser?.name}</div>
              </div>

              {reviewingReservation.consumerModule === "VEHICLE" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    มอบหมายพนักงานขับรถ
                  </label>
                  <select
                    value={reviewDriverId}
                    onChange={(e) => setReviewDriverId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="">-- เลือกพนักงานขับรถ --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name} (ใบอนุญาต: {d.licenseNumber || "-"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ความเห็นหัวหน้างาน / บันทึกการตรวจสอบ
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุข้อคิดเห็นในการตรวจสอบความพร้อมของสถานที่/ยานพาหนะ..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setReviewingReservation(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleHeadReviewSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันผลการจัดสรรและส่งต่อ ผอ."}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* MODAL: STEP 2 DIRECTOR APPROVAL */}
      <UnifiedModal
        isOpen={Boolean(directorApprovalTarget)}
        onClose={() => setDirectorApprovalTarget(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ผู้อำนวยการอนุมัติคำขอ (Step 2)"
          subtitle={`รหัสการจอง: ${directorApprovalTarget?.bookingNumber || "-"}`}
          icon={Check}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
          onClose={() => setDirectorApprovalTarget(null)}
        />
        <UnifiedModalBody>
          {directorApprovalTarget && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div><strong>ภารกิจ:</strong> {directorApprovalTarget.title}</div>
                <div><strong>ผู้ขอ:</strong> {directorApprovalTarget.reservedByUser?.name}</div>
                <div><strong>ทรัพยากร:</strong> {directorApprovalTarget.resource?.name}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ข้อคิดเห็นการอนุมัติ (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  value={directorComment}
                  onChange={(e) => setDirectorComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setDirectorApprovalTarget(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDirectorApproveSubmit}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันการอนุมัติ"}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* MODAL: REJECT DIALOG */}
      <UnifiedModal
        isOpen={Boolean(rejectingTarget)}
        onClose={() => setRejectingTarget(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ระบุเหตุผลการไม่อนุมัติ / ปฏิเสธคำขอ"
          subtitle={`รหัสการจอง: ${rejectingTarget?.bookingNumber || "-"}`}
          icon={AlertCircle}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
          onClose={() => setRejectingTarget(null)}
        />
        <UnifiedModalBody>
          {rejectingTarget && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div><strong>ภารกิจ:</strong> {rejectingTarget.title}</div>
                <div><strong>ผู้ขอ:</strong> {rejectingTarget.reservedByUser?.name}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เหตุผลในการไม่อนุมัติ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น ติดภารกิจราชการเร่งด่วนของโรงเรียน หรือยานพาหนะอยู่ระหว่างตรวจเช็คระยะ..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setRejectingTarget(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleRejectSubmit}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>
    </div>
  );
}
