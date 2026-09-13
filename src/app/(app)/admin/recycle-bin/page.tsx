"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Award,
  Calendar,
  Search,
  Settings,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  SubsystemHeader,
  ExecutiveStatCard,
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
  StatusPillBadge,
} from "@/components/shared-ui/school-ops";
import {
  getRecycleBinItemsAction,
  restoreRecycleBinItemAction,
  purgeRecycleBinItemAction,
  emptyRecycleBinAction,
  getRecycleBinStatsAction,
  getRecycleBinRetentionDaysAction,
  updateRecycleBinRetentionDaysAction,
} from "@/app/actions/recycle-bin";
import type {
  RecycleBinItemType,
  RecycleBinItemViewModel,
} from "@/services/recycle-bin/recycle-bin.service";

export default function AdminRecycleBinPage() {
  const [items, setItems] = useState<RecycleBinItemViewModel[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    certificateCount: number;
    documentCount: number;
    leaveCount: number;
    expiringSoonCount: number;
    retentionDays: number;
  }>({
    total: 0,
    certificateCount: 0,
    documentCount: 0,
    leaveCount: 0,
    expiringSoonCount: 0,
    retentionDays: 30,
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | RecycleBinItemType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [restoringItem, setRestoringItem] = useState<RecycleBinItemViewModel | null>(null);
  const [purgingItem, setPurgingItem] = useState<RecycleBinItemViewModel | null>(null);
  const [isEmptyingBin, setIsEmptyingBin] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newRetentionDays, setNewRetentionDays] = useState(30);

  // Toast / notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, statsRes, retentionRes] = await Promise.all([
        getRecycleBinItemsAction({
          type: activeTab === "ALL" ? undefined : activeTab,
          search: searchQuery.trim() || undefined,
        }),
        getRecycleBinStatsAction(),
        getRecycleBinRetentionDaysAction(),
      ]);

      if (itemsRes.success && itemsRes.data) {
        setItems(itemsRes.data);
      } else if (itemsRes.error) {
        showToast("error", itemsRes.error);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (retentionRes.success) {
        setNewRetentionDays(retentionRes.retentionDays);
      }
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Handle Restore
  const handleConfirmRestore = () => {
    if (!restoringItem) return;
    startTransition(async () => {
      try {
        const res = await restoreRecycleBinItemAction(restoringItem.type, restoringItem.id);
        if (res.success) {
          let msg = `กู้คืนรายการ "${restoringItem.title}" เรียบร้อยแล้ว`;
          if (res.newDocNo) {
            msg += ` (ได้รับเลขทะเบียนใหม่: ${res.newDocNo} ณ ท้ายสุดของลำดับเวลา)`;
          }
          if (res.deductedQuotaDays) {
            msg += ` (หักคืนโควตาวันลา ${res.deductedQuotaDays} วัน)`;
          }
          showToast("success", msg);
          setRestoringItem(null);
          await loadData();
        } else {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการกู้คืน");
        }
      } catch (err: any) {
        showToast("error", err.message || "เกิดข้อผิดพลาด");
      }
    });
  };

  // Handle Purge (Hard Delete)
  const handleConfirmPurge = () => {
    if (!purgingItem) return;
    startTransition(async () => {
      try {
        const res = await purgeRecycleBinItemAction(purgingItem.type, purgingItem.id);
        if (res.success) {
          showToast(
            "success",
            `ลบถาวรรายการ "${purgingItem.title}" เรียบร้อยแล้ว (เคลียร์ไฟล์แนบ ${res.releasedAttachmentCount || 0} ไฟล์)`
          );
          setPurgingItem(null);
          await loadData();
        } else {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการลบถาวร");
        }
      } catch (err: any) {
        showToast("error", err.message || "เกิดข้อผิดพลาด");
      }
    });
  };

  // Handle Empty Bin
  const handleConfirmEmptyBin = () => {
    startTransition(async () => {
      try {
        const res = await emptyRecycleBinAction(activeTab === "ALL" ? undefined : activeTab);
        if (res.success) {
          showToast("success", `ล้างถังขยะเรียบร้อยแล้ว ลบถาวรรวม ${res.purgedCount} รายการ`);
          setIsEmptyingBin(false);
          await loadData();
        } else {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการล้างถังขยะ");
        }
      } catch (err: any) {
        showToast("error", err.message || "เกิดข้อผิดพลาด");
      }
    });
  };

  // Handle Save Retention Days
  const handleSaveRetentionDays = () => {
    if (newRetentionDays < 7 || newRetentionDays > 90) {
      showToast("error", "ระยะเวลาการเก็บรักษาต้องอยู่ระหว่าง 7 ถึง 90 วัน");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateRecycleBinRetentionDaysAction(newRetentionDays);
        if (res.success) {
          showToast("success", `บันทึกระยะเวลาเก็บรักษาในถังขยะเป็น ${res.retentionDays} วันเรียบร้อยแล้ว`);
          setIsSettingsOpen(false);
          await loadData();
        } else {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการบันทึก");
        }
      } catch (err: any) {
        showToast("error", err.message || "เกิดข้อผิดพลาด");
      }
    });
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.docNo && item.docNo.toLowerCase().includes(q)) ||
        (item.deleteReason && item.deleteReason.toLowerCase().includes(q)) ||
        (item.createdByName && item.createdByName.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const renderTypeBadge = (type: RecycleBinItemType) => {
    switch (type) {
      case "CERTIFICATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
            <Award className="w-3.5 h-3.5" />
            เกียรติบัตร
          </span>
        );
      case "DOCUMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            <FileText className="w-3.5 h-3.5" />
            เลขสารบรรณ
          </span>
        );
      case "LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <Calendar className="w-3.5 h-3.5" />
            ใบลา
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subsystem Header */}
      <SubsystemHeader
        title="ศูนย์จัดการถังขยะกลาง (Unified Recycle Bin)"
        subtitle={`พื้นที่พักข้อมูลก่อนลบถาวร ${stats.retentionDays} วัน รองรับการกู้คืนและป้องกันข้อผิดพลาดอย่างปลอดภัย`}
        categoryTitle="การบริหารงานสารบรรณและการบริหารทั่วไป"
        categoryHref="/document"
        subsystem="document"
        roleBadge="ADMIN ONLY"
        icon={Trash2}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer shadow-sm"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>ตั้งค่าอายุถังขยะ ({stats.retentionDays} วัน)</span>
            </button>
            <button
              onClick={() => setIsEmptyingBin(true)}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>ล้างถังขยะ{activeTab !== "ALL" ? ` (${activeTab})` : "ทั้งหมด"}</span>
            </button>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <ExecutiveStatCard
          title="ทั้งหมดในถังขยะ"
          value={stats.total}
          unit="รายการ"
          subtitle="ข้อมูลที่ถูกพักไว้"
          icon={Trash2}
          tone="neutral"
        />
        <ExecutiveStatCard
          title="เกียรติบัตร"
          value={stats.certificateCount}
          unit="ชุด"
          subtitle="ไม่จองเลขเดิม"
          icon={Award}
          tone="info"
        />
        <ExecutiveStatCard
          title="เลขสารบรรณ"
          value={stats.documentCount}
          unit="ฉบับ"
          subtitle="เลขหนังสือราชการ"
          icon={FileText}
          tone="info"
        />
        <ExecutiveStatCard
          title="ใบลา"
          value={stats.leaveCount}
          unit="รายการ"
          subtitle="คืนโควตาอัตโนมัติ"
          icon={Calendar}
          tone="success"
        />
        <ExecutiveStatCard
          title="ใกล้หมดอายุ (≤ 7 วัน)"
          value={stats.expiringSoonCount}
          unit="รายการ"
          subtitle="จะถูกลบถาวรเร็วๆ นี้"
          icon={AlertTriangle}
          tone={stats.expiringSoonCount > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab("CERTIFICATE")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "CERTIFICATE"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              เกียรติบัตร ({stats.certificateCount})
            </button>
            <button
              onClick={() => setActiveTab("DOCUMENT")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "DOCUMENT"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              เลขสารบรรณ ({stats.documentCount})
            </button>
            <button
              onClick={() => setActiveTab("LEAVE")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "LEAVE"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              ใบลา ({stats.leaveCount})
            </button>
          </div>

          {/* Search Input & Refresh */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเรื่อง, เลขที่, เหตุผล..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </form>
            <button
              onClick={loadData}
              title="รีเฟรชข้อมูล"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">กำลังโหลดรายการในถังขยะ...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              ถังขยะว่างเปล่า
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ไม่มีรายการที่ถูกลบในหมวดหมู่นี้ รายการที่ถูกลบชั่วคราวจะคงอยู่ {stats.retentionDays} วันก่อนระบบจะลบถาวรโดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ประเภท / รายละเอียด</th>
                  <th className="px-4 py-3.5">วันที่เอกสารเดิม</th>
                  <th className="px-4 py-3.5">ข้อมูลการลบ</th>
                  <th className="px-4 py-3.5">อายุคงเหลือ</th>
                  <th className="px-5 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const isExpiring = item.daysRemaining <= 7;
                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Item Details */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderTypeBadge(item.type)}
                            {item.docNo && (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {item.docNo}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>ผู้สร้าง: {item.createdByName || "ไม่ระบุ"}</span>
                            <span>•</span>
                            <span>สถานะเดิม: {item.status}</span>
                          </div>
                        </div>
                      </td>

                      {/* Original Date */}
                      <td className="px-4 py-4 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(item.originalDate).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Deletion Info */}
                      <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          ลบโดย: {item.deletedByName || "ไม่ระบุ"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(item.deletedAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {item.deleteReason && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            เหตุผล: {item.deleteReason}
                          </div>
                        )}
                      </td>

                      {/* Remaining Days */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                              isExpiring
                                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            เหลืออีก {item.daysRemaining} วัน
                          </span>
                          <div className="text-[10px] text-slate-400">
                            ลบจริง:{" "}
                            {new Date(item.purgeAt).toLocaleDateString("th-TH", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRestoringItem(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            กู้คืน
                          </button>
                          <button
                            onClick={() => setPurgingItem(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            ลบถาวร
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Confirm Restore */}
      <UnifiedModal
        isOpen={Boolean(restoringItem)}
        onClose={() => setRestoringItem(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ยืนยันการกู้คืนรายการ"
          subtitle={restoringItem?.title}
          icon={RotateCcw}
          iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
          onClose={() => setRestoringItem(null)}
        />
        <UnifiedModalBody className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ท่านต้องการกู้คืนรายการ{" "}
            <strong className="text-slate-900 dark:text-white">
              &quot;{restoringItem?.title}&quot;
            </strong>{" "}
            กลับเข้าสู่ระบบใช่หรือไม่?
          </p>

          {restoringItem?.type === "CERTIFICATE" && (
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                <Award className="w-4 h-4" />
                <span>กฎสารบรรณเกียรติบัตร (Timeline Tail Invariant):</span>
              </div>
              <p className="leading-relaxed">
                การกู้คืนเกียรติบัตรจะไม่นำเลขเดิมที่ถูกปล่อยไปแล้วกลับมาใช้ซ้ำ แต่จะทำการรันเลขใหม่และจัดสรรวันที่ ณ
                ท้ายสุดของลำดับเวลา (RestoreDate = max(ชุดล่าสุด, วันนี้))
                เพื่อป้องกันข้อขัดแย้งของลำดับเวลาทางทะเบียน
              </p>
            </div>
          )}

          {restoringItem?.type === "LEAVE" && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <Calendar className="w-4 h-4" />
                <span>กฎโควตาวันลา (State-Bound Quota Rule):</span>
              </div>
              <p className="leading-relaxed">
                หากคำขอลาฉบับนี้มีสถานะอนุมัติ (APPROVED)
                ระบบจะทำการตัดหักโควตาวันลาคืนตามจำนวนวันที่ระบุในคำขออย่างถูกต้องโดยอัตโนมัติ
              </p>
            </div>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setRestoringItem(null)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirmRestore}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            <span>ยืนยันกู้คืน</span>
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* Modal: Confirm Purge (Hard Delete) */}
      <UnifiedModal
        isOpen={Boolean(purgingItem)}
        onClose={() => setPurgingItem(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ยืนยันการลบถาวร (Hard Purge)"
          subtitle={purgingItem?.title}
          icon={AlertTriangle}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
          onClose={() => setPurgingItem(null)}
        />
        <UnifiedModalBody className="space-y-3">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200 space-y-2">
            <div className="font-black text-sm flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>การลบถาวรนี้จะไม่สามารถกู้คืนได้อีก!</span>
            </div>
            <p className="leading-relaxed">
              ข้อมูลจะถูกลบออกจากฐานข้อมูลโดยสิ้นเชิง พร้อมทั้งระบบจะตัด Reference
              และนำไฟล์แนบที่เกี่ยวข้องออกจากระบบ Storage (Cloudflare R2) ทันที
            </p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ท่านแน่ใจหรือไม่ว่าต้องการลบรายการ{" "}
            <strong className="text-slate-900 dark:text-white">&quot;{purgingItem?.title}&quot;</strong>{" "}
            อย่างถาวร?
          </p>
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setPurgingItem(null)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirmPurge}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>ยืนยันลบถาวร</span>
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* Modal: Empty Trash Confirmation */}
      <UnifiedModal
        isOpen={isEmptyingBin}
        onClose={() => setIsEmptyingBin(false)}
        size="md"
      >
        <UnifiedModalHeader
          title="ยืนยันการล้างถังขยะ"
          subtitle={`ลบถาวรรายการทั้งหมดในหมวด: ${activeTab === "ALL" ? "ทุกหมวดหมู่" : activeTab}`}
          icon={Trash2}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
          onClose={() => setIsEmptyingBin(false)}
        />
        <UnifiedModalBody className="space-y-3">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200 space-y-2">
            <div className="font-black text-sm flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>คำเตือนระดับสูง: ลบข้อมูลถาวรทั้งหมด</span>
            </div>
            <p className="leading-relaxed">
              การดำเนินการนี้จะลบรายการทั้งหมดที่อยู่ในถังขยะขณะนี้ออกอย่างถาวร
              และไม่สามารถเรียกคืนข้อมูลใดๆ ได้อีกต่อไป
            </p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ยืนยันที่จะล้างถังขยะจำนวน{" "}
            <strong className="text-rose-600 font-black">{filteredItems.length}</strong> รายการใช่หรือไม่?
          </p>
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setIsEmptyingBin(false)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirmEmptyBin}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>ยืนยันล้างถังขยะ</span>
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* Modal: Retention Settings */}
      <UnifiedModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        size="md"
      >
        <UnifiedModalHeader
          title="ตั้งค่าระยะเวลาเก็บรักษาในถังขยะ"
          subtitle="Recycle Bin Retention Policy"
          icon={Settings}
          iconClass="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          onClose={() => setIsSettingsOpen(false)}
        />
        <UnifiedModalBody className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ระยะเวลาเก็บรักษา (วัน)
            </label>
            <input
              type="number"
              min={7}
              max={90}
              value={newRetentionDays}
              onChange={(e) => setNewRetentionDays(parseInt(e.target.value) || 30)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400">
              กำหนดได้ระหว่าง 7 ถึง 90 วัน (ค่าเริ่มต้น: 30 วัน)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>หลักการ Static Purge Fixation:</span>
            </div>
            <p className="leading-relaxed">
              การปรับเปลี่ยนตัวเลขนี้จะมีผลเฉพาะกับรายการที่จะถูกลบใหม่ในอนาคตเท่านั้น
              สำหรับรายการเดิมที่อยู่ในถังขยะแล้ว จะยังคงมีกำหนดวันลบถาวร (purgeAt) คงที่ตามนโยบาย ณ วันที่ถูกสั่งลบ
            </p>
          </div>
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveRetentionDays}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>บันทึกการตั้งค่า</span>
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>
    </div>
  );
}
