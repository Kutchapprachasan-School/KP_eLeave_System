"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getTemplateGeometry,
  ChoiceCount,
  THAI_CHOICE_LABELS
} from "@/lib/omr/omrTemplateGeometry";

export interface PrintedSheetItem {
  sheetToken: string;
  studentId: string;
  studentName?: string | null;
  classroom?: string | null;
  seatNo?: number | null;
  versionCode?: string | null;
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
  choiceCount?: number; // 4 = ก-ง (Standard), 5 = ก-จ (Special), 6 = ก-ฉ (Special)
  subjectiveItems?: SubjectivePrintItem[];
  sheet: PrintedSheetItem;
  isPreSlugged?: boolean;
  schoolName?: string;
  examDateLabel?: string;
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

const VERSION_THAI_MAP: Record<string, string> = {
  "01": "ก",
  "02": "ข",
  "03": "ค",
  "04": "ง"
};

/**
 * 🖨️ OMR Rev 11.0 Full-Page Side-by-Side Answer Sheet (ZipGrade & Standard Thai OMR Parity)
 *
 * Key Design Guarantee:
 * Every fiducial marker (`■`), timing bar (`▬`), student ID bubble, seat number bubble,
 * version bubble, and question choice bubble (`ก ข ค ง` / `ก-จ` / `ก-ฉ`) is rendered using the
 * EXACT normalized `(u, v)` coordinates from `getTemplateGeometry(totalItems, validChoiceCount)`.
 * This guarantees 100.0% sub-millimeter geometric parity between the printed sheet and the camera scanner.
 */
export function OmrAnswerSheetPrintLayout({
  paperTitle,
  subjectCode,
  subjectName,
  academicYear,
  term,
  gradeLevel,
  totalItems = 40,
  choiceCount = 4,
  sheet,
  isPreSlugged = true,
  schoolName = "โรงเรียนกุดจับประชาสรรค์",
  examDateLabel
}: OmrAnswerSheetProps) {
  const validChoiceCount: ChoiceCount =
    choiceCount === 5 ? 5 : choiceCount === 6 ? 6 : 4;

  const geom = getTemplateGeometry(totalItems, validChoiceCount);

  // Determine whether this sheet has pre-filled student roster identity
  const hasRealStudentId =
    Boolean(isPreSlugged) &&
    Boolean(sheet.studentId) &&
    sheet.studentId !== "00000" &&
    !/^0+$/.test(sheet.studentId);

  const studentDigits = hasRealStudentId
    ? String(sheet.studentId).padStart(5, "0").slice(0, 5).split("")
    : ["", "", "", "", ""];

  const hasSeatNo =
    Boolean(isPreSlugged) &&
    sheet.seatNo !== null &&
    sheet.seatNo !== undefined &&
    Number(sheet.seatNo) > 0;

  const seatDigits = hasSeatNo
    ? String(sheet.seatNo).padStart(2, "0").slice(-2).split("")
    : ["", ""];

  const activeVersionCode = sheet.versionCode || "01";
  const versionThaiChar = hasRealStudentId ? VERSION_THAI_MAP[activeVersionCode] || "ก" : "";

  const displayDate =
    examDateLabel ||
    new Date().toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  // Convert normalized radius (relative to width=1000) to CSS percentage of width & height
  // Since height = 1414 and width = 1000, heightPct = widthPct / 1.414
  const bubbleDiameterWidthPct = (radiusNorm: number) => `${(radiusNorm * 2 * 100).toFixed(3)}%`;
  const bubbleDiameterHeightPct = (radiusNorm: number) =>
    `${((radiusNorm * 2 * 100) / 1.4142).toFixed(3)}%`;

  // Unique right-edge timing bars (one per rowIndex 0 .. rowsPerColumn - 1)
  const uniqueRowBars = Array.from({ length: geom.rowsPerColumn }, (_, r) =>
    geom.timingMarks.find((tm) => tm.rowIndex === r)
  ).filter(Boolean);

  return (
    <div
      className="omr-a4-sheet relative bg-white text-slate-900 font-sans box-border overflow-hidden select-none mx-auto"
      style={{
        width: "210mm",
        height: "297mm",
        pageBreakAfter: "always",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact"
      }}
    >
      {/* ===================================================================== */}
      {/* 1. 6-POINT FIDUCIAL MARKERS (TL, TR, ML, MR, BL, BR)                  */}
      {/* ===================================================================== */}
      {Object.entries(geom.fiducialMarkers).map(([key, m]) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: `${(m.u * 100).toFixed(3)}%`,
            top: `${(m.v * 100).toFixed(3)}%`,
            width: `${(m.width * 100).toFixed(3)}%`,
            height: `${(m.height * 100).toFixed(3)}%`,
            backgroundColor: "#000000"
          }}
        />
      ))}

      {/* ===================================================================== */}
      {/* 2. TOP HEADER BANNER & ROUNDED STUDENT INFO BOX (v = 0.032 .. 0.195)  */}
      {/* ===================================================================== */}
      {/* Grey Banner `กระดาษคำตอบ` between TL and TR markers */}
      <div
        className="flex items-center justify-center bg-slate-200 border border-slate-400 rounded-sm"
        style={{
          position: "absolute",
          left: "9.2%",
          width: "81.6%",
          top: "3.1%",
          height: "2.8%"
        }}
      >
        <span className="text-[15px] font-extrabold tracking-wide text-slate-900">
          กระดาษคำตอบ {validChoiceCount > 4 ? `(แบบพิเศษ ${validChoiceCount} ตัวเลือก)` : ""}
        </span>
      </div>

      {/* Subject & School Row */}
      <div
        className="flex items-center justify-between text-[11px] text-slate-900"
        style={{
          position: "absolute",
          left: "9.2%",
          width: "81.6%",
          top: "6.4%"
        }}
      >
        <div className="flex items-baseline gap-1.5 flex-1">
          <span className="font-bold whitespace-nowrap">รายวิชา</span>
          <span className="border-b border-dotted border-slate-600 px-2 font-semibold flex-1 truncate">
            {subjectCode} {subjectName} ({gradeLevel})
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 w-[42%] pl-4">
          <span className="font-bold whitespace-nowrap">โรงเรียน</span>
          <span className="border-b border-dotted border-slate-600 px-2 font-semibold flex-1 truncate">
            {schoolName}
          </span>
        </div>
      </div>

      {/* Instruction Line */}
      <div
        className="flex items-center justify-between text-[10.5px] text-slate-800"
        style={{
          position: "absolute",
          left: "9.2%",
          width: "81.6%",
          top: "8.6%"
        }}
      >
        <div>
          <span className="font-bold">คำชี้แจง : </span>
          <span>
            ให้นักเรียนระบายคำตอบลงในช่อง{" "}
            <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-800 align-middle mx-0.5" />{" "}
            ให้ถูกต้องด้วยดินสอ 2B ให้เต็มวง (จำนวน {totalItems} ข้อ • {validChoiceCount} ตัวเลือก:{" "}
            {geom.choiceLabels.map((c) => THAI_CHOICE_LABELS[c]).join(" ")})
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">
          {geom.code} • ปีการศึกษา {academicYear}/{term}
        </span>
      </div>

      {/* Rounded 2-Row Student Info Box (`ชื่อ-สกุล | ชั้น` / `วันสอบ | วิชา`) */}
      <div
        className="border-[1.8px] border-slate-900 rounded-xl overflow-hidden flex flex-col bg-white"
        style={{
          position: "absolute",
          left: "9.2%",
          width: "81.6%",
          top: "10.8%",
          height: "7.8%"
        }}
      >
        {/* Row 1 */}
        <div className="flex-1 flex border-b border-slate-800 text-[11px]">
          <div className="w-[13%] bg-slate-200 border-r border-slate-800 flex items-center justify-center font-bold text-slate-900">
            ชื่อ-สกุล
          </div>
          <div className="w-[53%] border-r border-slate-800 flex items-center px-3 font-semibold text-slate-900 truncate">
            {hasRealStudentId && sheet.studentName ? sheet.studentName : ""}
          </div>
          <div className="w-[10%] bg-slate-200 border-r border-slate-800 flex items-center justify-center font-bold text-slate-900">
            ชั้น
          </div>
          <div className="w-[24%] flex items-center px-3 font-semibold text-slate-900">
            {sheet.classroom || gradeLevel || ""}
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex-1 flex text-[11px]">
          <div className="w-[13%] bg-slate-200 border-r border-slate-800 flex items-center justify-center font-bold text-slate-900">
            วันสอบ
          </div>
          <div className="w-[33%] border-r border-slate-800 flex items-center px-3 font-medium text-slate-900">
            {displayDate}
          </div>
          <div className="w-[10%] bg-slate-200 border-r border-slate-800 flex items-center justify-center font-bold text-slate-900">
            การสอบ
          </div>
          <div className="w-[44%] flex items-center justify-between px-3 font-medium text-slate-900 truncate">
            <span className="truncate">{paperTitle}</span>
            {sheet.sheetToken && (
              <span className="ml-2 shrink-0 opacity-80">
                <QRCodeSVG value={sheet.sheetToken} size={22} level="L" includeMargin={false} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. LEFT SIDEBAR SECTION A: เลขประจำตัว (5 DIGITS)                     */}
      {/* ===================================================================== */}
      <div
        className="text-[11px] font-bold text-slate-900"
        style={{
          position: "absolute",
          left: "9.5%",
          top: "20.8%"
        }}
      >
        เลขประจำตัว
      </div>

      {/* Outer Frame around 5-digit Student ID */}
      <div
        className="border border-slate-600 rounded-sm bg-white/40"
        style={{
          position: "absolute",
          left: "9.5%",
          width: "16.0%",
          top: "22.6%",
          height: "30.4%"
        }}
      />

      {/* Horizontal divider under Student ID Digit Boxes */}
      <div
        className="border-b border-slate-500"
        style={{
          position: "absolute",
          left: "9.5%",
          width: "16.0%",
          top: "26.5%"
        }}
      />

      {/* Student ID Digit Display Boxes [ 6 | 9 | 0 | 0 | 1 ] */}
      {geom.studentIdMatrix.map((col, idx) => (
        <div
          key={`sid-box-${col.columnIndex}`}
          className="border border-slate-700 bg-white flex items-center justify-center font-bold text-[12px] text-slate-900"
          style={{
            position: "absolute",
            left: `${(col.boxCenter.u * 100).toFixed(3)}%`,
            top: `${(col.boxCenter.v * 100).toFixed(3)}%`,
            width: "2.6%",
            height: "2.6%",
            transform: "translate(-50%, -50%)"
          }}
        >
          {studentDigits[idx] || ""}
        </div>
      ))}

      {/* Student ID 5 x 10 Bubble Grid (0 - 9) */}
      {geom.studentIdMatrix.map((col, colIdx) => {
        const prefilledDigit =
          studentDigits[colIdx] !== "" ? parseInt(studentDigits[colIdx], 10) : -1;
        return Object.entries(col.digits).map(([digitStr, b]) => {
          const digitNum = parseInt(digitStr, 10);
          const isShaded = prefilledDigit === digitNum;
          return (
            <div
              key={`sid-b-${colIdx}-${digitNum}`}
              className="rounded-full flex items-center justify-center font-medium"
              style={{
                position: "absolute",
                left: `${(b.u * 100).toFixed(3)}%`,
                top: `${(b.v * 100).toFixed(3)}%`,
                width: bubbleDiameterWidthPct(b.radius),
                height: bubbleDiameterHeightPct(b.radius),
                transform: "translate(-50%, -50%)",
                border: "1.2px solid #1e293b",
                backgroundColor: isShaded ? "#000000" : "#ffffff",
                color: isShaded ? "#ffffff" : "#334155",
                fontSize: "8.5px",
                lineHeight: 1
              }}
            >
              {digitNum}
            </div>
          );
        });
      })}

      {/* ===================================================================== */}
      {/* 4. LEFT SIDEBAR SECTION B: เลขที่ (2 DIGITS) + รหัสชุด (ก ข ค ง)       */}
      {/* ===================================================================== */}
      <div
        className="text-[11px] font-bold text-slate-900"
        style={{
          position: "absolute",
          left: "9.5%",
          top: "53.8%"
        }}
      >
        เลขที่
      </div>

      {/* Outer Frame around Seat No + Version */}
      <div
        className="border border-slate-600 rounded-sm bg-white/40"
        style={{
          position: "absolute",
          left: "9.5%",
          width: "12.2%",
          top: "55.4%",
          height: "30.2%"
        }}
      />

      {/* Vertical divider separating เลขที่ (2 cols) and รหัสชุด (1 col) */}
      <div
        className="border-r border-slate-500"
        style={{
          position: "absolute",
          left: "16.8%",
          top: "55.4%",
          height: "30.2%"
        }}
      />

      {/* Horizontal divider under Seat No / Version Digit Boxes */}
      <div
        className="border-b border-slate-500"
        style={{
          position: "absolute",
          left: "9.5%",
          width: "12.2%",
          top: "59.1%"
        }}
      />

      {/* Note beside Version Box */}
      <div
        className="text-[8px] leading-tight text-slate-600"
        style={{
          position: "absolute",
          left: "22.2%",
          top: "56.0%",
          width: "10.5%"
        }}
      >
        <div>(รหัสชุด : เฉพาะ</div>
        <div>กรณีมีข้อสอบหลายชุด)</div>
      </div>

      {/* Seat No Digit Display Boxes [ 0 | 1 ] */}
      {geom.seatNoMatrix.map((col, idx) => (
        <div
          key={`seat-box-${col.columnIndex}`}
          className="border border-slate-700 bg-white flex items-center justify-center font-bold text-[12px] text-slate-900"
          style={{
            position: "absolute",
            left: `${(col.boxCenter.u * 100).toFixed(3)}%`,
            top: `${(col.boxCenter.v * 100).toFixed(3)}%`,
            width: "2.6%",
            height: "2.6%",
            transform: "translate(-50%, -50%)"
          }}
        >
          {seatDigits[idx] || ""}
        </div>
      ))}

      {/* Seat No 2 x 10 Bubble Grid (0 - 9) */}
      {geom.seatNoMatrix.map((col, colIdx) => {
        const prefilledDigit =
          seatDigits[colIdx] !== "" ? parseInt(seatDigits[colIdx], 10) : -1;
        return Object.entries(col.digits).map(([digitStr, b]) => {
          const digitNum = parseInt(digitStr, 10);
          const isShaded = prefilledDigit === digitNum;
          return (
            <div
              key={`seat-b-${colIdx}-${digitNum}`}
              className="rounded-full flex items-center justify-center font-medium"
              style={{
                position: "absolute",
                left: `${(b.u * 100).toFixed(3)}%`,
                top: `${(b.v * 100).toFixed(3)}%`,
                width: bubbleDiameterWidthPct(b.radius),
                height: bubbleDiameterHeightPct(b.radius),
                transform: "translate(-50%, -50%)",
                border: "1.2px solid #1e293b",
                backgroundColor: isShaded ? "#000000" : "#ffffff",
                color: isShaded ? "#ffffff" : "#334155",
                fontSize: "8.5px",
                lineHeight: 1
              }}
            >
              {digitNum}
            </div>
          );
        });
      })}

      {/* Version Display Box [ ก ] */}
      <div
        className="border border-slate-700 bg-white flex items-center justify-center font-bold text-[11px] text-slate-900"
        style={{
          position: "absolute",
          left: `${(geom.versionMatrix.boxCenter.u * 100).toFixed(3)}%`,
          top: `${(geom.versionMatrix.boxCenter.v * 100).toFixed(3)}%`,
          width: "2.6%",
          height: "2.6%",
          transform: "translate(-50%, -50%)"
        }}
      >
        {versionThaiChar}
      </div>

      {/* Version Bubbles (ก, ข, ค, ง) */}
      {Object.entries(geom.versionMatrix.bubbles).map(([code, b]) => {
        const thaiChar = VERSION_THAI_MAP[code] || "ก";
        const isShaded = hasRealStudentId && activeVersionCode === code;
        return (
          <div
            key={`ver-b-${code}`}
            className="rounded-full flex items-center justify-center font-semibold"
            style={{
              position: "absolute",
              left: `${(b.u * 100).toFixed(3)}%`,
              top: `${(b.v * 100).toFixed(3)}%`,
              width: bubbleDiameterWidthPct(b.radius),
              height: bubbleDiameterHeightPct(b.radius),
              transform: "translate(-50%, -50%)",
              border: "1.2px solid #1e293b",
              backgroundColor: isShaded ? "#000000" : "#ffffff",
              color: isShaded ? "#ffffff" : "#334155",
              fontSize: "8.5px",
              lineHeight: 1
            }}
          >
            {thaiChar}
          </div>
        );
      })}

      {/* ===================================================================== */}
      {/* 5. LEFT SIDEBAR SECTION C: ตัวอย่างการระบาย (SHADING EXAMPLE BOX)      */}
      {/* ===================================================================== */}
      <div
        className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 flex flex-col justify-between text-[9px] text-slate-800"
        style={{
          position: "absolute",
          left: "9.5%",
          width: "21.0%",
          top: "86.8%",
          height: "6.5%"
        }}
      >
        <div className="font-bold underline text-slate-900">ตัวอย่างการระบาย</div>
        <div className="flex items-center gap-2">
          <span className="font-bold w-6">ถูก</span>
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-black border border-black" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold w-6">ผิด</span>
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-700 bg-white text-[8px]">
            ✓
          </span>
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-700 bg-white text-[8px]">
            ✗
          </span>
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border border-slate-700"
            style={{ background: "linear-gradient(90deg, #000 50%, #fff 50%)" }}
          />
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-700 bg-white">
            <span className="w-1.5 h-1.5 rounded-full bg-black" />
          </span>
        </div>
        <div className="text-[7.5px] text-slate-600 truncate">
          ต้องระบายให้เต็มวงกลม อย่าให้ล้นออกนอกวง
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. RIGHT ZONE: MULTIPLE-CHOICE ANSWER COLUMNS + TIMING MARKS           */}
      {/* ===================================================================== */}
      {/* Column Headers: Black Square `■` + ก ข ค ง (จ ฉ) */}
      {geom.columnHeaders.map((colHeader) => (
        <React.Fragment key={`col-hdr-${colHeader.columnIndex}`}>
          {/* Solid Black Column Header Timing Square `■` */}
          <div
            style={{
              position: "absolute",
              left: `${(colHeader.markerPos.u * 100).toFixed(3)}%`,
              top: `${(colHeader.markerPos.v * 100).toFixed(3)}%`,
              width: "1.45%",
              height: "1.02%",
              backgroundColor: "#000000",
              transform: "translate(-50%, -50%)"
            }}
          />
          {/* Choice Column Labels (`ก ข ค ง` ...) */}
          {colHeader.choiceLabelPositions.map((cl) => (
            <div
              key={`col-${colHeader.columnIndex}-lbl-${cl.label}`}
              className="font-bold text-[11px] text-slate-900 flex items-center justify-center"
              style={{
                position: "absolute",
                left: `${(cl.u * 100).toFixed(3)}%`,
                top: `${(cl.v * 100).toFixed(3)}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
              {cl.thaiLabel}
            </div>
          ))}
        </React.Fragment>
      ))}

      {/* Right-Edge Horizontal Timing Bars `▬` (One aligned with every question row) */}
      {uniqueRowBars.map((bar) =>
        bar ? (
          <div
            key={`row-bar-${bar.rowIndex}`}
            style={{
              position: "absolute",
              left: `${(bar.u * 100).toFixed(3)}%`,
              top: `${(bar.v * 100).toFixed(3)}%`,
              width: `${(bar.width * 100).toFixed(3)}%`,
              height: `${(bar.height * 100).toFixed(3)}%`,
              backgroundColor: "#000000",
              transform: "translate(-50%, -50%)"
            }}
          />
        ) : null
      )}

      {/* Question Rows (`1 .. totalItems`) */}
      {geom.questions
        .filter((q) => q.itemNo <= totalItems)
        .map((q) => (
          <React.Fragment key={`q-row-${q.itemNo}`}>
            {/* Question Number Label (`1`, `2`, ..., `40`) */}
            <div
              className="font-bold text-[10.5px] text-slate-900 flex items-center justify-end pr-1"
              style={{
                position: "absolute",
                left: `${(q.numberLabelPos.u * 100).toFixed(3)}%`,
                top: `${(q.numberLabelPos.v * 100).toFixed(3)}%`,
                width: "2.6%",
                transform: "translate(-60%, -50%)"
              }}
            >
              {q.itemNo}
            </div>

            {/* Choice Bubbles (`ก ข ค ง` / `ก-จ` / `ก-ฉ`) */}
            {geom.choiceLabels.map((choiceKey) => {
              const coord = q.choices[choiceKey];
              if (!coord) return null;
              const thaiChar = THAI_CHOICE_LABELS[choiceKey];
              return (
                <div
                  key={`q-${q.itemNo}-${choiceKey}`}
                  className="rounded-full flex items-center justify-center font-medium"
                  style={{
                    position: "absolute",
                    left: `${(coord.u * 100).toFixed(3)}%`,
                    top: `${(coord.v * 100).toFixed(3)}%`,
                    width: bubbleDiameterWidthPct(coord.radius),
                    height: bubbleDiameterHeightPct(coord.radius),
                    transform: "translate(-50%, -50%)",
                    border: "1.2px solid #334155",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: validChoiceCount <= 4 ? "8.5px" : "7.5px",
                    lineHeight: 1
                  }}
                >
                  {thaiChar}
                </div>
              );
            })}
          </React.Fragment>
        ))}
    </div>
  );
}

export const OmrAnswerSheet = OmrAnswerSheetPrintLayout;

/**
 * 📑 OmrTwoUpA4Sheet: Renders the Full-Page Standard OMR Sheet for each student
 * (Retained export signature for backward-compatibility with existing imports)
 */
export function OmrTwoUpA4Sheet(props: OmrTwoUpA4SheetProps) {
  return (
    <OmrAnswerSheetPrintLayout
      paperTitle={props.paperTitle}
      subjectCode={props.subjectCode}
      subjectName={props.subjectName}
      academicYear={props.academicYear}
      term={props.term}
      gradeLevel={props.gradeLevel}
      totalItems={props.totalItems}
      choiceCount={props.choiceCount}
      sheet={props.sheetTop}
      isPreSlugged={props.isPreSlugged}
    />
  );
}
