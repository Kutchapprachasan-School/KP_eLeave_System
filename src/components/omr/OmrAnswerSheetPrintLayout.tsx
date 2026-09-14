"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

export interface PrintedSheetItem {
  sheetToken: string;
  studentId: string;
  studentName?: string | null;
  classroom?: string | null;
  seatNo?: number | null;
}

export interface OmrAnswerSheetProps {
  paperTitle: string;
  subjectCode: string;
  subjectName: string;
  academicYear: number;
  term: number;
  gradeLevel: string;
  totalItems: number;
  sheet: PrintedSheetItem;
  isPreSlugged?: boolean;
}

export function OmrAnswerSheet({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 50,
  sheet,
  isPreSlugged = true
}: OmrAnswerSheetProps) {
  const digits = (sheet.studentId || "").padStart(5, "0").slice(-5).split("");

  return (
    <div className="omr-a4-sheet relative bg-white text-black font-sans box-border overflow-hidden select-none">
      {/* 4 Corner Fiducial Markers (12mm x 12mm solid black squares) */}
      <div className="absolute top-[8mm] left-[8mm] w-[12mm] h-[12mm] bg-black" />
      <div className="absolute top-[8mm] right-[8mm] w-[12mm] h-[12mm] bg-black" />
      <div className="absolute bottom-[8mm] left-[8mm] w-[12mm] h-[12mm] bg-black" />
      <div className="absolute bottom-[8mm] right-[8mm] w-[12mm] h-[12mm] bg-black" />

      {/* Main Container within Margins */}
      <div className="pt-[10mm] pb-[10mm] px-[22mm] h-full flex flex-col justify-between">
        {/* Header Block */}
        <div>
          <div className="flex items-start justify-between border-b-2 border-black pb-2">
            <div>
              <div className="text-[16px] font-bold tracking-tight">
                โรงเรียนกุดจับประชาสรรค์ • แบบทดสอบกลาง/ปลายภาคเรียน
              </div>
              <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
                {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                ปีการศึกษา {academicYear} ภาคเรียนที่ {term} • จำนวน {totalItems} ข้อ
              </div>
            </div>

            {/* Cryptographic Zero-PII QR Token */}
            <div className="flex flex-col items-center pl-2">
              <QRCodeSVG
                value={sheet.sheetToken}
                size={56}
                level="M"
                includeMargin={false}
              />
              <span className="text-[8px] font-mono text-slate-600 mt-1">
                {sheet.sheetToken}
              </span>
            </div>
          </div>

          {/* Student Info Bar & Score Box */}
          <div className="mt-2.5 grid grid-cols-12 gap-3 items-center border border-black p-2 rounded bg-slate-50/50">
            <div className="col-span-8 text-[12px] space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">ชื่อ-สกุล:</span>
                <span className="border-b border-dotted border-black flex-1 font-semibold text-blue-900">
                  {sheet.studentName || "...................................................................."}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="font-bold">ชั้น: </span>
                  <span className="font-semibold text-blue-900">{sheet.classroom || "........"}</span>
                </div>
                <div>
                  <span className="font-bold">เลขที่: </span>
                  <span className="font-semibold text-blue-900">{sheet.seatNo != null ? sheet.seatNo : "........"}</span>
                </div>
                <div>
                  <span className="font-bold">รหัสประจำตัว: </span>
                  <span className="font-mono font-bold text-blue-900 tracking-widest">{sheet.studentId}</span>
                </div>
              </div>
            </div>

            <div className="col-span-4 border-l border-black pl-3 text-center">
              <div className="text-[10px] font-bold text-slate-700">คะแนนที่ได้ (สำหรับครู)</div>
              <div className="h-7 border border-dashed border-slate-400 mt-1 rounded bg-white" />
            </div>
          </div>
        </div>

        {/* Middle Section: Student ID Grid + Test Set Version + Instructions */}
        <div className="my-2 grid grid-cols-12 gap-3 items-start border-y border-slate-300 py-2">
          {/* Student ID Bubble Matrix (5 Digits) */}
          <div className="col-span-5 border-r border-slate-300 pr-2">
            <div className="text-[10px] font-bold text-center mb-1 text-slate-700">
              [ รหัสประจำตัวนักเรียน 5 หลัก ]
            </div>
            
            {/* Top Digit Boxes */}
            <div className="flex justify-center gap-1.5 mb-1">
              {digits.map((d, dIdx) => (
                <div
                  key={dIdx}
                  className="w-5 h-5 border border-black flex items-center justify-center font-mono text-[11px] font-bold bg-white"
                >
                  {isPreSlugged ? d : ""}
                </div>
              ))}
            </div>

            {/* Bubble Rows 0 to 9 */}
            <div className="space-y-0.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <div key={num} className="flex justify-center gap-1.5 items-center">
                  {digits.map((d, dIdx) => {
                    const isMarked = isPreSlugged && parseInt(d, 10) === num;
                    return (
                      <div
                        key={dIdx}
                        className={`w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold transition-all ${
                          isMarked ? "bg-black text-white" : "bg-white text-black"
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Test Set Version + Instructions */}
          <div className="col-span-7 flex flex-col justify-between h-full pl-1">
            {/* Test Version */}
            <div>
              <div className="text-[10px] font-bold mb-1 text-slate-700">
                [ ชุดข้อสอบ ]
              </div>
              <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded border border-slate-200">
                {["01", "02", "03", "04"].map((ver, vIdx) => (
                  <div key={ver} className="flex items-center gap-1 text-[10px]">
                    <span className="font-semibold">{vIdx + 1}</span>
                    <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold bg-white">
                      {vIdx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instruction Guide */}
            <div className="mt-2 text-[10px] text-slate-600 space-y-1 bg-amber-50/70 border border-amber-200 p-2 rounded">
              <div className="font-bold text-amber-900">คำชี้แจงในการทำแบบทดสอบ:</div>
              <div>• ใช้ดินสอดำ 2B ขึ้นไป ฝนในวงกลมให้เข้มเต็มวง</div>
              <div>• หากต้องการเปลี่ยนคำตอบ ให้ใช้ยางลบลบให้สะอาดหมดจด</div>
              <div className="flex items-center gap-3 pt-0.5 font-mono text-[9px]">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  (✓ ถูกต้อง): <span className="w-3.5 h-3.5 rounded-full bg-black inline-block" />
                </span>
                <span className="flex items-center gap-1 text-rose-700 font-bold">
                  (✗ ห้ามทำ): <span className="w-3.5 h-3.5 rounded-full border border-black inline-flex items-center justify-center text-[9px]">✓</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Grid: Column 1 (1-25) & Column 2 (26-50) */}
        <div className="grid grid-cols-2 gap-6 my-1">
          {/* Column 1: Items 1 - 25 */}
          <div className="border border-black p-2 rounded">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 border-b border-slate-300 pb-1 mb-1 px-1">
              <span>ข้อ</span>
              <div className="flex gap-4 pr-1">
                <span>(A)</span>
                <span>(B)</span>
                <span>(C)</span>
                <span>(D)</span>
              </div>
            </div>

            <div className="space-y-1">
              {Array.from({ length: Math.min(25, totalItems) }, (_, idx) => idx + 1).map(itemNo => (
                <div key={itemNo} className="flex justify-between items-center text-[10px] px-1 hover:bg-slate-50">
                  <span className="w-5 font-bold font-mono text-slate-700 text-right pr-2">
                    {itemNo}.
                  </span>
                  <div className="flex gap-3 pr-1">
                    {["A", "B", "C", "D"].map(choice => (
                      <div
                        key={choice}
                        className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold bg-white"
                      >
                        {choice}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Items 26 - 50 */}
          <div className="border border-black p-2 rounded">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 border-b border-slate-300 pb-1 mb-1 px-1">
              <span>ข้อ</span>
              <div className="flex gap-4 pr-1">
                <span>(A)</span>
                <span>(B)</span>
                <span>(C)</span>
                <span>(D)</span>
              </div>
            </div>

            <div className="space-y-1">
              {Array.from({ length: Math.max(0, totalItems - 25) }, (_, idx) => idx + 26).map(itemNo => (
                <div key={itemNo} className="flex justify-between items-center text-[10px] px-1 hover:bg-slate-50">
                  <span className="w-5 font-bold font-mono text-slate-700 text-right pr-2">
                    {itemNo}.
                  </span>
                  <div className="flex gap-3 pr-1">
                    {["A", "B", "C", "D"].map(choice => (
                      <div
                        key={choice}
                        className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold bg-white"
                      >
                        {choice}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[9px] text-slate-500 border-t border-slate-300 pt-1 text-center">
          โรงเรียนกุดจับประชาสรรค์ • KP-OMR-A4-50 (Rev. 7.3) • ระบบบริหารจัดการวิชาการอิเล็กทรอนิกส์
        </div>
      </div>
    </div>
  );
}
