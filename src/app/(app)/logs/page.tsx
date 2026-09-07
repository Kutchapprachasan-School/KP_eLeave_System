"use client";

import { useState, useEffect } from "react";
import { 
  getSystemLogsAction, 
  archiveSystemLogsAction, 
  getSystemLogArchivesAction, 
  restoreSystemLogArchiveAction 
} from "@/app/actions/logs";
import { pruneSystemLogs } from "@/app/actions/leave";
import { motion } from "framer-motion";
import { 
  FileText, Search, UserCheck, XCircle, PlusCircle, Settings2, 
  DownloadCloud, Archive, RotateCcw, Clock, Building2, Calendar, Wrench, Award, CheckCircle2,
  RefreshCw
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const SUBSYSTEM_CONFIGS: Record<string, { label: string; badgeCls: string; icon: any }> = {
  LEAVE: { label: "ระบบการลา", badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", icon: Calendar },
  ATTENDANCE: { label: "ลงเวลาปฏิบัติราชการ", badgeCls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300", icon: Clock },
  DOCUMENT: { label: "สารบรรณเอกสาร", badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", icon: FileText },
  REPAIR: { label: "ระบบแจ้งซ่อม", badgeCls: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", icon: Wrench },
  TIMETABLE: { label: "จัดตารางสอน & สอนแทน", badgeCls: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300", icon: Calendar },
  SUPERVISION: { label: "นิเทศการสอนออนไลน์", badgeCls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300", icon: CheckCircle2 },
  EXAM: { label: "จัดตารางสอบส่วนกลาง", badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", icon: FileText },
  FACILITY: { label: "จองทรัพยากรกลาง", badgeCls: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300", icon: Building2 },
  ACADEMIC: { label: "ตั้งค่าวิชาการ & PA", badgeCls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", icon: Award },
};

const ACTION_ICONS: Record<string, any> = {
  CREATE_LEAVE: { icon: PlusCircle, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  APPROVE_LEAVE: { icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  REJECT_LEAVE: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
  CANCEL_LEAVE: { icon: XCircle, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
  UPDATE_SETTINGS: { icon: Settings2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
  CLOCK_IN: { icon: Clock, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  CLOCK_OUT: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubsystem, setFilterSubsystem] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { t, lang } = useI18n();

  // Archive States
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archives, setArchives] = useState<any[]>([]);
  const [archiveMonth, setArchiveMonth] = useState(new Date().getMonth() + 1);
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear());
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    getSystemLogsAction({
      subsystem: filterSubsystem,
      actionType: filterType,
    })
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchArchives = () => {
    getSystemLogArchivesAction().then(setArchives).catch(() => {});
  };

  useEffect(() => {
    fetchLogs();
  }, [filterSubsystem, filterType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubsystem, filterType, searchText]);

  const filteredLogs = logs.filter((log) =>
    !searchText || log.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const handlePrune = async (days: number) => {
    const confirmKeyword = "PRUNE";
    const input = prompt(
      t("confirmPruneWarning")
        .replace("{days}", String(days))
        .replace("{keyword}", confirmKeyword)
    );
    if (input !== confirmKeyword) {
      if (input !== null) {
        alert(t("pruneIncorrectKeyword"));
      }
      return;
    }

    try {
      const res = await pruneSystemLogs(days);
      if (res.success) {
        alert(t("pruneSuccess").replace("{count}", String(res.deletedCount)));
        fetchLogs();
      } else {
        alert(t("pruneError") + ": " + res.error);
      }
    } catch {
      alert(t("pruneErrorGeneral"));
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      t("tableDate"),
      t("tableUser"),
      t("tableAction"),
      t("tableCategory"),
      t("tableDetails"),
    ];
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toLocaleString("th-TH"),
      log.user?.name || log.userId || t("systemUser"),
      t(log.actionType) || log.actionType,
      SUBSYSTEM_CONFIGS[log.subsystem]?.label || log.subsystem || "ทั่วไป",
      `"${log.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `system_logs_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            {t("logsTitle")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("logsSubtitle")}</p>
        </div>

        <button
          onClick={() => {
            fetchArchives();
            setIsArchiveModalOpen(true);
          }}
          className="h-10 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Archive className="w-4 h-4" />
          จัดเก็บสำรอง & คืนค่า Archive
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchLogs")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
          />
        </div>

        {/* Subsystem Dropdown Filter */}
        <select
          value={filterSubsystem}
          onChange={(e) => setFilterSubsystem(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
        >
          <option value="ALL">📦 เลือกตามระบบย่อย: ทั้งหมด</option>
          <option value="LEAVE">🟢 ระบบการลา</option>
          <option value="ATTENDANCE">⏰ ลงเวลาปฏิบัติราชการ</option>
          <option value="DOCUMENT">📄 สารบรรณเอกสาร</option>
          <option value="REPAIR">🛠️ ระบบแจ้งซ่อม</option>
          <option value="TIMETABLE">📅 จัดตารางสอน & สอนแทน</option>
          <option value="SUPERVISION">📹 นิเทศการสอนออนไลน์</option>
          <option value="EXAM">📝 จัดตารางสอบส่วนกลาง</option>
          <option value="FACILITY">🏢 จองทรัพยากรกลาง</option>
          <option value="ACADEMIC">🏆 ตั้งค่าวิชาการ & PA</option>
        </select>

        {/* Action Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
        >
          <option value="ALL">⚡ การกระทำ: ทั้งหมด</option>
          <option value="CREATE_LEAVE">ยื่นคำขอลา</option>
          <option value="APPROVE_LEAVE">อนุมัติใบลา</option>
          <option value="REJECT_LEAVE">ปฏิเสธใบลา</option>
          <option value="CANCEL_LEAVE">ยกเลิกใบลา</option>
          <option value="UPDATE_SETTINGS">แก้ไขการตั้งค่า</option>
          <option value="CLOCK_IN">ลงเวลาเข้างาน</option>
          <option value="CLOCK_OUT">ลงเวลาออกงาน</option>
        </select>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/10 focus:ring-4 focus:ring-purple-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <DownloadCloud className="w-4 h-4" />
          <span>{t("exportCsvBtn")}</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-3" />
            <span className="text-xs">{t("loadingData")}</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center p-12 text-slate-400">
            <p className="text-xs">{t("noLogsFound")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-bold">
                  <th className="py-3 px-4">{t("tableDate")}</th>
                  <th className="py-3 px-4">{t("tableUser")}</th>
                  <th className="py-3 px-4">{t("tableAction")}</th>
                  <th className="py-3 px-4">{t("tableCategory")}</th>
                  <th className="py-3 px-4">{t("tableDetails")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {paginatedLogs.map((log) => {
                  const subConfig = SUBSYSTEM_CONFIGS[log.subsystem] || {
                    label: log.subsystem || "ทั่วไป",
                    badgeCls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                    icon: FileText
                  };
                  const actIcon = ACTION_ICONS[log.actionType] || {
                    icon: PlusCircle,
                    color: "text-slate-500",
                    bg: "bg-slate-50 dark:bg-slate-800"
                  };
                  const Icon = actIcon.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {log.user?.name || log.userId || t("systemUser")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg ${actIcon.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-3.5 h-3.5 ${actIcon.color}`} />
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {t(log.actionType) || log.actionType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${subConfig.badgeCls}`}>
                          {subConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md break-words">
                        {log.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              หน้า {currentPage} จาก {totalPages} (ทั้งหมด {filteredLogs.length} รายการ)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prune Log Data Footer (Admin tool) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs">
        <div className="text-rose-700 dark:text-rose-300">
          <span className="font-bold">⚠️ การบำรุงรักษาฐานข้อมูล:</span> ล้างประวัติบันทึกกิจกรรมเก่าเพื่อประหยัดพื้นที่จัดเก็บ
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrune(90)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs cursor-pointer"
          >
            ล้างข้อมูลเก่ากว่า 90 วัน
          </button>
          <button
            onClick={() => handlePrune(30)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs cursor-pointer"
          >
            ล้างข้อมูลเก่ากว่า 30 วัน
          </button>
        </div>
      </div>

      {/* Archive Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-500" />
                คลังจัดเก็บสำรองประวัติกิจกรรม (System Log Archives)
              </h3>
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              บันทึกกิจกรรมที่ถูก Archive จะถูกแยกจัดเก็บเพื่อความรวดเร็วของฐานข้อมูลหลัก คุณสามารถเลือกกู้คืนกลับมาดูเมื่อใดก็ได้
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {archives.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  ยังไม่มีประวัติการ Archive ในระบบ
                </div>
              ) : (
                archives.map((arch) => (
                  <div key={arch.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{arch.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {arch.logCount} รายการ • สร้างเมื่อ {new Date(arch.createdAt).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm(`คุณต้องการกู้คืน ${arch.name} กลับสู่ตารางหลักหรือไม่?`)) {
                          const res = await restoreSystemLogArchiveAction(arch.id);
                          if (res.success) {
                            alert("กู้คืนข้อมูลสำเร็จ");
                            fetchArchives();
                            fetchLogs();
                          } else {
                            alert("เกิดข้อผิดพลาด: " + res.error);
                          }
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition text-[11px]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      กู้คืน
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
