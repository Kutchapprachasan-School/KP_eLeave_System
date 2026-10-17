"use client";

import React from "react";
import {
  X,
  CheckCircle,
  FileText,
  UserCheck,
  Calendar,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";
import type { LeaveQueueItem } from "./ExecutiveApprovalQueue";

interface ExecutiveLeaveDetailModalProps {
  isOpen: boolean;
  leave: LeaveQueueItem | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  canApprove?: boolean;
}

export default function ExecutiveLeaveDetailModal({
  isOpen,
  leave,
  onClose,
  onApprove,
  onReject,
  canApprove = true,
}: ExecutiveLeaveDetailModalProps) {
  if (!isOpen || !leave) return null;

  const isPending =
    leave.status === "PENDING" ||
    leave.status === "PENDING_HEAD" ||
    leave.status === "PENDING_EXEC";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs overflow-hidden">
              {leave.userImage ? (
                <img
                  src={leave.userImage}
                  alt={leave.staffName}
                  className="w-full h-full object-cover"
                />
              ) : (
                leave.staffName.slice(0, 1)
              )}
            </div>
            <div>
              <h3 className="font-bold text-[#163A66] text-sm sm:text-base">
                รายละเอียดคำขอลา • {leave.staffName}
              </h3>
              <p className="text-xs text-slate-500">
                รหัสคำขอ: {leave.id} • ยื่นเมื่อ {leave.createdAt}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">สถานะคำขอ:</span>
              {isPending && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  รอการพิจารณาอนุมัติ
                </span>
              )}
              {leave.status === "APPROVED" && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  อนุมัติเรียบร้อยแล้ว
                </span>
              )}
              {leave.status === "REJECTED" && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  ไม่อนุมัติคำขอ
                </span>
              )}
            </div>
            <span className="text-slate-400">กลุ่มสาระฯ: {leave.department}</span>
          </div>

          {/* Leave Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
            <div>
              <span className="text-slate-400 block text-[11px]">ประเภทการลา:</span>
              <span className="font-bold text-[#163A66] text-sm">
                {leave.leaveType}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">จำนวนวันลา:</span>
              <span className="font-bold text-[#163A66] text-sm">
                {leave.totalDays} วันทำการ
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 block text-[11px]">ช่วงวันที่ลา:</span>
              <span className="font-semibold text-slate-800">
                {leave.startDate} ถึง {leave.endDate}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="text-slate-500 font-semibold block mb-1">
              เหตุผลความจำเป็นในการลา:
            </span>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {leave.reason || "ไม่ได้ระบุเหตุผลเพิ่มเติม"}
            </p>
          </div>

          {/* Proxy Teaching Assignment */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>การจัดครูสอนแทนประจำคาบเรียน</span>
            </div>
            {leave.hasProxyTeacher ? (
              <div className="text-emerald-700 text-xs">
                จัดครูสอนแทนเรียบร้อยแล้ว:{" "}
                <strong className="text-emerald-900">
                  {leave.proxyTeacherName || "มีรายชื่อในคำขอ"}
                </strong>
              </div>
            ) : (
              <span className="text-slate-500 text-xs">
                ไม่มีคาบสอนที่ต้องจัดสอนแทนในระหว่างวันลา
              </span>
            )}
          </div>

          {/* Workflow Stage Tracker: Head HR & Director Approval Tracking */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                ขั้นตอนการพิจารณาอนุมัติคำขอลา:
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {leave.status === "PENDING_HEAD"
                  ? "ขั้นตอนที่ 1/2"
                  : leave.status === "PENDING_EXEC"
                  ? "ขั้นตอนที่ 2/2"
                  : "เสร็จสิ้นขั้นตอน"}
              </span>
            </div>

            {/* Step 1: Head of Dept / HR Head */}
            <div className={`p-3 rounded-xl border transition-all ${
              leave.status === "PENDING_EXEC" || leave.status === "APPROVED" || Boolean(leave.rawRequest?.headApprovedAt)
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : leave.status === "PENDING_HEAD"
                ? "bg-amber-50/70 border-amber-200 text-amber-900"
                : "bg-slate-100/60 border-slate-200 text-slate-600"
            }`}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  {leave.status === "PENDING_EXEC" || leave.status === "APPROVED" || Boolean(leave.rawRequest?.headApprovedAt) ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : leave.status === "PENDING_HEAD" ? (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">
                      1. การตรวจสอบของหัวหน้ากลุ่มสาระฯ / หัวหน้างานบุคคล
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border">
                      {leave.status === "PENDING_EXEC" || leave.status === "APPROVED" || Boolean(leave.rawRequest?.headApprovedAt)
                        ? "✓ ผ่านการตรวจสอบแล้ว"
                        : leave.status === "PENDING_HEAD"
                        ? "⏳ รอการตรวจสอบ"
                        : "รอดำเนินการ"}
                    </span>
                  </div>
                  {leave.rawRequest?.headApproverSnapshot?.name ? (
                    <div className="mt-1 text-[11px] text-slate-700 space-y-0.5">
                      <p>
                        ผู้ตรวจสอบ: <strong className="text-slate-900">{leave.rawRequest.headApproverSnapshot.name}</strong>
                        {leave.rawRequest.headApproverSnapshot.dutyType ? ` (${leave.rawRequest.headApproverSnapshot.dutyType === "HR_HEAD" ? "หัวหน้างานบุคคล" : "หัวหน้ากลุ่มสาระฯ"})` : ""}
                      </p>
                      {leave.rawRequest.headApprovedAt && (
                        <p className="text-slate-500 text-[10px]">
                          วันที่ตรวจสอบ: {new Date(leave.rawRequest.headApprovedAt).toLocaleString("th-TH")}
                        </p>
                      )}
                    </div>
                  ) : leave.status === "PENDING_HEAD" ? (
                    <p className="mt-1 text-[11px] text-amber-700">
                      อยู่ระหว่างรอหัวหน้ากลุ่มสาระฯ หรือหัวหน้างานบุคคลทำการตรวจสอบความถูกต้องของเอกสาร
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Step 2: Director Final Signing */}
            <div className={`p-3 rounded-xl border transition-all ${
              leave.status === "APPROVED"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : leave.status === "PENDING_EXEC"
                ? "bg-blue-50/70 border-blue-200 text-blue-900"
                : "bg-slate-100/60 border-slate-200 text-slate-600"
            }`}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  {leave.status === "APPROVED" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : leave.status === "PENDING_EXEC" ? (
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">
                      2. การพิจารณาลงนามของผู้อำนวยการสถานศึกษา
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border">
                      {leave.status === "APPROVED"
                        ? "✓ อนุมัติแล้ว"
                        : leave.status === "PENDING_EXEC"
                        ? "⏳ รอ ผอ. ลงนาม"
                        : "รอดำเนินการ"}
                    </span>
                  </div>
                  {leave.status === "PENDING_EXEC" && (
                    <p className="mt-1 text-[11px] text-blue-700">
                      ผ่านการตรวจสอบของหัวหน้างานบุคคลแล้ว กำลังรอผู้อำนวยการสถานศึกษาลงนามอนุมัติ
                    </p>
                  )}
                  {leave.rawRequest?.execApprovedAt && (
                    <p className="mt-1 text-slate-500 text-[10px]">
                      ผู้อำนวยการลงนามเมื่อ: {new Date(leave.rawRequest.execApprovedAt).toLocaleString("th-TH")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          {isPending && (
            canApprove ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReject(leave.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ไม่อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApprove(leave.id);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>อนุมัติคำขอ</span>
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80">
                โหมดผู้ดูแลระบบ: ตรวจสอบและติดตามขั้นตอน (ไม่มีอำนาจอนุมัติ)
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
