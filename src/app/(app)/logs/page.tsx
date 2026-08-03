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
  FileText, Search, Activity, UserCheck, XCircle, PlusCircle, Settings2, 
  DownloadCloud, Archive, RotateCcw, Clock, Building2, Calendar, Wrench, Award, CheckCircle2 
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
      await pruneSystemLogs(days);
      alert(t("pruneSuccess"));
      fetchLogs();
    } catch {
      alert(t("pruneError"));
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Subsystem", "Action Type", "Description", "Date Time", "User ID"];
      const rows = filteredLogs.map((log) => [
        log.id,
        log.subsystem || "LEAVE",
        log.actionType,
        `"${log.description.replace(/"/g, '""')}"`,
        new Date(log.createdAt).toLocaleString(lang === "th" ? "th-TH" : "en-US"),
        log.userId,
      ]);

      const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `system-logs-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert(t("exportLogsError"));
    }
  };

  const handleCreateArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsArchiving(true);
    try {
      const res = await archiveSystemLogsAction(archiveYear, archiveMonth);
      alert(`จัดเก็บสำรองสำเร็จ! ย้ายบันทึกระบบจำนวน ${res.count} รายการไปยังไฟล์สำรองเรียบร้อยแล้ว`);
      fetchLogs();
      fetchArchives();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการจัดเก็บสำรอง");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreArchive = async (archiveId: string, batchName: string) => {
    if (!confirm(`คุณต้องการคืนค่าบันทึกระบบประจำเดือน ${batchName} กลับเข้าสู่รายการหลักใช่หรือไม่?`)) {
      return;
    }
    try {
      const res = await restoreSystemLogArchiveAction(archiveId);
      alert(`คืนค่าสำเร็จ! นำข้อมูลบันทึกระบบจำนวน ${res.restoredCount} รายการกลับเข้าสู่ระบบเรียบร้อยแล้ว`);
      fetchLogs();
      fetchArchives();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการคืนค่าข้อมูล");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6 text-slate-900 dark:text-slate-100"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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

      {/* Log List */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">{t("noLogs")}</p>
          </div>
        ) : (() => {
          const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
          const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

          return (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.map((log, i) => {
                  const actionStyle = ACTION_ICONS[log.actionType] || { icon: Activity, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" };
                  const subConfig = SUBSYSTEM_CONFIGS[log.subsystem || "LEAVE"] || SUBSYSTEM_CONFIGS.LEAVE;
                  const Icon = actionStyle.icon;

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${actionStyle.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${actionStyle.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${subConfig.badgeCls}`}>
                            {subConfig.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{log.actionType}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{log.description}</p>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0 font-medium">
                        {new Date(log.createdAt).toLocaleString(lang === "th" ? "th-TH" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {filteredLogs.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <span className="text-slate-500">
                    หน้า {currentPage} จาก {totalPages} ({filteredLogs.length} รายการ)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      ‹ ย้อนกลับ
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      ถัดไป ›
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Modal: Archiving & Restoring Logs */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-500" />
                ระบบจัดเก็บสำรอง & คืนค่า System Logs Archive
              </h3>
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Archive Form */}
            <form onSubmit={handleCreateArchive} className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">
                📦 ย้ายการบันทึกระบบประจำเดือนไปยังระบบจัดเก็บสำรอง (Archive)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                เลือกเดือนและปีที่ต้องการย้ายข้อมูลบันทึกระบบเก่าไปยังไฟล์จัดเก็บสำรอง เพื่อลดขนาดฐานข้อมูลหลัก
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={archiveMonth}
                  onChange={(e) => setArchiveMonth(Number(e.target.value))}
                  className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>เดือนที่ {m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={archiveYear}
                  onChange={(e) => setArchiveYear(Number(e.target.value))}
                  className="w-28 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
                <button
                  type="submit"
                  disabled={isArchiving}
                  className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Archive className="w-4 h-4" />
                  {isArchiving ? "กำลังย้าย..." : "เริ่มจัดเก็บสำรอง"}
                </button>
              </div>
            </form>

            {/* Archives List & Restore */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                รายการไฟล์จัดเก็บสำรองที่สามารถคืนค่าได้ (Restorable Archives)
              </h4>

              {archives.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                  ยังไม่มีไฟล์จัดเก็บสำรองในระบบ
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {archives.map(arch => (
                    <div
                      key={arch.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          ประจำเดือน {arch.batchName} ({arch.logCount} รายการ)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          จัดเก็บเมื่อ: {new Date(arch.createdAt).toLocaleDateString("th-TH")}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreArchive(arch.id, arch.batchName)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> คืนค่า Archive
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
