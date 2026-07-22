"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRepairDetailAction } from "@/app/actions/repair/update";
import { getRepairPhotosAction } from "@/app/actions/repair/photo";
import { getSystemSettings } from "@/app/actions/settings";
import { Printer, ArrowLeft, Loader2, CheckCircle2, Clock, Wrench, AlertCircle, XCircle } from "lucide-react";
import Image from "next/image";

// Helper for Thai Date formatting (e.g. 22 กรกฎาคม พ.ศ. 2569)
function toThaiDateString(dateInput: string | Date | null | undefined) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear() + 543;

  return `${d} ${m} พ.ศ. ${y}`;
}

function toThaiDateTimeString(dateInput: string | Date | null | undefined) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  const dateStr = toThaiDateString(dateInput);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateStr} เวลา ${hours}:${minutes} น.`;
}

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICAL: "ระบบไฟฟ้า",
  PLUMBING: "ระบบประปา",
  BUILDING: "อาคาร/โครงสร้าง",
  IT: "อุปกรณ์ IT/คอมพิวเตอร์",
  EQUIPMENT: "ครุภัณฑ์/เฟอร์นิเจอร์",
  OTHER: "อื่น ๆ",
};

const URGENCY_LABELS: Record<string, string> = {
  NORMAL: "ปกติ",
  URGENT: "เร่งด่วน",
  URGENT_MOST: "เร่งด่วนมาก",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  ASSIGNED: "มอบหมายช่างแล้ว",
  IN_PROGRESS: "กำลังดำเนินการซ่อม",
  COMPLETED: "ซ่อมเสร็จสิ้น",
  CANCELLED: "ยกเลิกคำขอ",
};

export default function PrintRepairPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repair, setRepair] = useState<any>(null);
  const [photos, setPhotos] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [repairRes, photoRes, systemSettings] = await Promise.all([
          getRepairDetailAction(id),
          getRepairPhotosAction(id).catch(() => null),
          getSystemSettings().catch(() => null),
        ]);

        if (!repairRes.success || !repairRes.repair) {
          throw new Error(repairRes.error || "ไม่พบข้อมูลรายการแจ้งซ่อม");
        }

        setRepair(repairRes.repair);
        setPhotos(photoRes);
        setSettings(systemSettings);
      } catch (err: any) {
        setError(err?.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      } finally {
        setLoading(false);
      }
    }

    if (id) loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-medium">กำลังเตรียมแบบพิมพ์ใบแจ้งซ่อม...</p>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700 p-4 gap-3">
        <XCircle className="w-10 h-10 text-red-500" />
        <p className="text-base font-bold">{error || "ไม่พบข้อมูล"}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold transition-colors"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const schoolName = settings?.schoolName || "โรงเรียนกุฉินารายณ์";
  const logoUrl = settings?.logoUrl;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 font-sans print:p-0 print:bg-white text-slate-900">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ย้อนกลับ
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสารใบแจ้งซ่อม
          </button>
        </div>
      </div>

      {/* A4 Document Printable Sheet */}
      <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:w-full font-serif text-[13pt] leading-normal text-black">
        {/* Document Header */}
        <div className="flex flex-col items-center text-center pb-4 border-b-2 border-black space-y-1">
          {logoUrl ? (
            <div className="relative w-16 h-16 mb-1">
              <Image src={logoUrl} alt="Logo" fill className="object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg mb-1">
              ตรา
            </div>
          )}
          <h1 className="text-[16pt] font-bold tracking-wide">{schoolName}</h1>
          <h2 className="text-[14pt] font-bold">แบบบันทึกคำขอแจ้งซ่อมแซมวัสดุ / ครุภัณฑ์ / อาคารสถานที่</h2>
          <p className="text-[11pt] font-sans font-semibold text-slate-700">
            เลขที่คำขอ: <span className="font-mono">{repair.repairNo}</span>
          </p>
        </div>

        {/* Section 1: Requester & Problem Info */}
        <div className="mt-6 space-y-3 font-sans">
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <div><span className="font-bold">วันที่แจ้งคำขอ:</span> {toThaiDateTimeString(repair.createdAt)}</div>
            <div><span className="font-bold">ระดับความเร่งด่วน:</span> {URGENCY_LABELS[repair.urgency] || repair.urgency}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-1">
            <div>
              <span className="font-bold">ผู้แจ้งคำขอ:</span> {repair.requester?.name || "-"}
            </div>
            <div>
              <span className="font-bold">ตำแหน่ง:</span> {repair.requester?.position || "บุคลากร"}
            </div>
            <div>
              <span className="font-bold">หมวดหมู่งานซ่อม:</span> {CATEGORY_LABELS[repair.category] || repair.category}
            </div>
            <div>
              <span className="font-bold">สถานที่ / ห้องที่แจ้ง:</span> {repair.location}
            </div>
          </div>

          <div className="text-sm pt-2">
            <span className="font-bold block mb-1">หัวข้อการแจ้งซ่อม:</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium">
              {repair.title}
            </div>
          </div>

          <div className="text-sm pt-1">
            <span className="font-bold block mb-1">รายละเอียดปัญหา / อาการชำรุด:</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
              {repair.description || "ไม่ระบุรายละเอียดเพิ่มเติม"}
            </div>
          </div>
        </div>

        {/* Section 2: Execution & Repair Results */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 font-sans space-y-3">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">บันทึกผลการดำเนินงานซ่อมแซม</h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">สถานะการซ่อม:</span> {STATUS_LABELS[repair.status] || repair.status}
            </div>
            <div>
              <span className="font-bold">ผู้รับผิดชอบ / ช่างซ่อม:</span> {repair.assignee?.name || "ยังไม่ได้มอบหมาย"}
            </div>
            <div>
              <span className="font-bold">วันที่มอบหมาย:</span> {toThaiDateString(repair.assignedAt)}
            </div>
            <div>
              <span className="font-bold">วันที่ดำเนินการเสร็จ:</span> {toThaiDateString(repair.finishedAt)}
            </div>
          </div>

          <div className="text-sm pt-1">
            <span className="font-bold block mb-1">สรุปผลการซ่อม / บันทึกการแก้ไข:</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[50px]">
              {repair.resolutionNote || (repair.status === "COMPLETED" ? "ดำเนินการซ่อมแซมเรียบร้อยแล้ว" : "อยู่ระหว่างดำเนินการ")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-1">
            <div>
              <span className="font-bold">วัสดุ/อุปกรณ์ที่ใช้:</span> {repair.materialsUsed || "-"}
            </div>
            <div>
              <span className="font-bold">ค่าใช้จ่ายรวม:</span> {repair.cost != null ? `${Number(repair.cost).toLocaleString("th-TH")} บาท` : "-"}
            </div>
          </div>
        </div>

        {/* Section 3: BEFORE & AFTER Photos (If any) */}
        {photos && ((photos.BEFORE && photos.BEFORE.length > 0) || (photos.AFTER && photos.AFTER.length > 0)) && (
          <div className="mt-6 pt-4 border-t border-slate-200 font-sans space-y-3">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide">รูปภาพประกอบงานซ่อม</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              {photos.BEFORE && photos.BEFORE.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">รูปก่อนซ่อม (BEFORE)</p>
                  <div className="relative w-full h-36 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <Image src={photos.BEFORE[0].url} alt="Before Photo" fill className="object-contain" />
                  </div>
                </div>
              )}
              {photos.AFTER && photos.AFTER.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">รูปหลังซ่อม (AFTER)</p>
                  <div className="relative w-full h-36 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <Image src={photos.AFTER[0].url} alt="After Photo" fill className="object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: 3 Signature Columns */}
        <div className="mt-10 pt-6 border-t-2 border-black font-sans text-xs">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Signature 1: Requester */}
            <div className="space-y-8 flex flex-col justify-between min-h-[120px]">
              <div>
                <p className="font-bold mb-6">ลงชื่อ......................................................ผู้แจ้ง</p>
                <p>({repair.requester?.name || "...................................................."})</p>
                <p className="text-[10px] text-slate-500 mt-0.5">ตำแหน่ง {repair.requester?.position || "บุคลากร"}</p>
              </div>
              <p>วันที่ .......... / .......... / ..........</p>
            </div>

            {/* Signature 2: Repairer / Technician */}
            <div className="space-y-8 flex flex-col justify-between min-h-[120px]">
              <div>
                <p className="font-bold mb-6">ลงชื่อ......................................................ผู้ซ่อม</p>
                <p>({repair.assignee?.name || "...................................................."})</p>
                <p className="text-[10px] text-slate-500 mt-0.5">ตำแหน่ง {repair.assignee?.position || "เจ้าหน้าที่ช่าง/ผู้รับผิดชอบ"}</p>
              </div>
              <p>วันที่ .......... / .......... / ..........</p>
            </div>

            {/* Signature 3: Head of Admin / Director */}
            <div className="space-y-8 flex flex-col justify-between min-h-[120px]">
              <div>
                <p className="font-bold mb-6">ลงชื่อ......................................................ผู้ตรวจสอบ/อนุมัติ</p>
                <p>(....................................................)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">ตำแหน่ง หัวหน้าฝ่ายบริหารทั่วไป / ผู้อำนวยการ</p>
              </div>
              <p>วันที่ .......... / .......... / ..........</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
