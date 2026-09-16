"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Building, 
  Bus, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Phone, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Car, 
  HelpCircle,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { reserveFacilityAction } from "@/app/actions/facility";
import { formatISODateInput, type ModuleMode } from "./facility-shared";

interface FacilityBookingFormProps {
  resources: any[];
  onSuccess?: () => void;
  initialSelection?: {
    resourceId?: string;
    resourceType?: ModuleMode;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  } | null;
}

export default function FacilityBookingForm({ resources, onSuccess, initialSelection }: FacilityBookingFormProps) {
  const { showToast } = useToast();

  const [resourceType, setResourceType] = useState<ModuleMode>("MEETING_ROOM");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Synchronize initialSelection when passed from calendar slot selection
  useEffect(() => {
    if (initialSelection) {
      if (initialSelection.resourceType) {
        setResourceType(initialSelection.resourceType);
      }
      if (initialSelection.resourceId) {
        setSelectedResourceId(initialSelection.resourceId);
      }
      if (initialSelection.startDate) {
        setStartDate(initialSelection.startDate);
      }
      if (initialSelection.endDate) {
        setEndDate(initialSelection.endDate);
      }
      if (initialSelection.startTime) {
        setStartTime(initialSelection.startTime);
      }
      if (initialSelection.endTime) {
        setEndTime(initialSelection.endTime);
      }
    }
  }, [initialSelection]);

  // Form Fields
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState(formatISODateInput(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(formatISODateInput(new Date()));
  const [endTime, setEndTime] = useState("12:00");
  const [department, setDepartment] = useState("กลุ่มสาระการเรียนรู้");
  const [contactPhone, setContactPhone] = useState("");
  const [attendeeCount, setAttendeeCount] = useState<number>(15);

  // Room Specific Fields
  const [layoutType, setLayoutType] = useState("THEATER");
  const [layoutNotes, setLayoutNotes] = useState("");
  const [audioVisualNotes, setAudioVisualNotes] = useState("");
  const [cateringNotes, setCateringNotes] = useState("");
  const [requireAirCon, setRequireAirCon] = useState(true);

  // Vehicle Specific Fields
  const [missionType, setMissionType] = useState("OFFICIAL_MEETING");
  const [origin, setOrigin] = useState("โรงเรียนกุดจับประชาสรรค์");
  const [destination, setDestination] = useState("");
  const [teacherCount, setTeacherCount] = useState<number>(2);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [passengerListNotes, setPassengerListNotes] = useState("");

  // Available resources filtered by chosen type
  const availableResources = useMemo(() => {
    return resources.filter((r) => r.type === resourceType && r.status === "AVAILABLE");
  }, [resources, resourceType]);

  const allTypeResources = useMemo(() => {
    return resources.filter((r) => r.type === resourceType);
  }, [resources, resourceType]);

  // Handle Type Change
  const handleTypeChange = (newType: ModuleMode) => {
    setResourceType(newType);
    setSelectedResourceId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedResourceId) {
      showToast("error", "กรุณาเลือกทรัพยากรที่ต้องการจอง");
      return;
    }

    if (!title.trim()) {
      showToast("error", "กรุณาระบุวัตถุประสงค์หรือชื่องาน/ภารกิจ");
      return;
    }

    if (resourceType === "VEHICLE" && !destination.trim()) {
      showToast("error", "กรุณาระบุสถานที่ปลายทางสำหรับยานพาหนะ");
      return;
    }

    // Date & Time Validation
    const startIso = `${startDate}T${startTime}:00`;
    const endIso = `${endDate}T${endTime}:00`;
    const startDt = new Date(startIso);
    const endDt = new Date(endIso);

    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      showToast("error", "วันที่หรือเวลาที่ระบุไม่ถูกต้อง");
      return;
    }

    if (endDt <= startDt) {
      showToast("error", "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น");
      return;
    }

    try {
      setSubmitting(true);
      const isVehicleTarget = resourceType === "VEHICLE";

      // Safe Action Call with Idempotency Key
      const res = await reserveFacilityAction({
        resourceId: selectedResourceId,
        consumerModule: resourceType,
        title: title.trim(),
        purpose: purpose.trim() || undefined,
        startAt: startDt.toISOString(),
        endAt: endDt.toISOString(),
        attendeeCount: Number(attendeeCount) || 10,
        department: department.trim(),
        contactPhone: contactPhone.trim() || undefined,
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
        ...(!isVehicleTarget ? {
          roomDetails: {
            layoutType,
            layoutNotes: layoutNotes.trim() || undefined,
            audioVisualNotes: audioVisualNotes.trim() || undefined,
            cateringNotes: cateringNotes.trim() || undefined,
            requireAirCon
          }
        } : {
          vehicleDetails: {
            missionType,
            origin: origin.trim(),
            destination: destination.trim() || "-",
            teacherCount: Number(teacherCount) || 1,
            studentCount: Number(studentCount) || 0,
            passengerListNotes: passengerListNotes.trim() || undefined
          }
        })
      });

      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการส่งคำขอจอง");
        return;
      }

      showToast("success", "ยื่นคำขอจองสำเร็จ! ระบบได้บันทึกและส่งต่อไปยังขั้นตอนพิจารณาอนุมัติแล้ว");

      // Reset form
      setTitle("");
      setPurpose("");
      setDestination("");
      setLayoutNotes("");
      setAudioVisualNotes("");
      setCateringNotes("");
      setPassengerListNotes("");
      setSelectedResourceId("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Booking submission error:", err);
      showToast("error", err.message || "เกิดข้อผิดพลาดของระบบ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Header Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          ยื่นคำขอจองทรัพยากรส่วนกลาง
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ระบบจองห้องประชุม อาคารสถานที่ และรถโรงเรียนออนไลน์ พร้อมการจัดสรรแบบเรียลไทม์
        </p>
      </div>

      {/* 2. Main Content Grid (2 Columns: Form on Left, Guidelines on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Form Container */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 relative overflow-hidden">
            {/* Ambient Blur Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Category Segmented Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                ประเภททรัพยากรที่ต้องการจอง
              </label>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => handleTypeChange("MEETING_ROOM")}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resourceType === "MEETING_ROOM"
                      ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Building className="w-4 h-4" />
                  ห้องประชุมและอาคารสถานที่
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("VEHICLE")}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resourceType === "VEHICLE"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Bus className="w-4 h-4" />
                  รถโรงเรียนและยานพาหนะ
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Resource Picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  เลือก{resourceType === "MEETING_ROOM" ? "ห้องประชุม / อาคาร" : "ยานพาหนะ / รถยนต์"} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    required
                    className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- กรุณาเลือกรายการ --</option>
                    {availableResources.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name} {resourceType === "VEHICLE" ? `(ทะเบียน: ${r.vehicleProfile?.licensePlate || "-"}, ความจุ ${r.capacity || 12} ที่นั่ง)` : `(ความจุ ${r.capacity || "-"} ที่นั่ง • ${r.roomProfile?.floor || r.location || "ชั้น 1"})`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                {availableResources.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> ไม่พบทรัพยากรที่พร้อมให้บริการในหมวดหมู่นี้
                  </p>
                )}
              </div>

              {/* Title / Mission Objective */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {resourceType === "MEETING_ROOM" ? "ชื่องาน / วัตถุประสงค์การใช้ห้อง" : "ภารกิจราชการ / วัตถุประสงค์การใช้รถ"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    resourceType === "MEETING_ROOM"
                      ? "เช่น การประชุมกลุ่มสาระการเรียนรู้, อบรมเชิงปฏิบัติการ PLC..."
                      : "เช่น นำนักเรียนเข้าร่วมการแข่งขันศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่..."
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              {/* Date & Time Range */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  วันและเวลาที่ต้องการใช้งาน
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date & Time */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      วันและเวลาเริ่มต้น <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (endDate < e.target.value) {
                            setEndDate(e.target.value);
                          }
                        }}
                        className="col-span-2 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      วันและเวลาสิ้นสุด <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        required
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="col-span-2 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Department, Attendees & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    กลุ่มงาน / กลุ่มสาระการเรียนรู้
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    placeholder="เช่น กลุ่มสาระฯ วิทยาศาสตร์"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    placeholder="เช่น 081-234-5678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    จำนวนผู้เข้าร่วม (ประมาณการ)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Specific Options: Room Details */}
              {resourceType === "MEETING_ROOM" && (
                <div className="p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-4">
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    รายละเอียดการจัดห้องและอุปกรณ์
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        รูปแบบการจัดผังห้อง
                      </label>
                      <select
                        value={layoutType}
                        onChange={(e) => setLayoutType(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="THEATER">เธียเตอร์ (Theater / เก้าอี้แถวเรียง)</option>
                        <option value="CLASSROOM">ห้องเรียน (Classroom / โต๊ะพร้อมเก้าอี้)</option>
                        <option value="U_SHAPE">ตัวยู (U-Shape / ประชุมกลุ่มแลกเปลี่ยน)</option>
                        <option value="BOARDROOM">บอร์ดรูม (Boardroom / คณะกรรมการ)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={requireAirCon}
                          onChange={(e) => setRequireAirCon(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                        เปิดเครื่องปรับอากาศ (Air Conditioning)
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        อุปกรณ์โสตฯ ที่ต้องการเพิ่มเติม
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ไมค์ลอย 2 ตัว, พอยเตอร์เลื่อนสไลด์..."
                        value={audioVisualNotes}
                        onChange={(e) => setAudioVisualNotes(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        อาหารว่างและเครื่องดื่ม (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น เตรียมจุดวางอาหารว่าง พักเบรคช่วง 10:30 น."
                        value={cateringNotes}
                        onChange={(e) => setCateringNotes(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Specific Options: Vehicle Details */}
              {resourceType === "VEHICLE" && (
                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-4">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    รายละเอียดเส้นทางและผู้ร่วมเดินทาง
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        สถานที่ต้นทาง
                      </label>
                      <input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        สถานที่ปลายทาง <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น มหาวิทยาลัยราชภัฏอุดรธานี, สพม.อุดรธานี..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        ประเภทภารกิจ
                      </label>
                      <select
                        value={missionType}
                        onChange={(e) => setMissionType(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="OFFICIAL_MEETING">ไปราชการ / ประชุมสัมมนา</option>
                        <option value="STUDENT_COMPETITION">นำนักเรียนแข่งขัน / แข่งกีฬา</option>
                        <option value="FIELD_TRIP">ทัศนศึกษา / ดูงาน</option>
                        <option value="OTHER">อื่นๆ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        จำนวนครู / บุคลากร (คน)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={teacherCount}
                        onChange={(e) => setTeacherCount(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        จำนวนนักเรียน (คน)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={studentCount}
                        onChange={(e) => setStudentCount(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      รายชื่อผู้ร่วมเดินทาง / ข้อมูลเพิ่มเติม
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ระบุรายชื่อครูและนักเรียน หรือจุดนัดหมายขึ้นรถ..."
                      value={passengerListNotes}
                      onChange={(e) => setPassengerListNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || availableResources.length === 0}
                  className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "กำลังส่งคำขอจอง..." : "ยืนยันยื่นคำขอจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col): Rules, Status & Guidelines Container */}
        <div className="space-y-6">
          
          {/* Card 1: Rules & Guidelines */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              แนวทางปฏิบัติในการขอใช้ทรัพยากร
            </h3>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong>ยื่นคำขอล่วงหน้า:</strong> ควรยื่นคำขอล่วงหน้าอย่างน้อย 1-3 วันทำการ เพื่อให้หัวหน้างานจัดสรรและผู้อำนวยการพิจารณาอนุมัติ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong>ขั้นตอนการอนุมัติ 2 ระดับ:</strong> Step 1 หัวหน้างานตรวจสอบจัดสรรทรัพยากรและพนักงานขับรถ ➔ Step 2 ผู้อำนวยการอนุมัติขั้นสุดท้าย</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong>การจัดสรรยานพาหนะ:</strong> จัดสรรตามลำดับความจำเป็นเร่งด่วนของภารกิจราชการโรงเรียน และความเหมาะสมของขนาดรถ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong>การดูแลรักษาความเรียบร้อย:</strong> ผู้ขอใช้โปรดช่วยดูแลความสะอาด ปิดไฟ เครื่องปรับอากาศ และอุปกรณ์โสตฯ ทุกครั้งหลังเสร็จสิ้นภารกิจ</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Resource Status Overview */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              สถานะทรัพยากรในระบบ
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
                  <Building className="w-4 h-4" />
                  <span className="text-lg font-bold font-mono">
                    {resources.filter(r => r.type === "MEETING_ROOM" && r.status === "AVAILABLE").length}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  ห้องประชุมพร้อมใช้
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                  <Bus className="w-4 h-4" />
                  <span className="text-lg font-bold font-mono">
                    {resources.filter(r => r.type === "VEHICLE" && r.status === "AVAILABLE").length}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  รถโรงเรียนพร้อมใช้
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              * ระบบมีกลไกตรวจสอบตารางเวลาซ้ำซ้อนแบบเรียลไทม์ หากมีการจองซ้อนกันระบบจะแจ้งเตือนทันที
            </p>
          </div>

          {/* Card 3: Quick Contacts */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-500" />
              สายด่วนประสานงาน
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>งานอาคารสถานที่:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">โทรภายใน 104</span>
              </div>
              <div className="flex items-center justify-between">
                <span>งานยานพาหนะ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">โทรภายใน 105</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
