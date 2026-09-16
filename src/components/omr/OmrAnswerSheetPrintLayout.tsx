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
  subjectiveItems?: SubjectivePrintItem[];
  sheetTop: PrintedSheetItem;
  sheetBottom?: PrintedSheetItem | null;
  isPreSlugged?: boolean;
}

/**
 * Helper: Render a multiple-choice column
 */
function MultipleChoiceColumn({
  startItem,
  endItem,
  colTitle = "ตอนที่ 1 (ปรนัย)",
  bubbleSize = "w-4 h-4 text-[8px]",
  itemPadding = "py-0.5",
  showHeaders = true
}: {
  startItem: number;
  endItem: number;
  colTitle?: string;
  bubbleSize?: string;
  itemPadding?: string;
  showHeaders?: boolean;
}) {
  const items = Array.from({ length: Math.max(0, endItem - startItem + 1) }, (_, idx) => startItem + idx);

  return (
    <div className="border border-black p-1.5 rounded bg-white">
      {showHeaders && (
        <div className="flex items-center gap-2.5 text-[9px] font-bold text-slate-700 border-b border-slate-300 pb-1 mb-1 px-1">
          <span className="w-6 text-right pr-1 truncate">{colTitle}</span>
          <div className="flex gap-2.5 sm:gap-3 pr-1 font-mono">
            <span className="w-4 text-center">(A)</span>
            <span className="w-4 text-center">(B)</span>
            <span className="w-4 text-center">(C)</span>
            <span className="w-4 text-center">(D)</span>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {items.map((itemNo) => (
          <div key={itemNo} className={`flex items-center gap-2.5 text-[10px] px-1 ${itemPadding}`}>
            <span className="w-6 font-bold font-mono text-slate-700 text-right pr-1">
              {itemNo}.
            </span>
            <div className="flex gap-2.5 sm:gap-3 pr-1">
              {["A", "B", "C", "D"].map((choice) => (
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
 * Full A4 OMR Answer Sheet (Supports 20, 50, 75, 100 items + Subjective Section)
 */
export function OmrAnswerSheet({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 50,
  subjectiveItems = [],
  sheet,
  isPreSlugged = true
}: OmrAnswerSheetProps) {
  const digits = (sheet.studentId || "").padStart(5, "0").slice(-5).split("");
  const hasSubjective = subjectiveItems.length > 0;

  // Tier 1 (KP-OMR-A4-25): <= 25 items (1-page full layout with large subjective area)
  const isTier25 = totalItems <= 25;
  // Tier 2+: > 25 items + subjective (requires Page 2 Duplex)
  const isRuleC = !isTier25 && hasSubjective;

  const totalSubjectiveScore = subjectiveItems.reduce((acc, cur) => acc + Number(cur.maxScore || 0), 0);

  return (
    <div className="omr-print-container">
      {/* 📄 PAGE 1: OMR ANSWER SHEET */}
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
                  โรงเรียนกุดจับประชาสรรค์ • แบบทดสอบมาตรฐาน (KP-OMR)
                </div>
                <div className="text-[13px] font-semibold text-slate-800 mt-0.5">
                  {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  ปีการศึกษา {academicYear} ภาคเรียนที่ {term} • ปรนัย {totalItems} ข้อ
                  {hasSubjective ? ` • อัตนัย ${subjectiveItems.length} ข้อ (${totalSubjectiveScore} คะแนน)` : ""}
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
                <div className="text-[10px] font-bold text-slate-700">คะแนนที่ได้ (สำหรับครูผู้ตรวจ)</div>
                <div className="h-7 border border-dashed border-slate-400 mt-1 rounded bg-white flex items-center justify-around text-[10px] text-slate-600 font-mono font-bold">
                  <span>ปรนัย: _____</span>
                  {hasSubjective && <span>อัตนัย: _____</span>}
                </div>
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
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
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

          {/* Questions Grid: Dynamic Tiers (20, 50, 75, 100) */}
          <div className="my-1">
            {/* TIER 1: <= 25 Items (KP-OMR-A4-25) */}
            {isTier25 ? (
              <div className="grid grid-cols-12 gap-5">
                {/* Column 1: Items 1 - 20 (Left col-span-5) */}
                <div className={hasSubjective ? "col-span-5" : "col-span-6"}>
                  <MultipleChoiceColumn
                    startItem={1}
                    endItem={totalItems}
                    colTitle={`ตอนที่ 1 (ปรนัย ${totalItems} ข้อ)`}
                    bubbleSize="w-4.5 h-4.5 text-[9px]"
                    itemPadding="py-1"
                  />
                </div>

                {/* Right Side: Large Subjective Section OR Workspace / Pledge */}
                <div className={hasSubjective ? "col-span-7" : "col-span-6"}>
                  {hasSubjective ? (
                    <div className="border-2 border-indigo-900 p-3 rounded bg-indigo-50/20 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-center border-b border-indigo-300 pb-1.5 mb-2">
                          <span className="text-[12px] font-bold text-indigo-950">
                            ตอนที่ 2: แบบทดสอบอัตนัย (เขียนตอบ)
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                            รวม {totalSubjectiveScore} คะแนน
                          </span>
                        </div>

                        <div className="space-y-3">
                          {subjectiveItems.map((sItem) => (
                            <div key={sItem.itemNo} className="text-[11px] border-b border-dashed border-slate-300 pb-2">
                              <div className="flex justify-between items-center font-bold text-slate-900">
                                <span>ข้อที่ {sItem.itemNo}: {sItem.title}</span>
                                <span className="text-indigo-900 font-mono text-[10px]">({sItem.maxScore} คะแนน)</span>
                              </div>
                              {sItem.rubricDetail && (
                                <div className="text-[9px] text-slate-500 italic mt-0.5">
                                  เกณฑ์: {sItem.rubricDetail}
                                </div>
                              )}
                              {/* Large handwriting response area */}
                              <div className="mt-1.5 h-28 border border-slate-300 rounded bg-white p-2 text-[9px] text-slate-400 relative">
                                <span>(พื้นที่เขียนตอบของนักเรียน)</span>
                                <div className="absolute inset-x-2 top-7 border-b border-dotted border-slate-200" />
                                <div className="absolute inset-x-2 top-14 border-b border-dotted border-slate-200" />
                                <div className="absolute inset-x-2 top-21 border-b border-dotted border-slate-200" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-2 border-t border-indigo-200 pt-2 flex justify-between items-center text-[10px] text-indigo-950 font-bold">
                        <span>ช่องบันทึกคะแนนอัตนัย (ครูผู้ตรวจ):</span>
                        <div className="w-20 h-7 border border-black rounded bg-white flex items-center justify-center font-mono text-slate-400 text-[10px]">
                          ___ / {totalSubjectiveScore}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* No Subjective: Spacious Scratch / Workspace Area */
                    <div className="border border-dashed border-slate-400 p-4 rounded-lg bg-slate-50/50 flex flex-col justify-between h-full">
                      <div>
                        <div className="text-[11px] font-bold text-slate-700 border-b border-slate-300 pb-1 mb-2">
                          พื้นที่สำหรับทดเลข / บันทึกเพิ่มเติม (Workspace)
                        </div>
                        <div className="h-60 border border-dotted border-slate-300 rounded bg-white p-3 text-[10px] text-slate-400">
                          (นักเรียนสามารถทดเลขหรือร่างคำตอบในบริเวณนี้ได้)
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-500 text-center border-t border-slate-200 pt-1">
                        แบบทดสอบความแม่นยำสูง (High-Precision OMR Tier 1) • โรงเรียนกุดจับประชาสรรค์
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : totalItems <= 50 ? (
              /* TIER 2: 21 - 50 Items (2 Columns of 25) */
              <div className="grid grid-cols-2 gap-5">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={Math.min(25, totalItems)}
                  colTitle="ตอนที่ 1 (ข้อ 1 - 25)"
                />

                {isRuleB ? (
                  /* Rule B: Subjective fits in Column 2 */
                  <div className="border-2 border-indigo-900 p-2.5 rounded bg-indigo-50/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b border-indigo-300 pb-1 mb-2">
                        <span className="text-[11px] font-bold text-indigo-950">ตอนที่ 2: แบบทดสอบอัตนัย (เขียนตอบ)</span>
                        <span className="text-[9px] font-semibold text-indigo-700">รวม {totalSubjectiveScore} คะแนน</span>
                      </div>

                      <div className="space-y-2">
                        {subjectiveItems.map((sItem) => (
                          <div key={sItem.itemNo} className="text-[10px] border-b border-dashed border-slate-300 pb-2">
                            <div className="flex justify-between font-semibold text-slate-900">
                              <span>ข้อ {sItem.itemNo}: {sItem.title}</span>
                              <span className="text-indigo-800">({sItem.maxScore} คะแนน)</span>
                            </div>
                            <div className="mt-1 h-14 border border-slate-300 rounded bg-white p-1 text-[8px] text-slate-400">
                              (พื้นที่เขียนตอบของนักเรียน)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 border-t border-indigo-200 pt-1.5 flex justify-between items-center text-[9px] text-indigo-900 font-bold">
                      <span>ช่องบันทึกคะแนนอัตนัย (ครูผู้ตรวจ):</span>
                      <div className="w-16 h-6 border border-black rounded bg-white" />
                    </div>
                  </div>
                ) : (
                  <MultipleChoiceColumn
                    startItem={26}
                    endItem={totalItems}
                    colTitle={`ตอนที่ 1 (ข้อ 26 - ${totalItems})`}
                  />
                )}
              </div>
            ) : totalItems <= 75 ? (
              /* TIER 3: 51 - 75 Items (3 Columns of 25) */
              <div className="grid grid-cols-3 gap-3">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={25}
                  colTitle="ข้อ 1 - 25"
                  bubbleSize="w-4 h-4 text-[8px]"
                />
                <MultipleChoiceColumn
                  startItem={26}
                  endItem={50}
                  colTitle="ข้อ 26 - 50"
                  bubbleSize="w-4 h-4 text-[8px]"
                />
                <MultipleChoiceColumn
                  startItem={51}
                  endItem={totalItems}
                  colTitle={`ข้อ 51 - ${totalItems}`}
                  bubbleSize="w-4 h-4 text-[8px]"
                />
              </div>
            ) : (
              /* TIER 4: 76 - 100 Items (4 Columns of 25) */
              <div className="grid grid-cols-4 gap-2">
                <MultipleChoiceColumn
                  startItem={1}
                  endItem={25}
                  colTitle="1 - 25"
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  itemPadding="py-0"
                />
                <MultipleChoiceColumn
                  startItem={26}
                  endItem={50}
                  colTitle="26 - 50"
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  itemPadding="py-0"
                />
                <MultipleChoiceColumn
                  startItem={51}
                  endItem={75}
                  colTitle="51 - 75"
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  itemPadding="py-0"
                />
                <MultipleChoiceColumn
                  startItem={76}
                  endItem={totalItems}
                  colTitle={`76 - ${totalItems}`}
                  bubbleSize="w-3.5 h-3.5 text-[7px]"
                  itemPadding="py-0"
                />
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="text-[9px] text-slate-500 border-t border-slate-300 pt-1 text-center flex justify-between items-center">
            <span>โรงเรียนกุดจับประชาสรรค์ • ระบบบริหารจัดการวิชาการอิเล็กทรอนิกส์</span>
            <span className="font-mono">
              KP-OMR-A4-{totalItems <= 20 ? "20" : totalItems <= 50 ? "50" : totalItems <= 75 ? "75" : "100"} (Rev. 8.3)
            </span>
          </div>
        </div>
      </div>

      {/* 📄 PAGE 2 (DUPLEX): SUBJECTIVE SECTION 2 FOR RULE C (> 25 items + subjective) */}
      {isRuleC && (
        <div className="omr-a4-sheet relative bg-white text-black font-sans box-border overflow-hidden select-none break-before-page mt-8 print:mt-0">
          <div className="pt-[14mm] pb-[14mm] px-[22mm] h-full flex flex-col justify-between">
            {/* Page 2 Header */}
            <div>
              <div className="flex items-start justify-between border-b-2 border-black pb-2">
                <div>
                  <div className="text-[15px] font-bold">
                    โรงเรียนกุดจับประชาสรรค์ • ตอนที่ 2 แบบทดสอบอัตนัย (เขียนตอบ)
                  </div>
                  <div className="text-[12px] font-semibold text-slate-800 mt-0.5">
                    {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
                  </div>
                </div>
                <div className="text-right text-[11px] font-bold">
                  <div>รหัสนักเรียน: {sheet.studentId}</div>
                  <div className="text-slate-600 font-normal">ชั้น: {sheet.classroom || "-"} เลขที่: {sheet.seatNo || "-"}</div>
                </div>
              </div>

              {/* Subjective Items Writing Canvas */}
              <div className="mt-4 space-y-4">
                {subjectiveItems.map((sItem) => (
                  <div key={sItem.itemNo} className="border border-black p-3 rounded bg-slate-50/30">
                    <div className="flex justify-between items-center font-bold text-[12px] border-b border-slate-300 pb-1">
                      <span>ข้อที่ {sItem.itemNo}: {sItem.title}</span>
                      <span className="text-indigo-900 font-mono">คะแนนเต็ม {sItem.maxScore} คะแนน</span>
                    </div>
                    {sItem.rubricDetail && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                        เกณฑ์การให้คะแนน: {sItem.rubricDetail}
                      </div>
                    )}
                    <div className="mt-2 h-44 border border-dashed border-slate-400 rounded bg-white p-2 text-[9px] text-slate-400">
                      (พื้นที่เขียนตอบสำหรับนักเรียน)
                    </div>
                    <div className="mt-2 flex justify-end items-center gap-2 text-[10px] font-bold">
                      <span>คะแนนที่ได้ (ครูผู้ตรวจ):</span>
                      <div className="w-16 h-7 border border-black rounded bg-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page 2 Footer */}
            <div className="text-[9px] text-slate-500 border-t border-slate-300 pt-1 text-center">
              หน้า 2/2 • แบบทดสอบอัตนัย • โรงเรียนกุดจับประชาสรรค์
            </div>
          </div>
        </div>
      )}
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
  subjectiveItems?: SubjectivePrintItem[];
  sheet: PrintedSheetItem;
  isPreSlugged?: boolean;
}) {
  const digits = (sheet.studentId || "").padStart(5, "0").slice(-5).split("");
  const hasSubjective = subjectiveItems.length > 0;

  return (
    <div className="relative h-[138mm] box-border p-[5mm] px-[12mm] flex flex-col justify-between bg-white text-black select-none">
      {/* 4 Corner Markers for this Half (9mm x 9mm) */}
      <div className="absolute top-[4mm] left-[4mm] w-[9mm] h-[9mm] bg-black" />
      <div className="absolute top-[4mm] right-[4mm] w-[9mm] h-[9mm] bg-black" />
      <div className="absolute bottom-[4mm] left-[4mm] w-[9mm] h-[9mm] bg-black" />
      <div className="absolute bottom-[4mm] right-[4mm] w-[9mm] h-[9mm] bg-black" />

      {/* Top Bar: Title & QR */}
      <div>
        <div className="flex items-start justify-between border-b border-black pb-1">
          <div>
            <div className="text-[13px] font-bold">
              โรงเรียนกุดจับประชาสรรค์ • กระดาษคำตอบ (Half-A4)
            </div>
            <div className="text-[11px] font-semibold text-slate-800">
              {subjectCode} {subjectName} ({gradeLevel}) • {paperTitle}
            </div>
            <div className="text-[9px] text-slate-600">
              ปีการศึกษา {academicYear}/{term} • ปรนัย {totalItems} ข้อ {hasSubjective ? `• อัตนัย ${subjectiveItems.length} ข้อ` : ""}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeSVG value={sheet.sheetToken} size={40} level="M" includeMargin={false} />
            <span className="text-[7px] font-mono text-slate-600 mt-0.5">{sheet.sheetToken.slice(-10)}</span>
          </div>
        </div>

        {/* Student Bar */}
        <div className="mt-1 flex items-center justify-between border border-black px-2 py-1 rounded text-[10px] bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold">ชื่อ:</span>
            <span className="font-semibold text-blue-900">{sheet.studentName || "................................................"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>ชั้น: <b>{sheet.classroom || "-"}</b></span>
            <span>เลขที่: <b>{sheet.seatNo != null ? sheet.seatNo : "-"}</b></span>
            <span className="font-mono font-bold text-blue-900">ID: {sheet.studentId}</span>
          </div>
        </div>
      </div>

      {/* Middle: Digits & 20 Items in 2 Cols of 10 */}
      <div className="grid grid-cols-12 gap-3 items-center my-0.5">
        {/* Student ID Bubbles */}
        <div className="col-span-4 border-r border-slate-300 pr-2">
          <div className="text-[8px] font-bold text-center mb-0.5 text-slate-700">รหัสนักเรียน 5 หลัก</div>
          <div className="flex justify-center gap-1 mb-0.5">
            {digits.map((d, dIdx) => (
              <div key={dIdx} className="w-4 h-4 border border-black flex items-center justify-center font-mono text-[9px] font-bold bg-white">
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

        {/* Multiple Choice Items (Supports 20 or 25 Items in 2 Columns) */}
        <div className="col-span-8 grid grid-cols-2 gap-2">
          <MultipleChoiceColumn
            startItem={1}
            endItem={totalItems <= 20 ? 10 : Math.min(13, totalItems)}
            colTitle={`ข้อ 1 - ${totalItems <= 20 ? 10 : Math.min(13, totalItems)}`}
            bubbleSize="w-3.5 h-3.5 text-[7.5px]"
            itemPadding="py-0"
          />
          <MultipleChoiceColumn
            startItem={totalItems <= 20 ? 11 : 14}
            endItem={totalItems}
            colTitle={`ข้อ ${totalItems <= 20 ? 11 : 14} - ${totalItems}`}
            bubbleSize="w-3.5 h-3.5 text-[7.5px]"
            itemPadding="py-0"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-300 pt-0.5 flex justify-between items-center text-[8px] text-slate-500">
        <span>กุดจับประชาสรรค์ • Half-A4 Mode ({totalItems <= 20 ? "20 Items" : "25 Items"})</span>
        <span>ช่องคะแนน: ปรนัย [ _____ ] {hasSubjective && "อัตนัย [ _____ ]"}</span>
      </div>
    </div>
  );
}

/**
 * 📑 OmrTwoUpA4Sheet: Renders 2 complete answer sheets on 1 A4 page (Top & Bottom)
 * with a dashed cutting line in the center to cut into two Half-A4 sheets.
 */
export function OmrTwoUpA4Sheet({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 20,
  subjectiveItems = [],
  sheetTop,
  sheetBottom,
  isPreSlugged = true
}: OmrTwoUpA4SheetProps) {
  // If sheetBottom is null, make a blank duplicate
  const bottomSheet = sheetBottom || {
    sheetToken: `${sheetTop.sheetToken}_b`,
    studentId: "00000",
    studentName: "........................................................",
    classroom: gradeLevel,
    seatNo: null
  };

  return (
    <div className="omr-a4-sheet relative bg-white text-black font-sans box-border overflow-hidden select-none flex flex-col justify-between h-full">
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
          subjectiveItems={subjectiveItems}
          sheet={sheetTop}
          isPreSlugged={isPreSlugged && sheetTop.studentId !== "00000"}
        />
      </div>

      {/* Center Dashed Cutting Line */}
      <div className="relative py-1 flex items-center justify-center">
        <div className="w-full border-t-2 border-dashed border-slate-400" />
        <span className="absolute bg-white px-3 text-[9px] font-mono text-slate-600 font-bold flex items-center gap-1.5 border border-slate-300 rounded-full py-0.5">
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
          subjectiveItems={subjectiveItems}
          sheet={bottomSheet}
          isPreSlugged={isPreSlugged && bottomSheet.studentId !== "00000"}
        />
      </div>
    </div>
  );
}
