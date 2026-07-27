"use client";

import React, { useMemo } from "react";
import { SupervisionStatus, SupervisionType } from "@prisma/client";

export interface MatrixSessionItem {
  id: string;
  dayOfWeek: number;
  periodNumber: number;
  subjectCode: string;
  teacherName: string;
  gradeLevel: string;
  status: SupervisionStatus;
  type: SupervisionType;
}

interface SupervisionMatrixGridProps {
  sessions: MatrixSessionItem[];
  onSelectSession: (sessionId: string) => void;
}

const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function SupervisionMatrixGrid({ sessions, onSelectSession }: SupervisionMatrixGridProps) {
  // 💡 สร้าง HashMap สำหรับ Lookup $O(1)$ แทนการใข้ sessions.find() ใน Nested Loop
  const sessionMap = useMemo(() => {
    const map = new Map<string, MatrixSessionItem>();
    for (const session of sessions) {
      map.set(`${session.dayOfWeek}_${session.periodNumber}`, session);
    }
    return map;
  }, [sessions]);

  const renderStatusBadge = (status: SupervisionStatus) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">นัดหมาย</span>;
      case "WAITING_TEACHER_ACK":
        return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">รอครูรับทราบ</span>;
      case "WAITING_DIRECTOR_SIGN":
        return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium">รอ ผอ. ลงนาม</span>;
      case "COMPLETED":
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-medium">เสร็จสมบูรณ์</span>;
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
          <tr>
            <th className="p-3 border-r w-24 text-center">วัน / คาบ</th>
            {PERIODS.map((p) => (
              <th key={p} className="p-3 border-r text-center min-w-[130px]">
                คาบที่ {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {DAYS.map((dayName, dayIndex) => {
            const dayNum = dayIndex + 1;
            return (
              <tr key={dayNum} className="hover:bg-gray-50/50">
                <td className="p-3 border-r font-bold text-gray-900 bg-gray-50/30 text-center">
                  {dayName}
                </td>
                {PERIODS.map((periodNum) => {
                  // 🚀 O(1) Lookup
                  const session = sessionMap.get(`${dayNum}_${periodNum}`);

                  return (
                    <td key={periodNum} className="p-2 border-r align-top h-28">
                      {session ? (
                        <div
                          onClick={() => onSelectSession(session.id)}
                          className="h-full p-2.5 rounded-lg border border-gray-200 bg-white shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1 mb-1">
                              <span className="font-bold text-gray-900 text-xs">{session.subjectCode}</span>
                              {session.type === "ONLINE_VIDEO" && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-mono">
                                  VIDEO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 font-medium truncate">{session.teacherName}</p>
                            <p className="text-[11px] text-gray-500">{session.gradeLevel}</p>
                          </div>
                          <div className="mt-2">{renderStatusBadge(session.status)}</div>
                        </div>
                      ) : (
                        <div className="h-full rounded-lg border border-dashed border-gray-100 flex items-center justify-center text-gray-300 text-xs">
                          ว่าง
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
