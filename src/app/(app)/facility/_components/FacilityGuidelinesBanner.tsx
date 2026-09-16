"use client";

import React, { useState } from "react";
import { Phone, Info, ChevronDown, ChevronUp, FileText, CheckCircle2, ShieldCheck, AlertCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface FacilityGuidelinesBannerProps {
  hotlinePhone?: string;
  guidelinesHtml?: string;
}

export default function FacilityGuidelinesBanner({
  hotlinePhone = "042-261234",
  guidelinesHtml
}: FacilityGuidelinesBannerProps) {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hotlinePhone);
      setCopied(true);
      showToast("success", "คัดลอกเบอร์สายด่วนเรียบร้อยแล้ว");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const defaultRegulations = [
    {
      category: "1. การจองล่วงหน้า",
      rule: "ยื่นจองห้องประชุมหรือรถโรงเรียนล่วงหน้าอย่างน้อย 1 วันทำการ",
      condition: "กรณีภารกิจเร่งด่วน ประสานสายด่วนก่อนยื่นคำขอในระบบ",
      actor: "ผู้ขอรับบริการ (ครู/บุคลากร)"
    },
    {
      category: "2. การพิจารณาอนุมัติ",
      rule: "ผ่านการพิจารณา 2 ลำดับขั้น (Step 1 ตรวจสอบความพร้อม, Step 2 ฝ่ายบริหารอนุมัติ)",
      condition: "ระบบจะแจ้งสถานะผ่านระบบและหน้าประวัติคำขอ",
      actor: "เจ้าหน้าที่งานสถานที่ / ผู้อำนวยการ"
    },
    {
      category: "3. ระหว่างปฏิบัติภารกิจ",
      rule: "รักษาความสะอาด ปิดไฟ/เครื่องปรับอากาศทุกครั้งหลังใช้งาน และปฏิบัติตามกฎจราจรเคร่งครัด",
      condition: "ห้ามสูบบุหรี่และห้ามนำอาหารกลิ่นแรงเข้าห้องประชุม",
      actor: "ผู้ขอรับบริการ / พนักงานขับรถ"
    },
    {
      category: "4. หลังสิ้นสุดภารกิจ",
      rule: "ส่งคืนกุญแจและกรอกแบบรายงานหลังเสร็จสิ้นภารกิจ (Post-Mission Report)",
      condition: "บันทึกเลขไมล์ ค่าน้ำมัน และสภาพความเรียบร้อยเพื่อบันทึกประวัติ",
      actor: "พนักงานขับรถ / ผู้รับผิดชอบ"
    }
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900/95 to-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-indigo-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Hotline & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Phone className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-200">สายด่วนประสานงานทรัพยากรส่วนกลาง (Hotline)</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                พร้อมให้บริการ
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <a
                href={`tel:${hotlinePhone}`}
                className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white hover:text-indigo-300 transition"
                title="คลิกเพื่อโทรออก"
              >
                {hotlinePhone}
              </a>
              <button
                onClick={handleCopyPhone}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title="คัดลอกเบอร์โทร"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="text-xs text-slate-400 hidden md:inline">
                • ติดต่องานยานพาหนะและอาคารสถานที่โรงเรียนกุดจับประชาสรรค์
              </span>
            </div>
          </div>
        </div>

        {/* Right: Toggle Regulations */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-indigo-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>{expanded ? "ซ่อนแนวปฏิบัติ" : "ดูระเบียบและแนวปฏิบัติ"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Regulations Table */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <FileText className="w-4 h-4" />
            <span>ระเบียบและแนวปฏิบัติการใช้บริการห้องประชุมและยานพาหนะส่วนกลาง</span>
          </div>

          {guidelinesHtml && guidelinesHtml.trim() ? (
            <div 
              className="prose prose-invert prose-xs max-w-none text-slate-300 leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/5"
              dangerouslySetInnerHTML={{ __html: guidelinesHtml }}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-semibold">
                    <th className="p-3 w-36">หมวดหมู่</th>
                    <th className="p-3">แนวปฏิบัติสำคัญ</th>
                    <th className="p-3 w-56">เงื่อนไข / ข้อกำหนด</th>
                    <th className="p-3 w-44">ผู้รับผิดชอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {defaultRegulations.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="p-3 font-bold text-indigo-200">{row.category}</td>
                      <td className="p-3">{row.rule}</td>
                      <td className="p-3 text-slate-400">{row.condition}</td>
                      <td className="p-3 text-slate-400 font-medium">{row.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
