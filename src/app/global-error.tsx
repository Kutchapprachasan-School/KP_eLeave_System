"use client";

import React, { useEffect } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Root Global Error caught:", error);
  }, [error]);

  return (
    <html lang="th">
      <body className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4 font-sans text-slate-800 antialiased">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6">
          {/* School Brand Header */}
          <div className="flex items-center justify-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white border border-slate-100 p-0.5 shadow-2xs">
              <img
                src="/images/teacher/school_logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <div className="font-extrabold text-slate-900 text-xs leading-tight">
                โรงเรียนกุดจับประชาสรรค์
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                KP School Management System
              </div>
            </div>
          </div>

          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
              ระบบขัดข้องชั่วคราว
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              เกิดข้อผิดพลาดในการโหลดระบบหลักของสถานศึกษา กรุณากดปุ่มด้านล่างเพื่อลองใหม่อีกครั้ง
            </p>
          </div>

          {error?.message && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left max-h-32 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                รายละเอียดข้อผิดพลาด:
              </p>
              <p className="text-[11px] font-mono text-slate-600 break-all leading-normal">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ประมวลผลใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/dashboard";
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              <span>กลับสู่แดชบอร์ด</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
