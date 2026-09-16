"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

export type BlueprintLayoutType = "THEATER" | "CLASSROOM" | "U_SHAPE" | "BANQUET" | "BOARDROOM" | "HOLLOW_SQUARE";

interface RoomBlueprintCardsProps {
  selected: string;
  onSelect: (layout: BlueprintLayoutType) => void;
}

interface LayoutItem {
  id: BlueprintLayoutType;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  renderDiagram: () => React.ReactNode;
}

export default function RoomBlueprintCards({ selected, onSelect }: RoomBlueprintCardsProps) {
  const layouts: LayoutItem[] = [
    {
      id: "THEATER",
      title: "เธียเตอร์ (Theater)",
      subtitle: "แถวเก้าอี้หันหน้าเวที",
      badge: "ความจุสูงสุด 100%",
      description: "เหมาะสำหรับการบรรยาย ปฐมนิเทศ หรือประชุมรวมขนาดใหญ่",
      renderDiagram: () => (
        <svg viewBox="0 0 160 100" className="w-full h-20 text-slate-400 dark:text-slate-500">
          {/* Stage / Screen */}
          <rect x="45" y="6" width="70" height="8" rx="3" className="fill-indigo-500/80" />
          <text x="80" y="12" textAnchor="middle" className="text-[7px] fill-white font-bold">เวที / จอภาพ</text>
          
          {/* Row 1 */}
          <circle cx="35" cy="28" r="3.5" className="fill-current" />
          <circle cx="50" cy="28" r="3.5" className="fill-current" />
          <circle cx="65" cy="28" r="3.5" className="fill-current" />
          <circle cx="80" cy="28" r="3.5" className="fill-current" />
          <circle cx="95" cy="28" r="3.5" className="fill-current" />
          <circle cx="110" cy="28" r="3.5" className="fill-current" />
          <circle cx="125" cy="28" r="3.5" className="fill-current" />
          
          {/* Row 2 */}
          <circle cx="35" cy="46" r="3.5" className="fill-current" />
          <circle cx="50" cy="46" r="3.5" className="fill-current" />
          <circle cx="65" cy="46" r="3.5" className="fill-current" />
          <circle cx="80" cy="46" r="3.5" className="fill-current" />
          <circle cx="95" cy="46" r="3.5" className="fill-current" />
          <circle cx="110" cy="46" r="3.5" className="fill-current" />
          <circle cx="125" cy="46" r="3.5" className="fill-current" />

          {/* Row 3 */}
          <circle cx="35" cy="64" r="3.5" className="fill-current" />
          <circle cx="50" cy="64" r="3.5" className="fill-current" />
          <circle cx="65" cy="64" r="3.5" className="fill-current" />
          <circle cx="80" cy="64" r="3.5" className="fill-current" />
          <circle cx="95" cy="64" r="3.5" className="fill-current" />
          <circle cx="110" cy="64" r="3.5" className="fill-current" />
          <circle cx="125" cy="64" r="3.5" className="fill-current" />

          {/* Row 4 */}
          <circle cx="35" cy="82" r="3.5" className="fill-current" />
          <circle cx="50" cy="82" r="3.5" className="fill-current" />
          <circle cx="65" cy="82" r="3.5" className="fill-current" />
          <circle cx="80" cy="82" r="3.5" className="fill-current" />
          <circle cx="95" cy="82" r="3.5" className="fill-current" />
          <circle cx="110" cy="82" r="3.5" className="fill-current" />
          <circle cx="125" cy="82" r="3.5" className="fill-current" />
        </svg>
      )
    },
    {
      id: "CLASSROOM",
      title: "ห้องเรียน (Classroom)",
      subtitle: "โต๊ะแถวยาวพร้อมเก้าอี้",
      badge: "ความจุ ~70%",
      description: "เหมาะสำหรับการฝึกอบรม สัมมนาเชิงปฏิบัติการ ที่ต้องจดบันทึก",
      renderDiagram: () => (
        <svg viewBox="0 0 160 100" className="w-full h-20 text-slate-400 dark:text-slate-500">
          {/* Stage */}
          <rect x="45" y="6" width="70" height="8" rx="3" className="fill-indigo-500/80" />
          <text x="80" y="12" textAnchor="middle" className="text-[7px] fill-white font-bold">เวที / วิทยากร</text>

          {/* Row 1: Tables + Chairs */}
          <rect x="25" y="24" width="45" height="10" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="33" cy="40" r="3" className="fill-current" />
          <circle cx="47" cy="40" r="3" className="fill-current" />
          <circle cx="61" cy="40" r="3" className="fill-current" />

          <rect x="90" y="24" width="45" height="10" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="98" cy="40" r="3" className="fill-current" />
          <circle cx="112" cy="40" r="3" className="fill-current" />
          <circle cx="126" cy="40" r="3" className="fill-current" />

          {/* Row 2: Tables + Chairs */}
          <rect x="25" y="58" width="45" height="10" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="33" cy="74" r="3" className="fill-current" />
          <circle cx="47" cy="74" r="3" className="fill-current" />
          <circle cx="61" cy="74" r="3" className="fill-current" />

          <rect x="90" y="58" width="45" height="10" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="98" cy="74" r="3" className="fill-current" />
          <circle cx="112" cy="74" r="3" className="fill-current" />
          <circle cx="126" cy="74" r="3" className="fill-current" />
        </svg>
      )
    },
    {
      id: "U_SHAPE",
      title: "ตัวยู (U-Shape)",
      subtitle: "โต๊ะล้อมรูปตัว U มีพื้นที่เปิด",
      badge: "เน้นการอภิปราย",
      description: "เหมาะสำหรับประชุมกลุ่ม ประชุมเชิงโต้ตอบที่ทุกคนมีส่วนร่วม",
      renderDiagram: () => (
        <svg viewBox="0 0 160 100" className="w-full h-20 text-slate-400 dark:text-slate-500">
          {/* Screen */}
          <rect x="55" y="6" width="50" height="7" rx="2" className="fill-indigo-500/80" />
          <text x="80" y="11" textAnchor="middle" className="text-[6px] fill-white font-bold">จอโปรเจกเตอร์</text>

          {/* Left Desk + Chairs */}
          <rect x="28" y="22" width="12" height="60" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="18" cy="30" r="3" className="fill-current" />
          <circle cx="18" cy="44" r="3" className="fill-current" />
          <circle cx="18" cy="58" r="3" className="fill-current" />
          <circle cx="18" cy="72" r="3" className="fill-current" />

          {/* Bottom Desk + Chairs */}
          <rect x="28" y="74" width="104" height="12" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="50" cy="92" r="3" className="fill-current" />
          <circle cx="65" cy="92" r="3" className="fill-current" />
          <circle cx="80" cy="92" r="3" className="fill-current" />
          <circle cx="95" cy="92" r="3" className="fill-current" />
          <circle cx="110" cy="92" r="3" className="fill-current" />

          {/* Right Desk + Chairs */}
          <rect x="120" y="22" width="12" height="60" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="142" cy="30" r="3" className="fill-current" />
          <circle cx="142" cy="44" r="3" className="fill-current" />
          <circle cx="142" cy="58" r="3" className="fill-current" />
          <circle cx="142" cy="72" r="3" className="fill-current" />
        </svg>
      )
    },
    {
      id: "BANQUET",
      title: "โต๊ะกลม (Banquet)",
      subtitle: "โต๊ะกลมกระจายกลุ่ม",
      badge: "กิจกรรมกลุ่ม / สังสรรค์",
      description: "เหมาะสำหรับงานเลี้ยง กิจกรรม Workshop รวมกลุ่ม หรือสัมมนากลุ่มย่อย",
      renderDiagram: () => (
        <svg viewBox="0 0 160 100" className="w-full h-20 text-slate-400 dark:text-slate-500">
          {/* Table 1 */}
          <circle cx="48" cy="34" r="15" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="48" cy="13" r="2.8" className="fill-current" />
          <circle cx="68" cy="34" r="2.8" className="fill-current" />
          <circle cx="48" cy="55" r="2.8" className="fill-current" />
          <circle cx="28" cy="34" r="2.8" className="fill-current" />
          <circle cx="34" cy="20" r="2.8" className="fill-current" />
          <circle cx="62" cy="20" r="2.8" className="fill-current" />

          {/* Table 2 */}
          <circle cx="112" cy="34" r="15" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="112" cy="13" r="2.8" className="fill-current" />
          <circle cx="132" cy="34" r="2.8" className="fill-current" />
          <circle cx="112" cy="55" r="2.8" className="fill-current" />
          <circle cx="92" cy="34" r="2.8" className="fill-current" />
          <circle cx="98" cy="20" r="2.8" className="fill-current" />
          <circle cx="126" cy="20" r="2.8" className="fill-current" />

          {/* Table 3 */}
          <circle cx="80" cy="76" r="14" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="80" cy="56" r="2.8" className="fill-current" />
          <circle cx="99" cy="76" r="2.8" className="fill-current" />
          <circle cx="80" cy="95" r="2.8" className="fill-current" />
          <circle cx="61" cy="76" r="2.8" className="fill-current" />
        </svg>
      )
    },
    {
      id: "BOARDROOM",
      title: "บอร์ดรูม (Boardroom)",
      subtitle: "โต๊ะประชุมกลางตัวเดียว",
      badge: "ประชุมกรรมการ",
      description: "เหมาะสำหรับประชุมคณะกรรมการบริหาร การหารือวาระลับ หรือประชุมทางการ",
      renderDiagram: () => (
        <svg viewBox="0 0 160 100" className="w-full h-20 text-slate-400 dark:text-slate-500">
          {/* Long Conference Table */}
          <rect x="36" y="32" width="88" height="34" rx="10" className="fill-slate-300 dark:fill-slate-600" />
          
          {/* Top Chairs */}
          <circle cx="50" cy="22" r="3" className="fill-current" />
          <circle cx="65" cy="22" r="3" className="fill-current" />
          <circle cx="80" cy="22" r="3" className="fill-current" />
          <circle cx="95" cy="22" r="3" className="fill-current" />
          <circle cx="110" cy="22" r="3" className="fill-current" />

          {/* Bottom Chairs */}
          <circle cx="50" cy="76" r="3" className="fill-current" />
          <circle cx="65" cy="76" r="3" className="fill-current" />
          <circle cx="80" cy="76" r="3" className="fill-current" />
          <circle cx="95" cy="76" r="3" className="fill-current" />
          <circle cx="110" cy="76" r="3" className="fill-current" />

          {/* Head Chairs (Left & Right) */}
          <circle cx="26" cy="49" r="3.5" className="fill-indigo-600 dark:fill-indigo-400" />
          <circle cx="134" cy="49" r="3.5" className="fill-current" />
        </svg>
      )
    },
    {
      id: "HOLLOW_SQUARE",
      title: "สี่เหลี่ยมกลวง (Hollow Square)",
      subtitle: "โต๊ะล้อม 4 ทิศเปิดกลาง",
      badge: "ทุกคนสบตากัน",
      description: "เหมาะสำหรับคณะทำงานที่ต้องการแลกเปลี่ยนความคิดเห็นอย่างเท่าเทียม",
      renderDiagram: () => (
        <svg viewBox="0 0 160 100" className="w-full h-20 text-slate-400 dark:text-slate-500">
          {/* Top Desk */}
          <rect x="30" y="16" width="100" height="10" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="48" cy="8" r="2.8" className="fill-current" />
          <circle cx="68" cy="8" r="2.8" className="fill-current" />
          <circle cx="88" cy="8" r="2.8" className="fill-current" />
          <circle cx="108" cy="8" r="2.8" className="fill-current" />

          {/* Bottom Desk */}
          <rect x="30" y="74" width="100" height="10" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="48" cy="92" r="2.8" className="fill-current" />
          <circle cx="68" cy="92" r="2.8" className="fill-current" />
          <circle cx="88" cy="92" r="2.8" className="fill-current" />
          <circle cx="108" cy="92" r="2.8" className="fill-current" />

          {/* Left Desk */}
          <rect x="30" y="26" width="10" height="48" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="18" cy="38" r="2.8" className="fill-current" />
          <circle cx="18" cy="50" r="2.8" className="fill-current" />
          <circle cx="18" cy="62" r="2.8" className="fill-current" />

          {/* Right Desk */}
          <rect x="120" y="26" width="10" height="48" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="142" cy="38" r="2.8" className="fill-current" />
          <circle cx="142" cy="50" r="2.8" className="fill-current" />
          <circle cx="142" cy="62" r="2.8" className="fill-current" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          📐 รูปแบบผังห้องที่ต้องการ (Blueprint Layout) <span className="text-rose-500">*</span>
        </label>
        <span className="text-[11px] text-slate-400">
          คลิกเลือกผังที่ตรงกับลักษณะการใช้งาน
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {layouts.map((layout) => {
          const isSelected = selected === layout.id;

          return (
            <div
              key={layout.id}
              onClick={() => onSelect(layout.id)}
              className={`relative rounded-2xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60"
              }`}
            >
              {/* Top Row: Title + Check */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className={`text-xs font-bold ${isSelected ? "text-indigo-950 dark:text-indigo-100" : "text-slate-900 dark:text-white"}`}>
                    {layout.title}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {layout.subtitle}
                  </div>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 group-hover:border-indigo-400" />
                )}
              </div>

              {/* Graphical Blueprint SVG */}
              <div className={`my-2 p-1.5 rounded-xl border flex items-center justify-center transition ${
                isSelected
                  ? "bg-white/80 dark:bg-slate-900/80 border-indigo-200 dark:border-indigo-800"
                  : "bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/80"
              }`}>
                {layout.renderDiagram()}
              </div>

              {/* Bottom: Badge & description */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={`font-semibold px-2 py-0.5 rounded-md ${
                  isSelected
                    ? "bg-indigo-200/80 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}>
                  {layout.badge}
                </span>
                <span className="text-[9.5px] text-slate-400 truncate max-w-[130px]" title={layout.description}>
                  {layout.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
