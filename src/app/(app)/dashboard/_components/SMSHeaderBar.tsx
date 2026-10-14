"use client";

import React, { useState } from "react";
import {
  Search,
  Calendar,
  Bell,
  MessageSquare,
  ChevronDown,
  User,
  CheckCircle2,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface SMSHeaderBarProps {
  onSearch?: (term: string) => void;
}

export default function SMSHeaderBar({ onSearch }: SMSHeaderBarProps) {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("ภาคเรียนที่ 1/2568");
  const [termDropdownOpen, setTermDropdownOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);

  const displayName = currentUser?.name || "นายสมชาย ใจดี";
  const displayRole = currentUser?.position || "ผู้อำนวยการโรงเรียน";
  const avatarUrl = currentUser?.image;

  const terms = [
    "ภาคเรียนที่ 1/2568",
    "ภาคเรียนที่ 2/2567",
    "ภาคเรียนที่ 1/2567",
    "ปีการศึกษา 2568 (ทั้งปี)",
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-transparent pb-1">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-xl">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="ค้นหา (ชื่อนักเรียน, บุคลากร, เลขที่, หรือเมนูต่างๆ)..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Controls: Term Selector, Notifications, Chat, Profile */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto">
        {/* Semester Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTermDropdownOpen(!termDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 shadow-xs transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedTerm}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {termDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              {terms.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTerm(t);
                    setTermDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium transition ${
                    selectedTerm === t
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon with Badge 3 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotiOpen(!notiOpen)}
            className="w-8.5 h-8.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs relative cursor-pointer"
            title="การแจ้งเตือน"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
              3
            </span>
          </button>

          {notiOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-white">
                <span>การแจ้งเตือนด่วน (3)</span>
                <span className="text-[10px] text-blue-600 cursor-pointer">อ่านทั้งหมด</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-[11px]">
                📢 มีคำขอลาใหม่ 3 ฉบับรอการอนุมัติ
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px]">
                📄 เอกสารรับเข้าใหม่ 2 เรื่องจาก สพม.
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-[11px]">
                ⚠️ งานแจ้งซ่อม IT ห้อง 302 เกินกำหนด SLA
              </div>
            </div>
          )}
        </div>

        {/* Chat / Messages Button */}
        <button
          type="button"
          className="w-8.5 h-8.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
          title="ข้อความระบบ"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Executive User Profile Pill */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
              {displayName}
            </div>
            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
              {displayRole}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
