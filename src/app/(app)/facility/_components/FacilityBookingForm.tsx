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
  ChevronDown,
  ChevronUp,
  Lock
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useToast } from "@/components/toast-provider";
import { reserveFacilityAction } from "@/app/actions/facility";
import {
  formatISODateInput,
  type ModuleMode,
  parseRoomConfig,
  ROOM_LAYOUT_LABELS,
  STANDARD_DEPARTMENT_OPTIONS,
  type FacilitySemesterConfig,
  evaluateVehicleRecurringSlotsForDate,
  isDateInActiveSemester
} from "./facility-shared";
import RoomBlueprintCards from "./RoomBlueprintCards";

interface FacilityBookingFormProps {
  resources: any[];
  onSuccess?: () => void;
  currentUserProfile?: {
    id?: string;
    name?: string | null;
    subjectGroup?: string | null;
    phoneNumber?: string | null;
    position?: string | null;
  } | null;
  semesterConfig?: FacilitySemesterConfig | null;
  holidays?: any[];
  initialSelection?: {
    resourceId?: string;
    resourceType?: ModuleMode;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  } | null;
}

export default function FacilityBookingForm({
  resources,
  onSuccess,
  currentUserProfile,
  semesterConfig,
  holidays = [],
  initialSelection
}: FacilityBookingFormProps) {
  const { showToast } = useToast();
  const { data: session } = useSession();

  const [resourceType, setResourceType] = useState<ModuleMode>("MEETING_ROOM");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [isRoomSetupOpen, setIsRoomSetupOpen] = useState(false);

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

  // Selected resource and its default configuration
  const selectedResource = useMemo(() => {
    return resources.find((r) => r.id === selectedResourceId);
  }, [resources, selectedResourceId]);

  const selectedRoomConfig = useMemo(() => {
    if (!selectedResource || selectedResource.type !== "MEETING_ROOM") return null;
    return parseRoomConfig(selectedResource.description);
  }, [selectedResource]);

  // Form Fields
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState(formatISODateInput(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(formatISODateInput(new Date()));
  const [endTime, setEndTime] = useState("12:00");

  // Department & Contact Phone initialized from User Profile
  const [departmentSelect, setDepartmentSelect] = useState<string>("กลุ่มบริหารงานวิชาการ");
  const [customDepartment, setCustomDepartment] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<number>(15);

  const departmentOptions = useMemo(() => {
    const profileDept = (
      currentUserProfile?.subjectGroup ||
      (session?.user as any)?.subjectGroup ||
      ""
    ).trim();
    const list = [...STANDARD_DEPARTMENT_OPTIONS];
    if (profileDept && !list.includes(profileDept)) {
      list.unshift(profileDept);
    }
    return list;
  }, [currentUserProfile?.subjectGroup, session?.user]);

  useEffect(() => {
    if (profileInitialized) return;
    const profileDept = (
      currentUserProfile?.subjectGroup ||
      (session?.user as any)?.subjectGroup ||
      ""
    ).trim();
    const profilePhone = (
      currentUserProfile?.phoneNumber ||
      (session?.user as any)?.phoneNumber ||
      ""
    ).trim();

    if (profileDept || profilePhone || currentUserProfile) {
      if (profileDept) {
        setDepartmentSelect(profileDept);
      }
      if (profilePhone) {
        setContactPhone(profilePhone);
      }
      setProfileInitialized(true);
    }
  }, [currentUserProfile, session?.user, profileInitialized]);

  const resolvedDepartment =
    departmentSelect === "__OTHER__" ? customDepartment.trim() : departmentSelect.trim();

  // Evaluate recurring vehicle schedule & semester status for selected vehicle + date/time
  const vehicleScheduleCheck = useMemo(() => {
    if (resourceType !== "VEHICLE" || !selectedResource) return null;
    const sDt = new Date(`${startDate}T${startTime}:00`);
    const eDt = new Date(`${endDate}T${endTime}:00`);
    if (isNaN(sDt.getTime()) || isNaN(eDt.getTime()) || eDt <= sDt) return null;

    const semState = isDateInActiveSemester(sDt, semesterConfig, holidays);
    const conflicts: Array<{ title: string; startTime: string; endTime: string; dateStr: string }> = [];
    const unlockedSlots: Array<{ title: string; startTime: string; endTime: string; reason: string }> = [];

    const cursor = new Date(sDt.getFullYear(), sDt.getMonth(), sDt.getDate());
    const lastDay = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate());

    while (cursor <= lastDay) {
      const daySlots = evaluateVehicleRecurringSlotsForDate(
        selectedResource,
        cursor,
        semesterConfig,
        holidays
      );
      for (const slot of daySlots) {
        const [sh, sm] = (slot.rule.startTime || "06:30").split(":").map(Number);
        const [eh, em] = (slot.rule.endTime || "08:15").split(":").map(Number);
        const slotStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), sh || 0, sm || 0, 0);
        const slotEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), eh || 0, em || 0, 0);

        if (sDt < slotEnd && eDt > slotStart) {
          if (slot.isLocked) {
            conflicts.push({
              title: slot.rule.title,
              startTime: slot.rule.startTime,
              endTime: slot.rule.endTime,
              dateStr: formatISODateInput(cursor)
            });
          } else {
            unlockedSlots.push({
              title: slot.rule.title,
              startTime: slot.rule.startTime,
              endTime: slot.rule.endTime,
              reason: slot.statusReason
            });
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      semState,
      conflicts,
      unlockedSlots
    };
  }, [resourceType, selectedResource, startDate, startTime, endDate, endTime, semesterConfig, holidays]);

  // Room Specific Fields
  const [layoutType, setLayoutType] = useState("THEATER");
  const [layoutNotes, setLayoutNotes] = useState("");
  const [audioVisualNotes, setAudioVisualNotes] = useState("");
  const [cateringNotes, setCateringNotes] = useState("");
  const [requireAirCon, setRequireAirCon] = useState(true);

  // Auto-populate room default layout & equipment whenever a meeting room is selected
  useEffect(() => {
    if (selectedRoomConfig) {
      setLayoutType(selectedRoomConfig.defaultLayout || "THEATER");
      setAudioVisualNotes(selectedRoomConfig.defaultEquipment || "");
    }
  }, [selectedRoomConfig]);

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

    if (!resolvedDepartment) {
      showToast("error", "กรุณาเลือกหรือระบุกลุ่มงาน / กลุ่มสาระการเรียนรู้");
      return;
    }

    if (resourceType === "VEHICLE" && vehicleScheduleCheck && vehicleScheduleCheck.conflicts.length > 0) {
      const c = vehicleScheduleCheck.conflicts[0];
      showToast(
        "error",
        `ช่วงเวลาที่เลือกติดคิวรถประจำสัปดาห์ "${c.title}" (${c.startTime} - ${c.endTime} น.) ในช่วงเปิดภาคเรียน`
      );
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
        department: resolvedDepartment,
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

                {selectedRoomConfig && (
                  <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      <strong>ผังมาตรฐานห้อง:</strong>{" "}
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        {ROOM_LAYOUT_LABELS[selectedRoomConfig.defaultLayout] || selectedRoomConfig.defaultLayout}
                      </span>
                    </span>
                    {selectedRoomConfig.defaultEquipment && (
                      <span>
                        <strong>อุปกรณ์มาตรฐาน:</strong> {selectedRoomConfig.defaultEquipment}
                      </span>
                    )}
                  </div>
                )}

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
                  {/* Recurring Vehicle Schedule & Semester Status Banner */}
                  {resourceType === "VEHICLE" && vehicleScheduleCheck && (
                    <div className="pt-1">
                      {vehicleScheduleCheck.conflicts.length > 0 ? (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              ติดคิวเดินรถประจำสัปดาห์ (ช่วงเปิดภาคเรียน): &ldquo;{vehicleScheduleCheck.conflicts[0].title}&rdquo; ({vehicleScheduleCheck.conflicts[0].startTime} – {vehicleScheduleCheck.conflicts[0].endTime} น.)
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 pl-5.5">
                            วันที่เลือกอยู่ใน{vehicleScheduleCheck.semState.semesterName || "ช่วงเปิดภาคเรียน"} กรุณาเลือกช่วงเวลาอื่นที่ไม่ชนกับเวลารับ-ส่งนักเรียนประจำวัน หรือเลือกคันอื่นที่ว่าง
                          </p>
                        </div>
                      ) : vehicleScheduleCheck.unlockedSlots.length > 0 ? (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              ปลดล็อคคิวรับ-ส่งนักเรียนประจำวันแล้ว ({vehicleScheduleCheck.semState.reason})
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 pl-5.5">
                            เนื่องจากวันที่เลือกไม่ใช่วันเปิดเรียนปกติ จึงสามารถจองใช้รถพานักเรียนไปแข่งขันหรือทำกิจกรรมในช่วงเวลา {vehicleScheduleCheck.unlockedSlots[0].startTime} – {vehicleScheduleCheck.unlockedSlots[0].endTime} น. ได้ตามปกติ
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Department, Attendees & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    กลุ่มงาน / กลุ่มสาระการเรียนรู้
                  </label>
                  <div className="space-y-2">
                    <select
                      value={departmentSelect}
                      onChange={(e) => setDepartmentSelect(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white cursor-pointer"
                    >
                      {departmentOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="__OTHER__">อื่นๆ (ระบุเอง)...</option>
                    </select>

                    {departmentSelect === "__OTHER__" && (
                      <input
                        type="text"
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        placeholder="ระบุกลุ่มงาน / กลุ่มสาระฯ / หน่วยงาน..."
                        autoFocus
                      />
                    )}
                  </div>
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

              {/* Specific Options: Room Details (Collapsible, Collapsed by default) */}
              {resourceType === "MEETING_ROOM" && (
                <div className="p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-4">
                  <button
                    type="button"
                    onClick={() => setIsRoomSetupOpen(!isRoomSetupOpen)}
                    className="w-full flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 group-hover:text-indigo-600 transition-colors">
                        <Building className="w-4 h-4" />
                        <span>
                          {isRoomSetupOpen
                            ? "รายละเอียดการจัดห้องและอุปกรณ์ (คลิกเพื่อพับเก็บ)"
                            : "รายละเอียดการจัดห้องและอุปกรณ์ (คลิกเพื่อเปิดดู / เปลี่ยนผังห้อง)"}
                        </span>
                      </div>
                      {!isRoomSetupOpen && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-indigo-200/60 dark:border-indigo-800/60 text-slate-600 dark:text-slate-300">
                          ผังปัจจุบัน: {ROOM_LAYOUT_LABELS[layoutType] || layoutType}
                        </span>
                      )}
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400">
                      {isRoomSetupOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isRoomSetupOpen && (
                    <div className="space-y-4 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40">
                      {/* Blueprint Layout Selection (6 Graphic Cards) */}
                      <RoomBlueprintCards
                        selected={layoutType}
                        onSelect={(val) => setLayoutType(val)}
                      />

                      {selectedRoomConfig && (
                        <div className="pt-1">
                          {layoutType === (selectedRoomConfig.defaultLayout || "THEATER") ? (
                            <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>ใช้การจัดห้องตามมาตรฐานเดิมของห้อง ({ROOM_LAYOUT_LABELS[layoutType] || layoutType})</span>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                              <div className="font-bold flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>คุณกำลังเลือกจัดห้องแบบใหม่ ({ROOM_LAYOUT_LABELS[layoutType] || layoutType})</span>
                              </div>
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 pl-5.5">
                                แตกต่างจากผังมาตรฐานเดิม ({ROOM_LAYOUT_LABELS[selectedRoomConfig.defaultLayout] || selectedRoomConfig.defaultLayout}) ข้อมูลนี้จะแสดงบนใบขอใช้และแจ้งผู้ดูแลเพื่อเตรียมการจัดผังล่วงหน้า
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center pt-1">
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
