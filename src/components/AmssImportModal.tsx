"use client";

import { useState } from "react";
import { X, Sparkles, RefreshCw, UploadCloud, Clipboard } from "lucide-react";
import { syncAMSSDocumentsFromHtml } from "@/app/actions/incoming";

export default function AmssImportModal({
  isOpen,
  onClose,
  onRefresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlContent.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await syncAMSSDocumentsFromHtml(htmlContent.trim());
      setResult({ imported: res.importedCount, duplicates: res.duplicatesCount });
      setHtmlContent("");
      onRefresh();
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการประมวลผลข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setHtmlContent(event.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 rounded-3xl max-w-xl w-full border border-slate-100 dark:border-slate-800/80 shadow-2xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">นำเข้าข้อมูลรายการหนังสือ AMSS++</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">ดำเนินการนำเข้าข้อมูลเสร็จสิ้น</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                นำเข้าสำเร็จ <strong className="text-emerald-600 dark:text-emerald-400">{result.imported}</strong> รายการ | 
                ข้ามเนื่องจากซ้ำแล้ว <strong className="text-amber-600 dark:text-amber-400">{result.duplicates}</strong> รายการ
              </p>
            </div>
            <button onClick={onClose} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition">
              ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                ขั้นตอนการนำเข้า:
              </label>
              <ol className="text-xs text-slate-500 dark:text-slate-400 list-decimal list-inside space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/80">
                <li>เปิดระบบ AMSS++ ในเบราว์เซอร์แล้วไปที่หน้ารายการหนังสือรับ</li>
                <li>กด <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-slate-700 dark:text-slate-350">Ctrl + A</code> เพื่อเลือกข้อมูลทั้งหมด แล้วคัดลอก</li>
                <li>นำโค้ดหรือข้อความดังกล่าวมาวางลงในกล่อง หรืออัปโหลดไฟล์ HTML หน้านั้นลงในระบบ</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition cursor-pointer">
                <input type="file" accept=".html,.txt" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <UploadCloud className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">อัปโหลดไฟล์ HTML (.html)</span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30">
                <Clipboard className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">หรือวางโค้ดหน้าเว็บด้านล่าง</span>
              </div>
            </div>

            <div>
              <textarea
                placeholder="วางโค้ด HTML หรือข้อความที่คัดลอกมาจาก AMSS++ ที่นี่..."
                rows={5}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-semibold">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !htmlContent.trim()}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                ดึงข้อมูลรายการและบันทึก
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
