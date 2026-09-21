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
 * Multiple-choice column rendering only the active range up to totalItems.
 * If startItem > totalItems, returns null (omitted completely).
 */
function MultipleChoiceColumn({
  startItem,
  endItem,
  totalItems,
  colTitle = "ข้อสอบปรนัย",
  bubbleSize = "w-3.5 h-3.5 text-[7px]",
  itemPadding = "py-0",
  showHeaders = true,
  choiceCount = 4
}: {
  startItem: number;
  endItem: number;
  totalItems: number;
  colTitle?: string;
  bubbleSize?: string;
  itemPadding?: string;
  showHeaders?: boolean;
  choiceCount?: number;
}) {
  if (startItem > totalItems) return null;

  // Cut off at totalItems so students cannot bubble beyond the designated exam items
  const actualEnd = Math.min(endItem, totalItems);
  const items = Array.from({ length: Math.max(0, actualEnd - startItem + 1) }, (_, idx) => startItem + idx);
  const choices = ALL_CHOICE_LABELS.slice(0, Math.min(6, Math.max(2, choiceCount)));

  return (
    <div className="border border-slate-700 p-1 rounded bg-white">
      {showHeaders && (
        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-800 border-b border-slate-300 pb-0.5 mb-0.5 px-0.5">
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
          <div key={itemNo} className={`flex items-center gap-1 text-[8px] px-0.5 ${itemPadding}`}>
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
 * Flexible Subjective Score Bubbles (0 - 30 points) for Teacher Grading inside Scan Zone
 */
function SubjectiveScoreBubbles({
  subjectiveItems = []
}: {
  subjectiveItems: SubjectivePrintItem[];
}) {
  if (subjectiveItems.length === 0) return null;

  return (
    <div className="border border-indigo-300 rounded p-1.5 bg-indigo-50/40 space-y-1.5">
      <div className="text-[8.5px] font-bold text-indigo-950 flex justify-between items-center border-b border-indigo-200 pb-0.5">
        <span>ช่องฝนคะแนนอัตนัย (สำหรับครูผู้ตรวจ • 0-30 คะแนน):</span>
        <span className="text-indigo-700 text-[8px]">ฝนในกรอบสแกน</span>
      </div>

      <div className="space-y-1">
        {subjectiveItems.slice(0, 3).map((sItem) => {
          const maxS = Math.min(30, Math.max(1, Math.floor(Number(sItem.maxScore || 5))));
          const isDirect = maxS <= 10;

          return (
            <div key={sItem.itemNo} className="text-[8px] bg-white p-1 rounded border border-indigo-100">
              <div className="flex justify-between items-center font-bold text-slate-800 mb-0.5">
                <span>ข้อที่ {sItem.itemNo}: {sItem.title}</span>
                <span className="text-indigo-900 font-mono">เต็ม {maxS} คะแนน</span>
              </div>

              {isDirect ? (
                /* Simple row: 0 to maxS */
                <div className="flex items-center gap-1">
                  <span className="text-[7.5px] font-bold text-slate-500 w-10">คะแนน:</span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: maxS + 1 }, (_, i) => i).map((score) => (
                      <div
                        key={score}
                        className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[7px] bg-white text-black"
                      >
                        {score}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* 2 Rows: Tens (0-3) and Units (0-9) for flexible 0-30 points */
                <div className="space-y-0.5">
                  {/* Tens */}
                  <div className="flex items-center gap-1">
                    <span className="text-[7.5px] font-bold text-slate-500 w-10">หลักสิบ:</span>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((tensVal) => (
                        <div
                          key={tensVal}
                          className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[7px] bg-white text-black"
                        >
                          {tensVal}
                        </div>
                      ))}
                    </div>
                    <span className="text-[7px] text-slate-400 ml-1">(0, 10, 20, 30)</span>
                  </div>

                  {/* Units */}
                  <div className="flex items-center gap-1">
                    <span className="text-[7.5px] font-bold text-slate-500 w-10">หลักหน่วย:</span>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((uVal) => (
                        <div
                          key={uVal}
                          className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[7px] bg-white text-black"
                        >
                          {uVal}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Full A4 OMR Answer Sheet (Standard Tiers: 20, 40, 60, 80, 100)
 * 
 * Safe Marker Architecture:
 * - 4 Corner markers (12mm x 12mm solid black) placed at corners of Scan Zone
 * - Safe margins (px-[22mm], pt-[6mm], pb-[18mm]) ensure markers NEVER touch headers or bubbles!
 * - Automatic tier selection: <=20, <=40, <=60, <=80, <=100
 * - Columns render ONLY up to totalItems (surplus items cut off)
 * - Subjective exam section (Part 2) has clean divider without scissors / cut lines
 */
export function OmrAnswerSheet({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 40,
  choiceCount = 4,
  subjectiveItems = [],
  sheet,
  isPreSlugged = true
}: OmrAnswerSheetProps) {
  const digits = (sheet.studentId || "").padStart(5, "0").slice(-5).split("");
  const hasSubjective = subjectiveItems.length > 0;
  const totalSubjectiveScore = subjectiveItems.reduce((acc, cur) => acc + Number(cur.maxScore || 0), 0);
  const actualChoices = ALL_CHOICE_LABELS.slice(0, Math.min(6, Math.max(2, choiceCount)));

  // Tier designation: 20, 40, 60, 80, 100
  const tierMax = totalItems <= 20 ? 20 : totalItems <= 40 ? 40 : totalItems <= 60 ? 60 : totalItems <= 80 ? 80 : 100;
  const tierName = `KP-OMR-A4-${tierMax}`;

  return (
    <div className="omr-print-container">
      {/* 📄 PAGE 1: OMR ANSWER SHEET (A4: 210mm x 297mm) */}
      <div className="omr-a4-sheet relative bg-white text-black font-sans box-border overflow-hidden select-none w-[210mm] h-[297mm] p-[6mm] flex flex-col justify-between">
        
        {/* ========================================================================= */}
        {/* 1. COMPACT SCAN ZONE (Height: ~162mm)                                     */}
        {/* 4 Corner Markers at 6mm from edges with 22mm content padding safe zone    */}
        {/* ========================================================================= */}
        <div className="relative border border-slate-300 rounded px-[22mm] pt-[6mm] pb-[16mm] min-h-[162mm] flex flex-col justify-between bg-white">
          
          {/* 4 Corner Fiducial Markers (12mm x 12mm) - Isolated with Safe Margins */}
          <div className="absolute top-[4mm] left-[4mm] w-[12mm] h-[12mm] bg-black" />
          <div className="absolute top-[4mm] right-[4mm] w-[12mm] h-[12mm] bg-black" />
          <div className="absolute bottom-[4mm] left-[4mm] w-[12mm] h-[12mm] bg-black" />
          <div className="absolute bottom-[4mm] right-[4mm] w-[12mm] h-[12mm] bg-black" />

          {/* Top Bar: School Header & Cryptographic QR */}
          <div>
            <div className="flex items-start justify-between border-b border-black pb-1">
              <div>
                <div className="text-[13px] font-bold tracking-tight">
                  โรงเรียนกุดจับประชาสรรค์ • กระดาษคำตอบมาตรฐาน ({tierName} Rev 9.1)
                </div>
                <div className="text-[11.5px] font-semibold text-slate-800">
                  {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
                </div>
                <div className="text-[9.5px] text-slate-600">
                  ปีการศึกษา {academicYear} ภาคเรียนที่ {term} • ปรนัย {totalItems} ข้อ ({actualChoices.join(",")})
                  {hasSubjective ? ` • อัตนัย ${subjectiveItems.length} ข้อ (${totalSubjectiveScore} คะแนน)` : ""}
                </div>
              </div>

              {/* Zero-PII QR Code */}
              <div className="flex flex-col items-center pl-2 shrink-0">
                <QRCodeSVG
                  value={sheet.sheetToken}
                  size={42}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[7px] font-mono text-slate-600 mt-0.5">
                  {sheet.sheetToken.slice(-10)}
                </span>
              </div>
            </div>

            {/* Student Info Bar */}
            <div className="mt-1 flex items-center justify-between border border-black px-2 py-0.5 rounded text-[9.5px] bg-slate-50/60">
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

          {/* Middle Row: Student ID (5 Digits) + Version (01-04) + Subjective Scoring */}
          <div className="my-1 grid grid-cols-12 gap-2 items-start border-y border-slate-300 py-1">
            {/* Student ID Bubble Matrix */}
            <div className="col-span-5 border-r border-slate-300 pr-2">
              <div className="text-[8.5px] font-bold text-center mb-0.5 text-slate-700">
                [ รหัสประจำตัวนักเรียน 5 หลัก ]
              </div>
              
              {/* Digit text boxes */}
              <div className="flex justify-center gap-1 mb-0.5">
                {digits.map((d, dIdx) => (
                  <div
                    key={dIdx}
                    className="w-3.5 h-3.5 border border-black flex items-center justify-center font-mono text-[8.5px] font-bold bg-white"
                  >
                    {isPreSlugged ? d : ""}
                  </div>
                ))}
              </div>

              {/* Rows 0 to 9 */}
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

            {/* Version Code + Teacher Subjective Scoring (0-30 pts) */}
            <div className="col-span-7 flex flex-col justify-between h-full pl-1 space-y-1">
              <div>
                <div className="text-[8.5px] font-bold mb-0.5 text-slate-700">
                  [ ชุดข้อสอบ ]
                </div>
                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded border border-slate-200">
                  {["01", "02", "03", "04"].map((ver, vIdx) => (
                    <div key={ver} className="flex items-center gap-1 text-[8.5px]">
                      <span className="font-semibold">{vIdx + 1}</span>
                      <div className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[7px] font-bold bg-white">
                        {vIdx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flexible Subjective Scoring (0-30 points) or Instructions */}
              {hasSubjective ? (
                <SubjectiveScoreBubbles subjectiveItems={subjectiveItems} />
              ) : (
                <div className="text-[8.5px] text-slate-600 space-y-0.5 bg-amber-50/70 border border-amber-200 p-1.5 rounded">
                  <div className="font-bold text-amber-900">คำชี้แจง:</div>
                  <div>• ใช้ดินสอดำ 2B ฝนในวงกลมให้เข้มเต็มวง</div>
                  <div>• หากเปลี่ยนคำตอบ ให้ลบให้สะอาดหมดจด</div>
                  <div className="flex items-center gap-3 pt-0.5 text-[7.5px] font-mono">
                    <span className="text-emerald-700 font-bold">✓ ถูก: <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" /></span>
                    <span className="text-rose-700 font-bold">✗ ห้าม: <span className="w-2.5 h-2.5 rounded-full border border-black inline-flex items-center justify-center text-[7px]">✓</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Bubbles Grid: Structured by Standardized Tiers */}
          <div className="my-0.5">
            {tierMax === 20 ? (
              /* 20 ITEMS: 2 Columns of 10 items (Col 1: 1-10, Col 2: 11-20) */
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={10}
                  totalItems={totalItems}
                  colTitle="ข้อ 1 - 10"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={11}
                  endItem={20}
                  totalItems={totalItems}
                  colTitle="ข้อ 11 - 20"
                  choiceCount={choiceCount}
                />
              </div>
            ) : tierMax === 40 ? (
              /* 40 ITEMS: 2 Columns of 20 items (Col 1: 1-20, Col 2: 21-40) */
              <div className="grid grid-cols-2 gap-3">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={20}
                  totalItems={totalItems}
                  colTitle="ข้อ 1 - 20"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={21}
                  endItem={40}
                  totalItems={totalItems}
                  colTitle={`ข้อ 21 - ${totalItems}`}
                  choiceCount={choiceCount}
                />
              </div>
            ) : tierMax === 60 ? (
              /* 60 ITEMS: 3 Columns of 20 items */
              <div className="grid grid-cols-3 gap-2">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={20}
                  totalItems={totalItems}
                  colTitle="ข้อ 1 - 20"
                  bubbleSize="w-3 h-3 text-[7px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={21}
                  endItem={40}
                  totalItems={totalItems}
                  colTitle="ข้อ 21 - 40"
                  bubbleSize="w-3 h-3 text-[7px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={41}
                  endItem={60}
                  totalItems={totalItems}
                  colTitle={`ข้อ 41 - ${totalItems}`}
                  bubbleSize="w-3 h-3 text-[7px]"
                  choiceCount={choiceCount}
                />
              </div>
            ) : tierMax === 80 ? (
              /* 80 ITEMS: 4 Columns of 20 items */
              <div className="grid grid-cols-4 gap-1.5">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={20}
                  totalItems={totalItems}
                  colTitle="1 - 20"
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={21}
                  endItem={40}
                  totalItems={totalItems}
                  colTitle="21 - 40"
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={41}
                  endItem={60}
                  totalItems={totalItems}
                  colTitle="41 - 60"
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={61}
                  endItem={80}
                  totalItems={totalItems}
                  colTitle={`61 - ${totalItems}`}
                  bubbleSize="w-3 h-3 text-[6.5px]"
                  choiceCount={choiceCount}
                />
              </div>
            ) : (
              /* 100 ITEMS: 5 Columns of 20 items */
              <div className="grid grid-cols-5 gap-1">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={20}
                  totalItems={totalItems}
                  colTitle="1 - 20"
                  bubbleSize="w-2.5 h-2.5 text-[6px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={21}
                  endItem={40}
                  totalItems={totalItems}
                  colTitle="21 - 40"
                  bubbleSize="w-2.5 h-2.5 text-[6px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={41}
                  endItem={60}
                  totalItems={totalItems}
                  colTitle="41 - 60"
                  bubbleSize="w-2.5 h-2.5 text-[6px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={61}
                  endItem={80}
                  totalItems={totalItems}
                  colTitle="61 - 80"
                  bubbleSize="w-2.5 h-2.5 text-[6px]"
                  choiceCount={choiceCount}
                />
                <MultipleChoiceColumn
                  startItem={81}
                  endItem={100}
                  totalItems={totalItems}
                  colTitle={`81 - ${totalItems}`}
                  bubbleSize="w-2.5 h-2.5 text-[6px]"
                  choiceCount={choiceCount}
                />
              </div>
            )}
          </div>

          <div className="text-[7px] text-slate-400 text-center font-mono pt-0.5">
            [ สิ้นสุดพื้นที่สแกน OMR Scan Zone • {tierName} Rev 9.1 ]
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. LOWER SECTION: SUBJECTIVE WRITING / WORKSPACE (NO CUTTING LINES!)      */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-between border-t-2 border-slate-700 pt-2 mt-2">
          {hasSubjective ? (
            <div className="space-y-1.5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-indigo-300 pb-1 mb-1">
                  <span className="text-[11.5px] font-bold text-indigo-950">
                    ตอนที่ 2: แบบทดสอบอัตนัย (เขียนตอบ)
                  </span>
                  <span className="text-[9.5px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                    คะแนนเต็มรวม {totalSubjectiveScore} คะแนน
                  </span>
                </div>

                <div className="space-y-1.5">
                  {subjectiveItems.map((sItem) => (
                    <div key={sItem.itemNo} className="text-[9.5px] border border-slate-300 rounded p-2 bg-white">
                      <div className="flex justify-between items-center font-bold text-slate-900 border-b border-slate-200 pb-0.5">
                        <span>ข้อที่ {sItem.itemNo}: {sItem.title}</span>
                        <span className="text-indigo-900 font-mono text-[9px]">({sItem.maxScore} คะแนน)</span>
                      </div>
                      {sItem.rubricDetail && (
                        <div className="text-[8px] text-slate-500 italic mt-0.5">
                          เกณฑ์: {sItem.rubricDetail}
                        </div>
                      )}
                      {/* Lined handwriting response area */}
                      <div className="mt-1 h-20 border border-dotted border-slate-300 rounded bg-slate-50/50 p-1.5 text-[8px] text-slate-400 relative">
                        <span>(พื้นที่เขียนตอบสำหรับนักเรียน)</span>
                        <div className="absolute inset-x-2 top-6 border-b border-dotted border-slate-200" />
                        <div className="absolute inset-x-2 top-11 border-b border-dotted border-slate-200" />
                        <div className="absolute inset-x-2 top-16 border-b border-dotted border-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-0.5 flex justify-between items-center text-[8.5px] text-slate-500">
                <span>ครูผู้ตรวจ: กรุณานำคะแนนไปฝนลงในช่องคะแนนอัตนัยใน Scan Zone ด้านบนเพื่อตรวจด้วยระบบ</span>
                <span className="font-mono font-bold">KP-OMR Rev 9.1</span>
              </div>
            </div>
          ) : (
            /* Workspace */
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="text-[10.5px] font-bold text-slate-700 border-b border-slate-300 pb-0.5 mb-1">
                  พื้นที่สำหรับทดเลข / ร่างคำตอบ (Scratchpad Workspace)
                </div>
                <div className="h-32 border border-dotted border-slate-300 rounded bg-white p-2 text-[8.5px] text-slate-400">
                  (นักเรียนสามารถทดเลขหรือร่างคำตอบในบริเวณนี้ได้ โดยไม่มีผลต่อการสแกนตรวจคำตอบ)
                </div>
              </div>
              <div className="text-[8px] text-slate-500 text-center border-t border-slate-200 pt-0.5">
                โรงเรียนกุดจับประชาสรรค์ • ระบบบริหารจัดการวิชาการอิเล็กทรอนิกส์
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-[7.5px] text-slate-400 border-t border-slate-200 pt-0.5 text-center flex justify-between items-center mt-1">
            <span>โรงเรียนกุดจับประชาสรรค์ • Smart Academic Exam System</span>
            <span className="font-mono">
              {tierName} (Rev. 9.1 Standard)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * Single Half-A4 Slip (for 2-up printing of 20-item exams)
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
    <div className="relative h-[138mm] box-border p-[4mm] px-[12mm] flex flex-col justify-between bg-white text-black select-none border border-slate-300 rounded">
      {/* 4 Corner Markers (10mm x 10mm) */}
      <div className="absolute top-[3mm] left-[3mm] w-[10mm] h-[10mm] bg-black" />
      <div className="absolute top-[3mm] right-[3mm] w-[10mm] h-[10mm] bg-black" />
      <div className="absolute bottom-[3mm] left-[3mm] w-[10mm] h-[10mm] bg-black" />
      <div className="absolute bottom-[3mm] right-[3mm] w-[10mm] h-[10mm] bg-black" />

      {/* Top Bar */}
      <div>
        <div className="flex items-start justify-between border-b border-black pb-0.5">
          <div>
            <div className="text-[11.5px] font-bold">
              โรงเรียนกุดจับประชาสรรค์ • กระดาษคำตอบ (Half-A4 Rev 9.1)
            </div>
            <div className="text-[10px] font-semibold text-slate-800">
              {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
            </div>
            <div className="text-[8px] text-slate-600">
              ปีการศึกษา {academicYear}/{term} • ปรนัย {totalItems} ข้อ ({actualChoices.join(",")}) {hasSubjective ? `• อัตนัย ${subjectiveItems.length} ข้อ` : ""}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeSVG value={sheet.sheetToken} size={34} level="M" includeMargin={false} />
            <span className="text-[6px] font-mono text-slate-600 mt-0.5">{sheet.sheetToken.slice(-10)}</span>
          </div>
        </div>

        {/* Student Bar */}
        <div className="mt-1 flex items-center justify-between border border-black px-2 py-0.5 rounded text-[9px] bg-slate-50/50">
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

      {/* Middle: Digits & 2 Cols of 10 */}
      <div className="grid grid-cols-12 gap-2 items-center my-0.5">
        {/* Student ID */}
        <div className="col-span-4 border-r border-slate-300 pr-1.5">
          <div className="text-[7px] font-bold text-center mb-0.5 text-slate-700">รหัสนักเรียน 5 หลัก</div>
          <div className="flex justify-center gap-1 mb-0.5">
            {digits.map((d, dIdx) => (
              <div key={dIdx} className="w-3 h-3 border border-black flex items-center justify-center font-mono text-[7.5px] font-bold bg-white">
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
                      className={`w-2.5 h-2.5 rounded-full border border-black flex items-center justify-center text-[6px] font-bold ${
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

        {/* 2 Cols of 10 items (Col 1: 1-10, Col 2: 11-20) */}
        <div className="col-span-8 grid grid-cols-2 gap-2">
          <MultipleChoiceColumn
            startItem={1}
            endItem={10}
            totalItems={totalItems}
            colTitle="ข้อ 1 - 10"
            bubbleSize="w-3 h-3 text-[6.5px]"
            itemPadding="py-0"
            choiceCount={choiceCount}
          />
          <MultipleChoiceColumn
            startItem={11}
            endItem={20}
            totalItems={totalItems}
            colTitle="ข้อ 11 - 20"
            bubbleSize="w-3 h-3 text-[6.5px]"
            itemPadding="py-0"
            choiceCount={choiceCount}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-300 pt-0.5 flex justify-between items-center text-[7px] text-slate-500">
        <span>กุดจับประชาสรรค์ • Half-A4 Mode (Rev 9.1)</span>
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

      {/* Divider between the 2 half sheets */}
      <div className="py-1 flex items-center justify-center my-0.5">
        <div className="w-full border-t border-dashed border-slate-400" />
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
