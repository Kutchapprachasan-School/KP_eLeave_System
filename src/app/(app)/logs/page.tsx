"use client";

import { useState, useEffect } from "react";
import { getSystemLogs, pruneSystemLogs } from "@/app/actions/leave";
import { motion } from "framer-motion";
import { FileText, Search, Activity, UserCheck, XCircle, PlusCircle, Settings2, Trash2, DownloadCloud } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ACTION_ICONS: Record<string, any> = {
  CREATE_LEAVE: { icon: PlusCircle, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  APPROVE_LEAVE: { icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  REJECT_LEAVE: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
  CANCEL_LEAVE: { icon: XCircle, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
  UPDATE_SETTINGS: { icon: Settings2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { t, lang } = useI18n();

  useEffect(() => {
    setLoading(true);
    getSystemLogs(filterType ? { actionType: filterType } : undefined)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchText]);

  const filteredLogs = logs.filter(log =>
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
      setLoading(true);
      getSystemLogs(filterType ? { actionType: filterType } : undefined)
        .then(setLogs)
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch {
      alert(t("pruneError"));
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Action Type", "Description", "Date Time", "User ID"];
      const rows = filteredLogs.map(log => [
        log.id,
        log.actionType,
        `"${log.description.replace(/"/g, '""')}"`,
        new Date(log.createdAt).toLocaleString(lang === "th" ? "th-TH" : "en-US"),
        log.userId
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
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
    } catch (error) {
      alert(t("exportLogsError"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t("logsTitle")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("logsSubtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchLogs")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none min-w-[180px]"
        >
          <option value="">{t("allTypes")}</option>
          <option value="CREATE_LEAVE">{t("createLeaveLog")}</option>
          <option value="APPROVE_LEAVE">{t("approveLog")}</option>
          <option value="REJECT_LEAVE">{t("rejectLog")}</option>
          <option value="CANCEL_LEAVE">{t("cancelLog")}</option>
          <option value="UPDATE_SETTINGS">{t("updateSettingsLog")}</option>
        </select>
        <select
          onChange={(e) => {
            if (e.target.value) {
              handlePrune(Number(e.target.value));
              e.target.value = "";
            }
          }}
          className="h-11 px-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 text-sm text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-500/20 transition-all cursor-pointer"
        >
          <option value="">{t("pruneLogs")}</option>
          <option value="30">{t("deleteOlderThan")} 30 {t("daysUnit")}</option>
          <option value="60">{t("deleteOlderThan")} 60 {t("daysUnit")}</option>
          <option value="90">{t("deleteOlderThan")} 90 {t("daysUnit")}</option>
        </select>
        <button
          onClick={handleExportCSV}
          className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-500/10 focus:ring-4 focus:ring-purple-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <DownloadCloud className="w-4.5 h-4.5" />
          <span>{t("exportCsvBtn")}</span>
        </button>
      </div>

      {/* Log List */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">{t("noLogs")}</p>
          </div>
        ) : (() => {
          const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
          const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

          return (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.map((log, i) => {
                  const actionStyle = ACTION_ICONS[log.actionType] || { icon: Activity, color: "text-slate-500", bg: "bg-slate-100" };
                  const Icon = actionStyle.icon;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (i % itemsPerPage) * 0.02 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${actionStyle.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${actionStyle.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{log.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{log.actionType}</p>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString(lang === "th" ? "th-TH" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {filteredLogs.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                  <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {lang === "en" ? "Showing" : "แสดง"} {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} {lang === "en" ? "of" : "จาก"} {filteredLogs.length} {lang === "en" ? "logs" : "รายการ"}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm cursor-pointer"
                    >
                      {lang === "en" ? "Previous" : "ก่อนหน้า"}
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNum = index + 1;
                      if (totalPages > 5 && Math.abs(currentPage - pageNum) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} className="px-1 text-xs text-slate-400 dark:text-slate-600">...</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                              : "border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-700 dark:text-slate-300 shadow-sm"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm cursor-pointer"
                    >
                      {lang === "en" ? "Next" : "ถัดไป"}
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </motion.div>
  );
}
