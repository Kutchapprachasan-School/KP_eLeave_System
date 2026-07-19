"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Printer, Plus, Trash2, Award, FileCheck, Calendar, UserCheck, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Certificate {
  id: string;
  name: string;
  activity: string;
  date: string;
  signatoryName: string;
  signatoryPosition: string;
  issuedAt: string;
}

export default function CertGenerator({ onBack }: { onBack: () => void }) {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [form, setForm] = useState({
    name: "นายสมชาย ใจดี",
    activity: "ผ่านการฝึกอบรมการบริหารจัดการยุคดิจิทัล ระดับดีเยี่ยม",
    date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
    signatoryName: "นายสมคิด ดีเลิศ",
    signatoryPosition: "ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์"
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("issued_certificates");
    if (saved) {
      try {
        setCerts(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.activity) return;

    const newCert: Certificate = {
      id: "CERT-" + Date.now().toString().slice(-6),
      ...form,
      issuedAt: new Date().toLocaleString("th-TH")
    };

    const updated = [newCert, ...certs];
    setCerts(updated);
    localStorage.setItem("issued_certificates", JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    if (confirm("ต้องการลบประวัติการออกเกียรติบัตรนี้ใช่หรือไม่?")) {
      const updated = certs.filter(c => c.id !== id);
      setCerts(updated);
      localStorage.setItem("issued_certificates", JSON.stringify(updated));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate dynamic QR code URL
  const qrData = `ID:${form.name}|Act:${form.activity}|Sign:${form.signatoryName}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="space-y-6">
      {/* Dynamic inline styles for A4 landscape print orientation */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-certificate-area, #print-certificate-area * {
            visibility: visible;
          }
          #print-certificate-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 297mm;
            height: 210mm;
            margin: 0;
            padding: 20mm;
            box-sizing: border-box;
            background: white !important;
            border: 12px double #d97706 !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          /* Hide standard headers/footers */
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Top Toolbar (Hidden on Print) ────────────────────── */}
      <div className="print:hidden flex justify-between items-center gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer"
            title="กลับไปหน้าเมนู"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-350" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-500" />
              ระบบออกเกียรติบัตรอิเล็กทรอนิกส์
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">สร้างเกียรติบัตรพร้อมระบบตรวจสอบความถูกต้องด้วยรหัส QR Code</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4.5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <Printer className="w-4 h-4" />
          สั่งพิมพ์เกียรติบัตร (A4 Landscape)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Form & History (Hidden on Print) ───── */}
        <div className="print:hidden xl:col-span-4 space-y-6">
          {/* Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-slate-850 dark:text-white pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4.5 h-4.5 text-rose-500" />
              กรอกข้อมูลเกียรติบัตร
            </h4>

            {/* Recipient Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้รับเกียรติบัตร</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                placeholder="ชื่อ-นามสกุล"
              />
            </div>

            {/* Activity Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เรื่อง / ความสามารถ / กิจกรรม</label>
              <textarea
                required
                rows={2}
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none resize-none"
                placeholder="อธิบายกิจกรรมหรือระดับความดีความชอบ"
              />
            </div>

            {/* Event Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">วันที่จัดกิจกรรม</label>
              <input
                type="text"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                placeholder="เช่น 17 กรกฎาคม พ.ศ. 2569"
              />
            </div>

            {/* Signatory Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้รับรอง / ผู้ลงนาม</label>
              <input
                type="text"
                required
                value={form.signatoryName}
                onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                placeholder="ชื่อ-นามสกุล ผู้รับรอง"
              />
            </div>

            {/* Signatory Position */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ตำแหน่งผู้ลงนาม</label>
              <input
                type="text"
                required
                value={form.signatoryPosition}
                onChange={(e) => setForm({ ...form, signatoryPosition: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                placeholder="เช่น ผู้อำนวยการโรงเรียน..."
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              บันทึกลงประวัติ
            </button>
          </div>

          {/* History */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 max-h-[350px] overflow-y-auto">
            <h4 className="text-xs font-extrabold text-slate-850 dark:text-white pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <span>ประวัติการออก ({certs.length} รายการ)</span>
            </h4>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {certs.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-4 text-center">ไม่มีข้อมูลประวัติในเซสชันนี้</p>
              ) : (
                certs.map((c) => (
                  <div key={c.id} className="py-2.5 flex justify-between items-start gap-2 group text-[11px]">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => setForm({
                        name: c.name,
                        activity: c.activity,
                        date: c.date,
                        signatoryName: c.signatoryName,
                        signatoryPosition: c.signatoryPosition
                      })}
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-200 hover:underline">{c.name}</p>
                      <p className="text-slate-400 truncate max-w-[200px]" title={c.activity}>{c.activity}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Interactive Certificate Preview Area ── */}
        <div className="xl:col-span-8 flex justify-center w-full">
          <div
            id="print-certificate-area"
            className="w-full aspect-[1.414] bg-white text-slate-900 border-[16px] border-double border-amber-600 p-8 md:p-12 rounded-3xl shadow-xl flex flex-col justify-between text-center relative overflow-hidden select-none font-serif"
          >
            {/* Background Insignia Seal Watermark decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
              <Shield className="w-[380px] h-[380px]" />
            </div>

            {/* Certificate Header Emblem */}
            <div className="flex flex-col items-center space-y-1 md:space-y-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-600 mb-1">
                <Award className="w-8 h-8" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-wider text-slate-950 font-serif">โรงเรียนกุดจับประชาสรรค์</h1>
              <p className="text-[10px] md:text-xs tracking-widest text-slate-500 uppercase font-sans">สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี</p>
            </div>

            {/* Middle text body */}
            <div className="my-3 md:my-5 space-y-4 md:space-y-6">
              <div className="space-y-1.5">
                <p className="text-xs md:text-sm font-semibold italic text-amber-600 font-serif">เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</p>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 tracking-wide underline decoration-amber-500/30 underline-offset-8 py-2 font-serif">
                  {form.name || "ชื่อ-นามสกุล ผู้รับเกียรติบัตร"}
                </h2>
              </div>
              <p className="text-xs md:text-sm text-slate-700 leading-relaxed max-w-lg mx-auto font-sans font-medium px-4">
                {form.activity || "เรื่องหรือกิจกรรมความสำเร็จ"}
              </p>
              <p className="text-[11px] md:text-xs text-slate-500 font-medium font-sans">
                ให้ไว้ ณ วันที่ {form.date || "วันที่ออกเอกสาร"}
              </p>
            </div>

            {/* Bottom Panel (Signatures + QR Code) */}
            <div className="flex justify-between items-end px-4 md:px-8 pt-4 border-t border-slate-100">
              {/* QR Code Validation */}
              <div className="flex items-center gap-2.5 text-left bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-[190px]">
                <img
                  src={qrCodeUrl}
                  alt="Verification QR"
                  className="w-12 h-12 border border-slate-200 bg-white"
                />
                <div className="text-[8px] leading-tight text-slate-500 font-sans">
                  <p className="font-bold text-slate-755">ระบบตรวจสอบ</p>
                  <p>สแกน QR เพื่อตรวจสอบความถูกต้องของเกียรติบัตร</p>
                </div>
              </div>

              {/* Signatory */}
              <div className="space-y-1 md:space-y-1.5 min-w-[200px] text-center font-sans">
                {/* Simulated handwritten signature line */}
                <div className="h-6 flex items-center justify-center overflow-hidden">
                  <span className="font-serif italic text-amber-700/60 text-sm md:text-base select-none">
                    {form.signatoryName}
                  </span>
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <p className="text-[11px] md:text-xs font-bold text-slate-900">{form.signatoryName}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold">{form.signatoryPosition}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
