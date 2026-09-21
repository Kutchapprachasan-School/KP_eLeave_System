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

export interface SubjectivePrintItem {
  itemNo: number;
  title: string;
  maxScore: number | string;
  rubricDetail?: string | null;
}

export interface OmrAnswerSheetProps {
  paperTitle: string;
  subjectCode: string;
  subjectName: string;
  academicYear: number;
  term: number;
  gradeLevel: string;
  totalItems: number;
  choiceCount?: number;
  subjectiveItems?: SubjectivePrintItem[];
  sheet: PrintedSheetItem;
  isPreSlugged?: boolean;
}

export interface OmrTwoUpA4SheetProps {
  paperTitle: string;
  subjectCode: string;
  subjectName: string;
  academicYear: number;
  term: number;
  gradeLevel: string;
  totalItems: number;
  choiceCount?: number;
  subjectiveItems?: SubjectivePrintItem[];
  sheetTop: PrintedSheetItem;
  sheetBottom?: PrintedSheetItem | null;
  isPreSlugged?: boolean;
}

const ALL_CHOICE_LABELS = ["A", "B", "C", "D", "E", "F"];

/**
 * Helper: Render a multiple-choice column with configurable choices (up to 6: A-F)
 */
function MultipleChoiceColumn({
  startItem,
  endItem,
  colTitle = "ข้อสอบปรนัย",
  bubbleSize = "w-3.5 h-3.5 text-[7.5px]",
  itemPadding = "py-0",
  showHeaders = true,
  choiceCount = 4
}: {
  startItem: number;
  endItem: number;
  colTitle?: string;
  bubbleSize?: string;
  itemPadding?: string;
  showHeaders?: boolean;
  choiceCount?: number;
}) {
  const items = Array.from({ length: Math.max(0, endItem - startItem + 1) }, (_, idx) => startItem + idx);
  const choices = ALL_CHOICE_LABELS.slice(0, Math.min(6, Math.max(2, choiceCount)));

  return (
    <div className="border border-black p-1 rounded bg-white">
      {showHeaders && (
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-700 border-b border-slate-300 pb-0.5 mb-0.5 px-0.5">
          <span className="w-5 text-right pr-0.5 truncate">{colTitle}</span>
          <div className="flex gap-1.5 sm:gap-2 pr-0.5 font-mono">
            {choices.map((c) => (
              <span key={c} className="w-3.5 text-center">({c})</span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {items.map((itemNo) => (
          <div key={itemNo} className={`flex items-center gap-1.5 text-[8.5px] px-0.5 ${itemPadding}`}>
            <span className="w-5 font-bold font-mono text-slate-700 text-right pr-0.5">
              {itemNo}.
            </span>
            <div className="flex gap-1.5 sm:gap-2 pr-0.5">
              {choices.map((choice) => (
                <div
                  key={choice}
                  className={`${bubbleSize} rounded-full border border-black flex items-center justify-center font-bold bg-white text-black`}
                >
                  {choice}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full A4 OMR Answer Sheet - Compact Scan Zone Architecture (Rev 9.0)
 * 
 * ส่วนบน (~58% หรือ ~170mm): Compact Scan Zone มีมาร์กเกอร์ 4 มุมล้อมรอบ
 * รวบรวมข้อมูลสแกนทั้งหมด: รหัสนักเรียน 5 หลัก, ชุดข้อสอบ, ข้อสอบปรนัย (A-F), ช่องคะแนนอัตนัย
 * 
 * ส่วนล่าง (~42%): พื้นที่สำหรับเขียนตอบอัตนัย (อยู่นอกพื้นที่สแกน)
 */
export function OmrAnswerSheet({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 50,
  choiceCount = 4,
  subjectiveItems = [],
  sheet,
  isPreSlugged = true
}: OmrAnswerSheetProps) {
  const digits = (sheet.studentId || "").padStart(5, "0").slice(-5).split("");
  const hasSubjective = subjectiveItems.length > 0;
  const totalSubjectiveScore = subjectiveItems.reduce((acc, cur) => acc + Number(cur.maxScore || 0), 0);
  const actualChoices = ALL_CHOICE_LABELS.slice(0, Math.min(6, Math.max(2, choiceCount)));

  return (
    <div className="omr-print-container">
      {/* 📄 PAGE 1: OMR ANSWER SHEET (A4 Portrait) */}
      <div className="omr-a4-sheet relative bg-white text-black font-sans box-border overflow-hidden select-none w-[210mm] h-[297mm] p-[5mm] flex flex-col justify-between">
        
        {/* ========================================================================= */}
        {/* 1. COMPACT SCAN ZONE (Top 57.5% of A4, ~168mm height)                    */}
        {/* 4 Corner Fiducial Markers (12mm x 12mm) surround ONLY this Scan Zone     */}
        {/* ========================================================================= */}
        <div className="relative border border-slate-300 rounded p-[8mm] pb-[6mm] h-[166mm] flex flex-col justify-between bg-white">
          {/* 4 Corner Markers of Scan Zone */}
          <div className="absolute top-[2mm] left-[2mm] w-[12mm] h-[12mm] bg-black" />
          <div className="absolute top-[2mm] right-[2mm] w-[12mm] h-[12mm] bg-black" />
          <div className="absolute bottom-[2mm] left-[2mm] w-[12mm] h-[12mm] bg-black" />
          <div className="absolute bottom-[2mm] right-[2mm] w-[12mm] h-[12mm] bg-black" />

          {/* Top Bar: Header & QR Code */}
          <div>
            <div className="flex items-start justify-between border-b-2 border-black pb-1">
              <div>
                <div className="text-[14px] font-bold tracking-tight">
                  โรงเรียนกุดจับประชาสรรค์ • กระดาษคำตอบมาตรฐาน (KP-OMR Compact Rev 9.0)
                </div>
                <div className="text-[12px] font-semibold text-slate-800">
                  {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
                </div>
                <div className="text-[10px] text-slate-600">
                  ปีการศึกษา {academicYear} ภาคเรียนที่ {term} • ปรนัย {totalItems} ข้อ ({actualChoices.join(",")})
                  {hasSubjective ? ` • อัตนัย ${subjectiveItems.length} ข้อ (${totalSubjectiveScore} คะแนน)` : ""}
                </div>
              </div>

              {/* Cryptographic Zero-PII QR Token */}
              <div className="flex flex-col items-center pl-2">
                <QRCodeSVG
                  value={sheet.sheetToken}
                  size={46}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[7.5px] font-mono text-slate-600 mt-0.5">
                  {sheet.sheetToken}
                </span>
              </div>
            </div>

            {/* Student Info Bar */}
            <div className="mt-1 flex items-center justify-between border border-black px-2 py-0.5 rounded text-[10px] bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="font-bold">ชื่อ-สกุล:</span>
                <span className="font-semibold text-blue-950">
                  {sheet.studentName || "...................................................................."}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span>ชั้น: <b>{sheet.classroom || "-"}</b></span>
                <span>เลขที่: <b>{sheet.seatNo != null ? sheet.seatNo : "-"}</b></span>
                <span className="font-bold text-blue-950">ID: {sheet.studentId}</span>
              </div>
            </div>
          </div>

          {/* Middle: Student ID Grid + Test Set Version + Instructions / Subjective Score Bubbles */}
          <div className="my-1 grid grid-cols-12 gap-2 items-start border-y border-slate-300 py-1">
            {/* Student ID Bubble Matrix (5 Digits) */}
            <div className="col-span-5 border-r border-slate-300 pr-2">
              <div className="text-[9px] font-bold text-center mb-0.5 text-slate-700">
                [ รหัสประจำตัวนักเรียน 5 หลัก ]
              </div>
              
              {/* Top Digit Boxes */}
              <div className="flex justify-center gap-1 mb-0.5">
                {digits.map((d, dIdx) => (
                  <div
                    key={dIdx}
                    className="w-4 h-4 border border-black flex items-center justify-center font-mono text-[9px] font-bold bg-white"
                  >
                    {isPreSlugged ? d : ""}
                  </div>
                ))}
              </div>

              {/* Bubble Rows 0 to 9 */}
              <div className="space-y-0.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <div key={num} className="flex justify-center gap-1 items-center">
                    {digits.map((d, dIdx) => {
                      const isMarked = isPreSlugged && parseInt(d, 10) === num;
                      return (
                        <div
                          key={dIdx}
                          className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7.5px] font-bold ${
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

            {/* Test Set Version + Teacher Subjective Score Bubbles / Instructions */}
            <div className="col-span-7 flex flex-col justify-between h-full pl-1">
              <div>
                <div className="text-[9px] font-bold mb-0.5 text-slate-700">
                  [ ชุดข้อสอบ ]
                </div>
                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded border border-slate-200">
                  {["01", "02", "03", "04"].map((ver, vIdx) => (
                    <div key={ver} className="flex items-center gap-1 text-[9px]">
                      <span className="font-semibold">{vIdx + 1}</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7.5px] font-bold bg-white">
                        {vIdx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subjective Score Bubbles for Teacher (Inside Scan Zone!) */}
              {hasSubjective ? (
                <div className="mt-1 border border-indigo-300 rounded p-1 bg-indigo-50/40">
                  <div className="text-[8.5px] font-bold text-indigo-950 mb-0.5 flex justify-between">
                    <span>ช่องฝนคะแนนอัตนัย (สำหรับครูผู้ตรวจ):</span>
                    <span className="text-indigo-700">เต็ม {totalSubjectiveScore} คะแนน</span>
                  </div>
                  <div className="space-y-1">
                    {subjectiveItems.slice(0, 3).map((sItem) => {
                      const maxS = Math.min(10, Math.floor(Number(sItem.maxScore || 5)));
                      const scores = Array.from({ length: maxS + 1 }, (_, i) => i);
                      return (
                        <div key={sItem.itemNo} className="flex items-center gap-1 text-[8px]">
                          <span className="w-9 font-bold text-slate-700">ข้อ {sItem.itemNo}:</span>
                          <div className="flex gap-1">
                            {scores.map((s) => (
                              <div
                                key={s}
                                className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7px] font-bold bg-white"
                                title={`ข้อ ${sItem.itemNo} ได้ ${s} คะแนน`}
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Instructions */
                <div className="mt-1 text-[9px] text-slate-600 space-y-0.5 bg-amber-50/70 border border-amber-200 p-1.5 rounded">
                  <div className="font-bold text-amber-900">คำชี้แจงในการทำแบบทดสอบ:</div>
                  <div>• ใช้ดินสอดำ 2B ขึ้นไป ฝนในวงกลมให้เข้มเต็มวง</div>
                  <div>• หากเปลี่ยนคำตอบ ให้ใช้ยางลบลบให้สะอาดหมดจด</div>
                  <div className="flex items-center gap-3 pt-0.5 font-mono text-[8px]">
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      (✓ ถูกต้อง): <span className="w-3 h-3 rounded-full bg-black inline-block" />
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 font-bold">
                      (✗ ห้าม): <span className="w-3 h-3 rounded-full border border-black inline-flex items-center justify-center text-[8px]">✓</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Multiple Choice Bubbles Grid (Compact layout) */}
          <div className="my-0.5">
            {totalItems <= 20 ? (
              <div className="max-w-md mx-auto">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={totalItems}
                  colTitle={`ปรนัย 1 - ${totalItems}`}
                  choiceCount={choiceCount}
                />
              </div>
            ) : totalItems <= 50 ? (
              <div className="grid grid-cols-2 gap-3">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={Math.min(25, totalItems)}
                  colTitle="ข้อ 1 - 25"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={26}
                  endItem={totalItems}
                  colTitle={`ข้อ 26 - ${totalItems}`}
                  choiceCount={choiceCount}
                />
              </div>
            ) : totalItems <= 75 ? (
              <div className="grid grid-cols-3 gap-2">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={25}
                  colTitle="1 - 25"
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={26}
                  endItem={50}
                  colTitle="26 - 50"
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={51}
                  endItem={totalItems}
                  colTitle={`51 - ${totalItems}`}
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  choiceCount={choiceCount}
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={25}
                  colTitle="1 - 25"
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={26}
                  endItem={50}
                  colTitle="26 - 50"
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={51}
                  endItem={75}
                  colTitle="51 - 75"
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={76}
                  endItem={totalItems}
                  colTitle={`76 - ${totalItems}`}
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
              </div>
            )}
          </div>

          {/* Bottom border indicator for Scan Zone */}
          <div className="text-[7.5px] text-slate-400 text-center font-mono pt-0.5">
            [ สิ้นสุดพื้นที่สแกน OMR Scan Zone • KP-OMR-A4-{totalItems} Rev 9.0 ]
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SEPARATION LINE (Between Scan Zone and Subjective Response Area)       */}
        {/* ========================================================================= */}
        <div className="relative py-1 flex items-center justify-center my-1">
          <div className="w-full border-t-2 border-dashed border-slate-400" />
          <span className="absolute bg-white px-3 text-[8.5px] font-mono text-slate-600 font-bold flex items-center gap-1.5 border border-slate-300 rounded-full py-0.5">
            ✂ {hasSubjective ? "ตอนที่ 2: แบบทดสอบอัตนัย (เขียนตอบ - อยู่นอกกรอบสแกน)" : "พื้นที่สำหรับทดเลข / บันทึกเพิ่มเติม (อยู่นอกกรอบสแกน)"} ✂
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 3. LOWER SECTION (~42% of A4, ~115mm height): Subjective / Workspace      */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-between border border-slate-300 rounded p-3 bg-slate-50/30 overflow-hidden">
          {hasSubjective ? (
            <div className="space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-indigo-300 pb-1 mb-1.5">
                  <span className="text-[12px] font-bold text-indigo-950">
                    ตอนที่ 2: แบบทดสอบอัตนัย (เขียนตอบ)
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    คะแนนเต็มรวม {totalSubjectiveScore} คะแนน
                  </span>
                </div>

                <div className="space-y-2">
                  {subjectiveItems.map((sItem) => (
                    <div key={sItem.itemNo} className="text-[10px] border border-slate-300 rounded p-2 bg-white">
                      <div className="flex justify-between items-center font-bold text-slate-900 border-b border-slate-200 pb-1">
                        <span>ข้อที่ {sItem.itemNo}: {sItem.title}</span>
                        <span className="text-indigo-900 font-mono text-[9px]">({sItem.maxScore} คะแนน)</span>
                      </div>
                      {sItem.rubricDetail && (
                        <div className="text-[8.5px] text-slate-500 italic mt-0.5">
                          เกณฑ์: {sItem.rubricDetail}
                        </div>
                      )}
                      {/* Lined handwriting response area */}
                      <div className="mt-1 h-20 border border-dotted border-slate-300 rounded bg-slate-50/50 p-1.5 text-[8.5px] text-slate-400 relative">
                        <span>(พื้นที่เขียนตอบของนักเรียน)</span>
                        <div className="absolute inset-x-2 top-6 border-b border-dotted border-slate-200" />
                        <div className="absolute inset-x-2 top-11 border-b border-dotted border-slate-200" />
                        <div className="absolute inset-x-2 top-16 border-b border-dotted border-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-300 pt-1 flex justify-between items-center text-[9px] text-slate-600">
                <span>ครูผู้ตรวจ: กรุณานำคะแนนไปฝนลงในช่องคะแนนอัตนัยใน Scan Zone ด้านบนเพื่อตรวจด้วยระบบ</span>
                <span className="font-mono font-bold">KP-OMR Rev 9.0</span>
              </div>
            </div>
          ) : (
            /* Workspace / Scratch Pad */
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-700 border-b border-slate-300 pb-1 mb-1">
                  พื้นที่สำหรับทดเลข / ร่างคำตอบ (Scratchpad Workspace)
                </div>
                <div className="h-32 border border-dotted border-slate-300 rounded bg-white p-2 text-[9px] text-slate-400">
                  (นักเรียนสามารถทดเลขหรือร่างคำตอบในบริเวณนี้ได้ โดยไม่มีผลต่อการสแกนตรวจคำตอบ)
                </div>
              </div>
              <div className="text-[8.5px] text-slate-500 text-center border-t border-slate-200 pt-1">
                โรงเรียนกุดจับประชาสรรค์ • ระบบบริหารจัดการวิชาการอิเล็กทรอนิกส์
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="text-[8px] text-slate-400 border-t border-slate-200 pt-0.5 text-center flex justify-between items-center mt-1">
            <span>โรงเรียนกุดจับประชาสรรค์ • Smart Academic Exam System</span>
            <span className="font-mono">
              KP-OMR-A4-{totalItems} (Rev. 9.0 Compact)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * Single Half-A4 Slip (Internal component for 2-up printing)
 */
function HalfSheetCard({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems,
  choiceCount = 4,
  subjectiveItems = [],
  sheet,
  isPreSlugged = true
}: {
  paperTitle: string;
  subjectCode: string;
  subjectName: string;
  academicYear: number;
  term: number;
  gradeLevel: string;
  totalItems: number;
  choiceCount?: number;
  subjectiveItems?: SubjectivePrintItem[];
  sheet: PrintedSheetItem;
  isPreSlugged?: boolean;
}) {
  const digits = (sheet.studentId || "").padStart(5, "0").slice(-5).split("");
  const hasSubjective = subjectiveItems.length > 0;
  const actualChoices = ALL_CHOICE_LABELS.slice(0, Math.min(6, Math.max(2, choiceCount)));

  return (
    <div className="relative h-[138mm] box-border p-[4mm] px-[10mm] flex flex-col justify-between bg-white text-black select-none border border-slate-300 rounded">
      {/* 4 Corner Markers for this Half (10mm x 10mm) */}
      <div className="absolute top-[3mm] left-[3mm] w-[10mm] h-[10mm] bg-black" />
      <div className="absolute top-[3mm] right-[3mm] w-[10mm] h-[10mm] bg-black" />
      <div className="absolute bottom-[3mm] left-[3mm] w-[10mm] h-[10mm] bg-black" />
      <div className="absolute bottom-[3mm] right-[3mm] w-[10mm] h-[10mm] bg-black" />

      {/* Top Bar: Title & QR */}
      <div>
        <div className="flex items-start justify-between border-b border-black pb-1">
          <div>
            <div className="text-[12px] font-bold">
              โรงเรียนกุดจับประชาสรรค์ • กระดาษคำตอบ (Half-A4 Compact Rev 9.0)
            </div>
            <div className="text-[10.5px] font-semibold text-slate-800">
              {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
            </div>
            <div className="text-[8.5px] text-slate-600">
              ปีการศึกษา {academicYear}/{term} • ปรนัย {totalItems} ข้อ ({actualChoices.join(",")}) {hasSubjective ? `• อัตนัย ${subjectiveItems.length} ข้อ` : ""}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeSVG value={sheet.sheetToken} size={36} level="M" includeMargin={false} />
            <span className="text-[6.5px] font-mono text-slate-600 mt-0.5">{sheet.sheetToken.slice(-10)}</span>
          </div>
        </div>

        {/* Student Bar */}
        <div className="mt-1 flex items-center justify-between border border-black px-2 py-0.5 rounded text-[9.5px] bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold">ชื่อ:</span>
            <span className="font-semibold text-blue-900">{sheet.studentName || "................................................"}</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>ชั้น: <b>{sheet.classroom || "-"}</b></span>
            <span>เลขที่: <b>{sheet.seatNo != null ? sheet.seatNo : "-"}</b></span>
            <span className="font-bold text-blue-900">ID: {sheet.studentId}</span>
          </div>
        </div>
      </div>

      {/* Middle: Digits & Items in 2 Cols */}
      <div className="grid grid-cols-12 gap-2.5 items-center my-0.5">
        {/* Student ID Bubbles */}
        <div className="col-span-4 border-r border-slate-300 pr-1.5">
          <div className="text-[7.5px] font-bold text-center mb-0.5 text-slate-700">รหัสนักเรียน 5 หลัก</div>
          <div className="flex justify-center gap-1 mb-0.5">
            {digits.map((d, dIdx) => (
              <div key={dIdx} className="w-3.5 h-3.5 border border-black flex items-center justify-center font-mono text-[8px] font-bold bg-white">
                {isPreSlugged ? d : ""}
              </div>
            ))}
          </div>
          <div className="space-y-0.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <div key={num} className="flex justify-center gap-1 items-center">
                {digits.map((d, dIdx) => {
                  const isMarked = isPreSlugged && parseInt(d, 10) === num;
                  return (
                    <div
                      key={dIdx}
                      className={`w-3 h-3 rounded-full border border-black flex items-center justify-center text-[7px] font-bold ${
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

        {/* Multiple Choice Items (Supports 20 or 25 Items in 2 Columns) */}
        <div className="col-span-8 grid grid-cols-2 gap-2">
          <MultipleChoiceColumn
            startItem={1}
            endItem={totalItems <= 20 ? 10 : Math.min(13, totalItems)}
            colTitle={`ข้อ 1 - ${totalItems <= 20 ? 10 : Math.min(13, totalItems)}`}
            bubbleSize="w-3 h-3 text-[7px]"
            itemPadding="py-0"
            choiceCount={choiceCount}
          />
          <MultipleChoiceColumn
            startItem={totalItems <= 20 ? 11 : 14}
            endItem={totalItems}
            colTitle={`ข้อ ${totalItems <= 20 ? 11 : 14} - ${totalItems}`}
            bubbleSize="w-3 h-3 text-[7px]"
            itemPadding="py-0"
            choiceCount={choiceCount}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-300 pt-0.5 flex justify-between items-center text-[7.5px] text-slate-500">
        <span>กุดจับประชาสรรค์ • Half-A4 Compact (Rev 9.0)</span>
        <span>ช่องคะแนน: ปรนัย [ _____ ] {hasSubjective && "อัตนัย [ _____ ]"}</span>
      </div>
    </div>
  );
}

/**
 * 📑 OmrTwoUpA4Sheet: Renders 2 complete answer sheets on 1 A4 page (Top & Bottom)
 */
export function OmrTwoUpA4Sheet({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 20,
  choiceCount = 4,
  subjectiveItems = [],
  sheetTop,
  sheetBottom,
  isPreSlugged = true
}: OmrTwoUpA4SheetProps) {
  const bottomSheet = sheetBottom || {
    sheetToken: `${sheetTop.sheetToken}_b`,
    studentId: "00000",
    studentName: "........................................................",
    classroom: gradeLevel,
    seatNo: null
  };

  return (
    <div className="omr-a4-sheet relative bg-white text-black font-sans box-border overflow-hidden select-none flex flex-col justify-between h-full p-[4mm]">
      {/* Top Half Sheet */}
      <div className="flex-1 overflow-hidden">
        <HalfSheetCard
          paperTitle={paperTitle}
          subjectCode={subjectCode}
          subjectName={subjectName}
          academicYear={academicYear}
          term={term}
          gradeLevel={gradeLevel}
          totalItems={totalItems}
          choiceCount={choiceCount}
          subjectiveItems={subjectiveItems}
          sheet={sheetTop}
          isPreSlugged={isPreSlugged && sheetTop.studentId !== "00000"}
        />
      </div>

      {/* Center Dashed Cutting Line */}
      <div className="relative py-1 flex items-center justify-center my-1">
        <div className="w-full border-t-2 border-dashed border-slate-400" />
        <span className="absolute bg-white px-3 text-[8.5px] font-mono text-slate-600 font-bold flex items-center gap-1.5 border border-slate-300 rounded-full py-0.5">
          ✂ ตัดตามรอยประ (Half-A4 ประหยัดกระดาษ) ✂
        </span>
      </div>

      {/* Bottom Half Sheet */}
      <div className="flex-1 overflow-hidden">
        <HalfSheetCard
          paperTitle={paperTitle}
          subjectCode={subjectCode}
          subjectName={subjectName}
          academicYear={academicYear}
          term={term}
          gradeLevel={gradeLevel}
          totalItems={totalItems}
          choiceCount={choiceCount}
          subjectiveItems={subjectiveItems}
          sheet={bottomSheet}
          isPreSlugged={isPreSlugged && bottomSheet.studentId !== "00000"}
        />
      </div>
    </div>
  );
}
