"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFacilityReservationsAction } from "@/app/actions/facility";
import { getSystemSettings } from "@/app/actions/settings";
import { Printer, ArrowLeft, Loader2, XCircle, Bus, CheckCircle2, UserCheck } from "lucide-react";

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

const MISSION_LABELS: Record<string, string> = {
  OFFICIAL_MEETING: "ไปราชการ/ประชุม/อบรมสัมมนา",
  STUDENT_COMPETITION: "พานักเรียนไปแข่งขันทางวิชาการ/ทักษะ",
  FIELD_TRIP: "ทัศนศึกษา/กิจกรรมนอกสถานที่",
  COMMUNITY_SERVICE: "กิจกรรมบริการชุมชน/จิตอาสา",
  OTHER: "ภารกิจอื่น ๆ"
};

export default function PrintVehicleReservationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [reservations, sysSettings] = await Promise.all([
          getFacilityReservationsAction(),
          getSystemSettings().catch(() => null)
        ]);

        const found = reservations.find((r: any) => r.id === id || r.bookingNumber === id);
        if (!found) {
          throw new Error("ไม่พบข้อมูลแบบคำขอใช้รถและใบอนุญาตเดินทาง");
        }

        setReservation(found);
        setSettings(sysSettings);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดเอกสาร");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-slate-600 text-sm font-medium">กำลังเตรียมแบบฟอร์มขอใช้ยานพาหนะและใบอนุญาตเดินทาง (KP-FV-01)...</p>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4">
        <XCircle className="w-12 h-12 text-rose-500" />
        <p className="text-slate-800 font-semibold">{error || "ไม่พบเอกสาร"}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const requester = reservation.reservedByUser;
  const vehicle = reservation.resource;
  const vehicleDetail = reservation.vehicleDetails;
  const driverAssignment = reservation.assignments?.find((a: any) => a.targetType === "DRIVER");
  const driver = driverAssignment?.driverProfile?.user;
  const step1 = reservation.approvalSteps?.find((s: any) => s.stepNo === 1);
  const step2 = reservation.approvalSteps?.find((s: any) => s.stepNo === 2);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* Print Controls Header */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 shadow-sm"
        >
          <Printer className="w-4 h-4" /> พิมพ์เอกสาร (A4)
        </button>
      </div>

      {/* A4 Sheet Container */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-lg print:shadow-none print:p-0 print:m-0 text-slate-900 font-[Sarabun,sans-serif] leading-relaxed text-[14px]">
        {/* Header */}
        <div className="text-center relative pb-4 border-b border-slate-300">
          <div className="absolute right-0 top-0 text-[11px] text-slate-500 font-mono">
            แบบ KP-FV-01
            <div className="font-semibold text-slate-700">{reservation.bookingNumber}</div>
          </div>
          <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
            ใบขออนุญาตใช้รถโรงเรียนและใบอนุญาตเดินทางไปราชการ
          </h1>
          <h2 className="text-[15px] font-semibold text-slate-700 mt-1">
            {settings?.schoolName || "โรงเรียนกุดจับประชาสรรค์"}
          </h2>
          <p className="text-[12px] text-slate-500">
            สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี
          </p>
        </div>

        {/* Date Row */}
        <div className="flex justify-end mt-4 text-[13px]">
          <div>
            <span className="font-semibold">วันที่ยื่นคำขอ:</span> {toThaiDateString(reservation.createdAt)}
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[13px]">
            <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-amber-700" /> ข้อมูลผู้ขอใช้และยานพาหนะ
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">ผู้ขอใช้/ผู้ควบคุม:</span> {requester?.name || "-"}
              </div>
              <div>
                <span className="font-semibold">กลุ่มสาระฯ/ฝ่าย:</span> {requester?.department || reservation.department || "-"}
              </div>
              <div>
                <span className="font-semibold">ยานพาหนะที่ขอใช้:</span> <span className="font-bold text-amber-800">{vehicle?.name}</span>
              </div>
              <div>
                <span className="font-semibold">ทะเบียนรถ:</span> {vehicle?.vehicleProfile?.licensePlate || "-"}
              </div>
              <div>
                <span className="font-semibold">พนักงานขับรถ:</span> <span className="font-semibold text-slate-900">{driver?.name || "อยู่ระหว่างจัดสรร"}</span>
              </div>
              <div>
                <span className="font-semibold">เบอร์โทรติดต่อคนขับ:</span> {driver?.phoneNumber || "-"}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[13px]">
            <div>
              <span className="font-semibold">ภารกิจ/วัตถุประสงค์:</span>
              <p className="mt-1 pl-3 text-slate-800 font-medium">
                [{MISSION_LABELS[vehicleDetail?.missionType] || "ไปราชการ"}] {reservation.title}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">สถานที่ต้นทาง:</span> {vehicleDetail?.origin || "โรงเรียนกุดจับประชาสรรค์"}
              </div>
              <div>
                <span className="font-semibold">สถานที่ปลายทาง:</span> <span className="font-bold text-slate-900">{vehicleDetail?.destination || "-"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="font-semibold">วันเวลาออกเดินทาง:</span> {toThaiDateTimeString(reservation.startAt)}
              </div>
              <div>
                <span className="font-semibold">วันเวลาเดินทางกลับ:</span> {toThaiDateTimeString(reservation.endAt)}
              </div>
            </div>
          </div>

          {/* Passenger manifest info */}
          <div className="p-3 border border-slate-200 rounded text-[12px] space-y-1.5 bg-white">
            <div className="font-bold text-slate-800 text-[13px] flex items-center justify-between">
              <span>ข้อมูลผู้ร่วมเดินทาง:</span>
              <span className="text-slate-600 font-normal">
                ครู: <strong className="text-slate-900">{vehicleDetail?.teacherCount || 1}</strong> ท่าน | นักเรียน: <strong className="text-slate-900">{vehicleDetail?.studentCount || 0}</strong> คน
              </span>
            </div>
            {vehicleDetail?.passengerListNotes && (
              <div className="text-slate-700 pt-1 border-t border-slate-100">
                <span className="font-semibold">รายชื่อผู้ร่วมเดินทาง/หมายเหตุ:</span>
                <p className="whitespace-pre-wrap pl-2 mt-0.5">{vehicleDetail.passengerListNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* 2-Tier Signature & Approval Sections */}
        <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[12px]">
          {/* Step 1: Head Vehicle Review & Driver Assignment */}
          <div className="border border-slate-300 rounded p-3 flex flex-col justify-between min-h-[140px] bg-slate-50/50">
            <div className="font-bold text-slate-800">1. การจัดสรรรถและพนักงานขับรถ</div>
            <div className="my-2 text-[11px] text-slate-600">
              {driver ? (
                <div className="flex items-center justify-center gap-1 text-emerald-700 font-medium">
                  <UserCheck className="w-3.5 h-3.5" /> มอบหมาย {driver.name} ปฏิบัติหน้าที่
                </div>
              ) : (
                "ตรวจสอบสภาพรถและพร้อมจัดสรร"
              )}
            </div>
            <div className="mt-auto">
              {step1?.status === "APPROVED" ? (
                <div className="flex flex-col items-center">
                  <div className="h-10 flex items-center justify-center">
                    <img
                      src={`/api/signatures/${step1.approverUserId || "admin"}`}
                      alt="ลายเซ็น"
                      className="max-h-9 object-contain"
                    />
                  </div>
                  <div className="font-semibold">({step1.approver?.name || "หัวหน้างานยานพาหนะ"})</div>
                  <div className="text-[10px] text-slate-500">{toThaiDateString(step1.actedAt || reservation.updatedAt)}</div>
                </div>
              ) : (
                <div>
                  <div className="h-8"></div>
                  <div>(......................................................)</div>
                  <div className="text-[10px] text-slate-500">หัวหน้างานยานพาหนะ</div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Director Approval */}
          <div className="border border-slate-300 rounded p-3 flex flex-col justify-between min-h-[140px] bg-slate-50/50">
            <div className="font-bold text-slate-800">2. คำสั่ง / การอนุมัติของผู้อำนวยการ</div>
            <div className="my-2 text-[11px] text-slate-600">
              {reservation.status === "APPROVED" ? (
                <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> อนุญาตให้ใช้รถและเดินทางไปราชการได้
                </span>
              ) : (
                "รอการพิจารณาอนุมัติ"
              )}
            </div>
            <div className="mt-auto">
              {step2?.status === "APPROVED" || reservation.status === "APPROVED" ? (
                <div className="flex flex-col items-center">
                  <div className="h-10 flex items-center justify-center">
                    <img
                      src={`/api/signatures/${step2?.approverUserId || settings?.directorUserId || "director"}`}
                      alt="ลายเซ็นผู้อำนวยการ"
                      className="max-h-9 object-contain"
                    />
                  </div>
                  <div className="font-semibold">({settings?.directorName || step2?.approver?.name || "ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์"})</div>
                  <div className="text-[10px] text-slate-500">ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์</div>
                </div>
              ) : (
                <div>
                  <div className="h-8"></div>
                  <div>(......................................................)</div>
                  <div className="text-[10px] text-slate-500">ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          เอกสารอิเล็กทรอนิกส์ออกโดยระบบบริหารจัดการการลาและทรัพยากรสถานศึกษา (KP e-Leave System) • พิมพ์เมื่อ {toThaiDateTimeString(new Date())}
        </div>
      </div>
    </div>
  );
}
