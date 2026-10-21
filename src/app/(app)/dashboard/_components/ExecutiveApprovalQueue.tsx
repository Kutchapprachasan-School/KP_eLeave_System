"use client";

import React, { useState } from "react";
import {
  Clock,
  Eye,
  Check,
  X,
  FileCheck,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface LeaveQueueItem {
  id: string;
  userId?: string;
  staffName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  hasProxyTeacher: boolean;
  proxyTeacherName?: string;
  createdAt: string;
  userImage?: string | null;
  headApproverName?: string;
  headApprovedAt?: string;
  rawRequest?: any;
}

interface ExecutiveApprovalQueueProps {
  leaves: LeaveQueueItem[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onViewDetails: (leave: LeaveQueueItem) => void;
  actionLoadingId?: string | null;
  canApprove?: boolean;
}

export default function ExecutiveApprovalQueue({
  leaves,
  onApprove,
  onReject,
  onViewDetails,
  actionLoadingId,
  canApprove = true,
}: ExecutiveApprovalQueueProps) {
  const [activeTab, setActiveTab] = useState<"PENDING" | "ALL">("PENDING");

  const displayedLeaves =
    activeTab === "PENDING"
      ? leaves.filter(
          (l) =>
            l.status === "PENDING" ||
            l.status === "PENDING_HEAD" ||
            l.status === "PENDING_EXEC"
        )
      : leaves;

  const pendingCount = leaves.filter(
    (l) =>
      l.status === "PENDING" ||
      l.status === "PENDING_HEAD" ||
      l.status === "PENDING_EXEC"
  ).length;

  const getLeaveTypeBadgeClass = (type: string) => {
    if (type.includes("ป่วย") || type === "SICK") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (type.includes("กิจ") || type === "PERSONAL") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (type.includes("พักผ่อน") || type === "VACATION") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (type.includes("คลอด") || type === "MATERNITY") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const formatLeaveTypeName = (type: string) => {
    if (type === "SICK") return "ลาป่วย";
    if (type === "PERSONAL") return "ลากิจส่วนตัว";
    if (type === "VACATION") return "ลาพักผ่อน";
    if (type === "MATERNITY") return "ลาคลอดบุตร";
    if (type === "ORDINATION") return "ลาอุปสมบท";
    if (type === "MILITARY") return "ลารับราชการทหาร";
    return type;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E6EEF7] shadow-[0_4px_16px_rgba(40,90,140,0.06)] p-4 sm:p-6 select-none">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#163A66] text-base sm:text-lg">
              รายการคำขอลาของบุคลากร (Approval Queue)
            </h3>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs">
                รออนุมัติ {pendingCount}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            พิจารณาอนุมัติคำขอลาและตรวจสอบการจัดครูสอนแทนประจำคาบ
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-white text-[#163A66] font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            รอดำเนินการ ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white text-[#163A66] font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ทั้งหมด ({leaves.length})
          </button>
        </div>
      </div>

      {/* Main Table View (Desktop) & Cards (Mobile) */}
      <div className="mt-4">
        {displayedLeaves.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 stroke-1" />
            <p className="font-semibold text-slate-600">ไม่มีคำขอลาที่ต้องพิจารณาในขณะนี้</p>
            <p className="text-slate-400 mt-0.5">คำขอลาทั้งหมดได้รับการอนุมัติเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <>
            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="pb-3 pl-2">บุคลากร / ตำแหน่ง</th>
                    <th className="pb-3">ประเภทการลา</th>
                    <th className="pb-3">ช่วงวันที่ลา</th>
                    <th className="pb-3 text-center">จำนวนวัน</th>
                    <th className="pb-3">ครูสอนแทน</th>
                    <th className="pb-3 text-center">สถานะ</th>
                    <th className="pb-3 pr-2 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedLeaves.map((leave) => {
                    const isPending =
                      leave.status === "PENDING" ||
                      leave.status === "PENDING_HEAD" ||
                      leave.status === "PENDING_EXEC";
                    const isCompleted = leave.status === "APPROVED";
                    const isRejected = leave.status === "REJECTED";
                    const isBusy = actionLoadingId === leave.id;

                    return (
                      <tr
                        key={leave.id}
                        className={`transition-colors ${
                          isPending
                            ? "hover:bg-amber-50/20 bg-white"
                            : "hover:bg-slate-50/40 bg-slate-50/20 text-slate-500"
                        }`}
                      >
                        {/* 1. Identity */}
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
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
                              <div
                                className={`font-semibold ${
                                  isPending ? "text-[#163A66]" : "text-slate-600"
                                }`}
                              >
                                {leave.staffName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {leave.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Leave Type */}
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getLeaveTypeBadgeClass(
                              leave.leaveType
                            )}`}
                          >
                            {formatLeaveTypeName(leave.leaveType)}
                          </span>
                        </td>

                        {/* 3. Date Range */}
                        <td className="py-3.5">
                          <div className="font-medium text-slate-700">
                            {leave.startDate} ถึง {leave.endDate}
                          </div>
                        </td>

                        {/* 4. Days */}
                        <td className="py-3.5 text-center">
                          <span
                            className={`font-bold ${
                              isPending ? "text-[#163A66]" : "text-slate-500"
                            }`}
                          >
                            {leave.totalDays}
                          </span>
                          <span className="text-xs text-slate-400 ml-0.5">วัน</span>
                        </td>

                        {/* 5. Proxy Teacher */}
                        <td className="py-3.5">
                          {leave.hasProxyTeacher ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{leave.proxyTeacherName || "จัดสอนแทนแล้ว"}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 6. Status Badge */}
                        <td className="py-3.5 text-center">
                          {leave.status === "PENDING_HEAD" && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                รอหัวหน้าบุคคล (1/2)
                              </span>
                              <span className="text-[10px] text-slate-400">รอตรวจขั้นแรก</span>
                            </div>
                          )}
                          {leave.status === "PENDING_EXEC" && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                ผ่านหัวหน้าแล้ว (2/2)
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]" title={leave.headApproverName || leave.rawRequest?.headApproverSnapshot?.name ? `หัวหน้าบุคคลที่ตรวจ: ${leave.headApproverName || leave.rawRequest?.headApproverSnapshot?.name}` : "รอ ผอ. ลงนาม"}>
                                {leave.headApproverName || leave.rawRequest?.headApproverSnapshot?.name ? `ตรวจ: ${leave.headApproverName || leave.rawRequest?.headApproverSnapshot?.name}` : "รอ ผอ. ลงนาม"}
                              </span>
                            </div>
                          )}
                          {isPending && leave.status !== "PENDING_HEAD" && leave.status !== "PENDING_EXEC" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                              <Clock className="w-3.5 h-3.5" />
                              รออนุมัติ
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                              <Check className="w-3.5 h-3.5" />
                              อนุมัติแล้ว
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                              <X className="w-3.5 h-3.5" />
                              ไม่อนุมัติ
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onViewDetails(leave)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="ดูรายละเอียดใบลา"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>รายละเอียด</span>
                            </button>

                            {isPending && (
                              canApprove ? (
                                leave.status === "PENDING_HEAD" ? (
                                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                    รอหัวหน้าบุคคลตรวจ
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => onApprove(leave.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>อนุมัติ</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => onReject(leave.id)}
                                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                                      title="ไม่อนุมัติคำขอ"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )
                              ) : (
                                <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200" title="โหมดผู้ดูแลระบบ: ตรวจสอบและติดตามขั้นตอนเท่านั้น">
                                  โหมดตรวจดู
                                </span>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Rule 08/09: No Horizontal Scroll on Mobile) */}
            <div className="md:hidden space-y-3">
              {displayedLeaves.map((leave) => {
                const isPending =
                  leave.status === "PENDING" ||
                  leave.status === "PENDING_HEAD" ||
                  leave.status === "PENDING_EXEC";
                const isCompleted = leave.status === "APPROVED";
                const isRejected = leave.status === "REJECTED";
                const isBusy = actionLoadingId === leave.id;

                return (
                  <div
                    key={leave.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isPending
                        ? "bg-white border-amber-200 shadow-2xs"
                        : "bg-slate-50/50 border-slate-200 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {leave.staffName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-[#163A66] text-xs">
                            {leave.staffName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {leave.department}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold text-xs border ${getLeaveTypeBadgeClass(
                          leave.leaveType
                        )}`}
                      >
                        {formatLeaveTypeName(leave.leaveType)}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">ช่วงวันที่:</span>
                        <span className="font-medium text-slate-700">
                          {leave.startDate} - {leave.endDate}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">รวม:</span>
                        <span className="font-bold text-[#163A66]">
                          {leave.totalDays} วัน
                        </span>
                      </div>
                    </div>

                    {leave.hasProxyTeacher && (
                      <div className="mt-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>ครูสอนแทน: {leave.proxyTeacherName || "จัดสอนแทนแล้ว"}</span>
                      </div>
                    )}

                    {/* Workflow Stage Tracker */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-400">สถานะขั้นตอน:</span>
                      {leave.status === "PENDING_HEAD" ? (
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> รอหัวหน้าบุคคลพิจารณา (1/2)
                        </span>
                      ) : leave.status === "PENDING_EXEC" ? (
                        <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1" title={leave.headApproverName || leave.rawRequest?.headApproverSnapshot?.name ? `หัวหน้าบุคคลที่ตรวจ: ${leave.headApproverName || leave.rawRequest?.headApproverSnapshot?.name}` : undefined}>
                          <CheckCircle2 className="w-3 h-3 text-blue-600" /> ผ่านหัวหน้าแล้ว • รอ ผอ. (2/2)
                        </span>
                      ) : isCompleted ? (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          อนุมัติแล้ว
                        </span>
                      ) : isRejected ? (
                        <span className="font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          ไม่อนุมัติ
                        </span>
                      ) : (
                        <span className="font-bold text-slate-600">{leave.status}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onViewDetails(leave)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold flex-1 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูใบลา</span>
                      </button>

                      {isPending && (
                        canApprove ? (
                          leave.status === "PENDING_HEAD" ? (
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                              รอหัวหน้าบุคคลตรวจ
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => onApprove(leave.id)}
                                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex-1 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => onReject(leave.id)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 cursor-pointer disabled:opacity-50"
                                title="ไม่อนุมัติคำขอ"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-center">
                            โหมดตรวจดู
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
