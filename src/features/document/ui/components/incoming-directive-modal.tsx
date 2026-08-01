"use client";

import React, { useState } from "react";
import { submitDocumentAction, submitExecutiveDirectiveAction } from "../actions/incoming-actions";

interface IncomingDirectiveModalProps {
  documentId: string;
  routingId?: string;
  userId: string;
  mode: "DIRECTIVE" | "REPORT";
  staffList?: { id: string; name: string; position?: string }[];
  isOpen: boolean;
  onClose: () => void;
}

const STANDARD_DIRECTIVES = [
  "ทราบและถือปฏิบัติ",
  "มอบงานวิชาการดำเนินการ",
  "มอบงานบริหารทั่วไปดำเนินการ",
  "มอบงานบุคคลดำเนินการ",
  "มอบงานงบประมาณดำเนินการ",
  "แจ้งผู้เกี่ยวข้องทราบและดำเนินการ",
];

export function IncomingDirectiveModal({
  documentId,
  routingId,
  userId,
  mode,
  staffList = [],
  isOpen,
  onClose,
}: IncomingDirectiveModalProps) {
  const [reportText, setReportText] = useState("");
  const [standardDirective, setStandardDirective] = useState(STANDARD_DIRECTIVES[0]);
  const [directiveText, setDirectiveText] = useState("");
  const [assigneeId, setAssigneeId] = useState(staffList[0]?.id || "");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "REPORT") {
      if (!routingId) return;
      const res = await submitDocumentAction({
        routingId,
        userId,
        documentId,
        actionReport: reportText,
      });

      setLoading(false);
      if (res.success) {
        onClose();
      } else {
        alert(`เกิดข้อผิดพลาด: ${res.error}`);
      }
    } else {
      const selectedStaff = staffList.find(s => s.id === assigneeId);
      const assigneeName = selectedStaff ? `${selectedStaff.name} (${selectedStaff.position || 'ครู'})` : "กลุ่มสาระ/ครูผู้รับผิดชอบ";

      const res = await submitExecutiveDirectiveAction({
        incomingDocId: documentId,
        assigneeId: assigneeId || userId,
        assigneeName,
        standardDirective,
        directiveText,
        dueDate,
      });

      setLoading(false);
      if (res.success) {
        onClose();
      } else {
        alert(`เกิดข้อผิดพลาด: ${res.error}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {mode === "DIRECTIVE" ? "✍️ เกษียณหนังสือ & สั่งการมอบหมาย" : "📝 รับทราบ / รายงานผลการปฏิบัติงาน"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === "DIRECTIVE" ? (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ข้อสั่งการมาตรฐาน
                </label>
                <select
                  value={standardDirective}
                  onChange={(e) => setStandardDirective(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20"
                >
                  {STANDARD_DIRECTIVES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ข้อความสั่งการเพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  placeholder="กรอกรายละเอียดสั่งการเพิ่มเติม..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ผู้รับผิดชอบ / กลุ่มสาระ
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.position || 'ครู'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    วันครบกำหนด (Due Date)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                สรุปผลการดำเนินการ (ถ้ามี)
              </label>
              <textarea
                rows={4}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="กรอกรายละเอียดการรายงานผลการปฏิบัติงาน..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
            >
              {loading ? "กำลังบันทึก..." : mode === "DIRECTIVE" ? "ยืนยันส่งคำสั่งการ" : "ยืนยันรับทราบ/รายงานผล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
