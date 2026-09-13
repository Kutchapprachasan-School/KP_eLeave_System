"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Trash2,
  RotateCcw,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/shared-ui/school-ops";
import {
  getRecycleBinItemsAction,
  restoreRecycleBinItemAction,
} from "@/app/actions/recycle-bin";
import type { RecycleBinItemViewModel } from "@/services/recycle-bin/recycle-bin.service";

interface MyTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemRestored?: () => void;
}

export function MyTrashModal({ isOpen, onClose, onItemRestored }: MyTrashModalProps) {
  const [items, setItems] = useState<RecycleBinItemViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringItem, setRestoringItem] = useState<RecycleBinItemViewModel | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadItems = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await getRecycleBinItemsAction({ type: "CERTIFICATE" });
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการโหลดรายการ");
      }
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const handleConfirmRestore = () => {
    if (!restoringItem) return;
    startTransition(async () => {
      try {
        const res = await restoreRecycleBinItemAction("CERTIFICATE", restoringItem.id);
        if (res.success) {
          showToast(
            "success",
            `กู้คืนสำเร็จ! ได้รับเลขทะเบียนใหม่: ${res.newDocNo || ""} (ณ ท้ายสุดของลำดับเวลา)`
          );
          setRestoringItem(null);
          await loadItems();
          onItemRestored?.();
        } else {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการกู้คืน");
        }
      } catch (err: any) {
        showToast("error", err.message || "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <>
      <UnifiedModal isOpen={isOpen} onClose={onClose} size="xl">
        <UnifiedModalHeader
          title="ถังขยะเกียรติบัตรของฉัน"
          subtitle="รายการเกียรติบัตรที่ถูกลบชั่วคราว สามารถกู้คืนได้ภายใน 30 วัน"
          icon={Trash2}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
          onClose={onClose}
        />
        <UnifiedModalBody className="space-y-4">
          {/* Internal Toast */}
          {toast && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Items Content */}
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-indigo-600" />
              <p className="text-xs text-slate-500">กำลังโหลดรายการในถังขยะ...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                ไม่มีเกียรติบัตรในถังขยะ
              </p>
              <p className="text-[11px] text-slate-400">
                เมื่อท่านลบชุดเกียรติบัตร ข้อมูลจะถูกเก็บไว้ที่นี่ 30 วันก่อนลบถาวร
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {items.map((item) => {
                const isExpiring = item.daysRemaining <= 7;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                          <Award className="w-3 h-3" />
                          เกียรติบัตร
                        </span>
                        {item.docNo && (
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.docNo}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {item.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span>
                          วันที่เดิม:{" "}
                          {new Date(item.originalDate).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          ลบเมื่อ:{" "}
                          {new Date(item.deletedAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {item.deleteReason && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              เหตุผล: {item.deleteReason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isExpiring
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        เหลือ {item.daysRemaining} วัน
                      </span>

                      <button
                        type="button"
                        onClick={() => setRestoringItem(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        กู้คืน
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ปิด
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* Nested Confirm Restore Modal */}
      <UnifiedModal
        isOpen={Boolean(restoringItem)}
        onClose={() => setRestoringItem(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ยืนยันการกู้คืนเกียรติบัตร"
          subtitle={restoringItem?.title}
          icon={RotateCcw}
          iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
          onClose={() => setRestoringItem(null)}
        />
        <UnifiedModalBody className="space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ท่านต้องการกู้คืนชุดเกียรติบัตร{" "}
            <strong className="text-slate-900 dark:text-white">
              &quot;{restoringItem?.title}&quot;
            </strong>{" "}
            กลับเข้าสู่สารบรรณใช่หรือไม่?
          </p>
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
              <Award className="w-4 h-4" />
              <span>การจัดสรรเลขและวันที่ตามลำดับเวลา:</span>
            </div>
            <p className="leading-relaxed">
              เนื่องจากเกียรติบัตรที่ถูกลบไปแล้วจะไม่ยึดเลขเดิม
              ระบบจะทำการรันเลขลำดับใหม่และกำหนดวันที่ต่อท้ายสุดของลำดับเวลา (Timeline Tail)
              โดยอัตโนมัติ เพื่อรักษาความต่อเนื่องของทะเบียนสารบรรณ
            </p>
          </div>
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
    </>
  );
}
