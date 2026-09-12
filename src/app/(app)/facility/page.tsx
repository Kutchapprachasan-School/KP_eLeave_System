"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building, 
  Bus, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle2, 
  Printer, 
  Search, 
  MapPin, 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Check, 
  Car, 
  UserCheck, 
  Settings, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ToggleLeft, 
  ToggleRight,
  Info,
  Lock,
  Layers,
  FileText
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import Link from "next/link";
import {
  SubsystemHeader,
  StatusPillBadge,
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
  MatrixShell,
  MatrixHeaderCell,
  PRIMARY_ACTION_BUTTON_CLASSES,
} from "@/components/shared-ui/school-ops";
import { 
  getFacilityResourcesAction, 
  getFacilityReservationsAction, 
  reserveFacilityAction, 
  reviewFacilityReservationHeadAction, 
  approveFacilityReservationDirectorAction, 
  rejectFacilityReservationAction, 
  cancelFacilityReservationAction,
  getDriverProfilesAction,
  createFacilityResourceAction,
  updateFacilityResourceAction,
  toggleFacilityResourceStatusAction,
  deleteFacilityResourceAction,
  getCurrentFacilityUserRoleAction
} from "@/app/actions/facility";

type ModuleMode = "MEETING_ROOM" | "VEHICLE";
type ActiveTab = "SCHEDULE" | "MY_BOOKINGS" | "APPROVALS" | "CRUD";

// Hours from 08:00 to 17:00
const MATRIX_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

function toThaiDateString(dateInput: string | Date | null | undefined, full: boolean = false) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const fullMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const d = date.getDate();
  const m = full ? fullMonths[date.getMonth()] : months[date.getMonth()];
  const y = date.getFullYear() + 543;

  if (full) {
    return `วัน${days[date.getDay()]}ที่ ${d} ${m} ${y}`;
  }
  return `${d} ${m} ${y}`;
}

function toThaiTimeString(dateInput: string | Date | null | undefined) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} น.`;
}

function formatISODateInput(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function UnifiedFacilityPortalPage() {
  const { showToast } = useToast();

  // 1. Two-Pillars Mode & Role-Adaptive Tabs
  const [moduleMode, setModuleMode] = useState<ModuleMode>("MEETING_ROOM");
  const [activeTab, setActiveTab] = useState<ActiveTab>("SCHEDULE");

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [userRoleInfo, setUserRoleInfo] = useState<any>(null);

  // Date Navigator for Visual Schedule Matrix
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    title: "",
    purpose: "",
    startDate: formatISODateInput(new Date()),
    startTime: "09:00",
    endDate: formatISODateInput(new Date()),
    endTime: "12:00",
    attendeeCount: 15,
    department: "กลุ่มสาระการเรียนรู้",
    contactPhone: "",
    // Room details
    layoutType: "THEATER",
    layoutNotes: "",
    audioVisualNotes: "",
    cateringNotes: "",
    requireAirCon: true,
    // Vehicle details
    missionType: "OFFICIAL_MEETING",
    origin: "โรงเรียนกุดจับประชาสรรค์",
    destination: "",
    teacherCount: 2,
    studentCount: 0,
    passengerListNotes: "",
    driverProfileId: ""
  });

  // Modal Dialogs for Approval & Rejection
  const [reviewingReservation, setReviewingReservation] = useState<any>(null);
  const [reviewDriverId, setReviewDriverId] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const [directorApprovalTarget, setDirectorApprovalTarget] = useState<any>(null);
  const [directorComment, setDirectorComment] = useState("อนุมัติตามเสนอ");

  const [rejectingTarget, setRejectingTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [cancelTarget, setCancelTarget] = useState<any>(null);

  // CRUD State
  const [quickAddForm, setQuickAddForm] = useState({
    code: "",
    name: "",
    type: "MEETING_ROOM" as ModuleMode,
    capacity: 30,
    location: "",
    description: "",
    licensePlate: "",
    floor: "ชั้น 1"
  });
  const [addingResource, setAddingResource] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    capacity: 0,
    location: "",
    description: "",
    status: "AVAILABLE",
    floor: "ชั้น 1",
    licensePlate: "",
    brand: "",
    model: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [moduleMode]);

  async function loadData() {
    try {
      setLoading(true);
      const [resList, allBookings, myBookings, driverList, roleInfo] = await Promise.all([
        getFacilityResourcesAction(moduleMode).catch(() => []),
        getFacilityReservationsAction({ consumerModule: moduleMode }).catch(() => []),
        getFacilityReservationsAction({ consumerModule: moduleMode, onlyMine: true }).catch(() => []),
        getDriverProfilesAction().catch(() => []),
        getCurrentFacilityUserRoleAction().catch(() => null)
      ]);

      setResources(resList || []);
      setReservations(allBookings || []);
      setMyReservations(myBookings || []);
      setDrivers(driverList || []);
      setUserRoleInfo(roleInfo);
    } catch (err: any) {
      console.error("Failed to load facility data:", err);
      showToast("error", "ไม่สามารถดึงข้อมูลระบบได้: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Date Navigator Helpers
  const handlePrevDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleTomorrow = () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  // Open general booking modal
  const handleOpenGeneralBooking = () => {
    const defaultRes = resources.find(r => r.status === "AVAILABLE") || null;
    setSelectedResource(defaultRes);
    const dateStr = formatISODateInput(selectedDate);
    setBookingForm(prev => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr,
      startTime: "09:00",
      endTime: "12:00"
    }));
    setShowAdvancedOptions(false);
    setIsBookingModalOpen(true);
  };

  // Open 1-Click booking from free slot on the Matrix
  const handleOpenSlotBooking = (resource: any, hour: number) => {
    if (resource.status !== "AVAILABLE") return;
    setSelectedResource(resource);
    const dateStr = formatISODateInput(selectedDate);
    const startStr = `${String(hour).padStart(2, "0")}:00`;
    const endStr = `${String(hour + 1).padStart(2, "0")}:00`;

    setBookingForm(prev => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr,
      startTime: startStr,
      endTime: endStr
    }));
    setShowAdvancedOptions(false);
    setIsBookingModalOpen(true);
  };

  // Submit Booking (View Only -> DB Transaction final authority)
  const handleSubmittingBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) {
      showToast("error", "กรุณาเลือกทรัพยากรที่ต้องการจอง");
      return;
    }

    try {
      setSubmitting(true);
      const startAt = `${bookingForm.startDate}T${bookingForm.startTime}:00`;
      const endAt = `${bookingForm.endDate}T${bookingForm.endTime}:00`;
      const isVehicleTarget = selectedResource.type === "VEHICLE";

      await reserveFacilityAction({
        resourceId: selectedResource.id,
        consumerModule: isVehicleTarget ? "VEHICLE" : "MEETING_ROOM",
        title: bookingForm.title.trim(),
        purpose: bookingForm.purpose.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        attendeeCount: Number(bookingForm.attendeeCount) || 10,
        department: bookingForm.department,
        contactPhone: bookingForm.contactPhone || undefined,
        ...(!isVehicleTarget ? {
          roomDetails: {
            layoutType: bookingForm.layoutType,
            layoutNotes: bookingForm.layoutNotes || undefined,
            audioVisualNotes: bookingForm.audioVisualNotes || undefined,
            cateringNotes: bookingForm.cateringNotes || undefined,
            requireAirCon: bookingForm.requireAirCon
          }
        } : {
          vehicleDetails: {
            missionType: bookingForm.missionType,
            origin: bookingForm.origin,
            destination: bookingForm.destination.trim() || "-",
            teacherCount: Number(bookingForm.teacherCount) || 1,
            studentCount: Number(bookingForm.studentCount) || 0,
            passengerListNotes: bookingForm.passengerListNotes || undefined
          }
        })
      });

      showToast("success", "ยื่นคำขอจองสำเร็จ! ระบบได้บันทึกคำขอและส่งต่อไปยังขั้นตอนพิจารณาอนุมัติแล้ว");
      setIsBookingModalOpen(false);
      setBookingForm(prev => ({ ...prev, title: "", purpose: "", destination: "" }));
      await loadData();
      setActiveTab("MY_BOOKINGS");
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาดในการจอง");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: Head Review Submit
  const handleHeadReviewSubmit = async () => {
    if (!reviewingReservation) return;
    try {
      setSubmitting(true);
      await reviewFacilityReservationHeadAction(reviewingReservation.id, {
        driverProfileId: reviewDriverId || undefined,
        comment: reviewComment || undefined
      });
      showToast("success", "บันทึกผลการจัดสรรและส่งต่อผู้อำนวยการเรียบร้อยแล้ว");
      setReviewingReservation(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Director Final Approval Submit
  const handleDirectorApproveSubmit = async () => {
    if (!directorApprovalTarget) return;
    try {
      setSubmitting(true);
      await approveFacilityReservationDirectorAction(directorApprovalTarget.id, { 
        comment: directorComment 
      });
      showToast("success", "ผู้อำนวยการอนุมัติคำขอจองเรียบร้อยแล้ว!");
      setDirectorApprovalTarget(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Reject Submit
  const handleRejectSubmit = async () => {
    if (!rejectingTarget) return;
    if (!rejectionReason.trim()) {
      showToast("error", "กรุณาระบุเหตุผลในการไม่อนุมัติ/ปฏิเสธ");
      return;
    }
    try {
      setSubmitting(true);
      await rejectFacilityReservationAction(rejectingTarget.id, rejectionReason.trim());
      showToast("success", "ปฏิเสธคำขอเรียบร้อยแล้ว");
      setRejectingTarget(null);
      setRejectionReason("");
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Submit
  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;
    try {
      setSubmitting(true);
      await cancelFacilityReservationAction(cancelTarget.id);
      showToast("success", "ยกเลิกคำขอเรียบร้อยแล้ว");
      setCancelTarget(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Add Resource
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.code.trim() || !quickAddForm.name.trim()) {
      showToast("error", "กรุณากรอกรหัสกำกับและชื่อทรัพยากร");
      return;
    }
    try {
      setAddingResource(true);
      const isVehicle = moduleMode === "VEHICLE";
      await createFacilityResourceAction({
        code: quickAddForm.code.trim(),
        name: quickAddForm.name.trim(),
        type: moduleMode,
        capacity: Number(quickAddForm.capacity) || 30,
        location: quickAddForm.location.trim() || undefined,
        description: quickAddForm.description.trim() || undefined,
        ...(isVehicle ? {
          vehicleProfile: {
            licensePlate: quickAddForm.licensePlate.trim() || quickAddForm.code.trim(),
            seatCapacity: Number(quickAddForm.capacity) || 12
          }
        } : {
          roomProfile: {
            floor: quickAddForm.floor || "ชั้น 1",
            hasProjector: true,
            hasSoundSystem: true
          }
        })
      });

      showToast("success", `เพิ่มรายการ "${quickAddForm.name}" เรียบร้อยแล้ว!`);
      setQuickAddForm({
        code: "",
        name: "",
        type: moduleMode,
        capacity: 30,
        location: "",
        description: "",
        licensePlate: "",
        floor: "ชั้น 1"
      });
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setAddingResource(false);
    }
  };

  // Edit Resource
  const handleOpenEdit = (res: any) => {
    setEditingResource(res);
    setEditForm({
      code: res.code || "",
      name: res.name || "",
      capacity: res.capacity || 0,
      location: res.location || "",
      description: res.description || "",
      status: res.status || "AVAILABLE",
      floor: res.roomProfile?.floor || "ชั้น 1",
      licensePlate: res.vehicleProfile?.licensePlate || "",
      brand: res.vehicleProfile?.brand || "",
      model: res.vehicleProfile?.model || ""
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    try {
      setSavingEdit(true);
      const isVehicle = editingResource.type === "VEHICLE";
      await updateFacilityResourceAction(editingResource.id, {
        code: editForm.code,
        name: editForm.name,
        capacity: Number(editForm.capacity),
        location: editForm.location,
        description: editForm.description,
        status: editForm.status as any,
        ...(isVehicle ? {
          vehicleProfile: {
            licensePlate: editForm.licensePlate,
            brand: editForm.brand,
            model: editForm.model,
            seatCapacity: Number(editForm.capacity)
          }
        } : {
          roomProfile: {
            floor: editForm.floor
          }
        })
      });

      showToast("success", "บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว");
      setEditingResource(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (resource: any) => {
    const nextStatus = resource.status === "AVAILABLE" ? "UNDER_MAINTENANCE" : "AVAILABLE";
    const label = nextStatus === "AVAILABLE" ? "พร้อมให้บริการ" : "แจ้งซ่อมบำรุง";
    try {
      await toggleFacilityResourceStatusAction(resource.id, nextStatus as any);
      showToast("success", `เปลี่ยนสถานะ "${resource.name}" เป็น "${label}" แล้ว`);
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDeleteResource = async (resource: any) => {
    try {
      const res = await deleteFacilityResourceAction(resource.id);
      if (res.action === "RETIRED") {
        showToast("info", `มีประวัติการจองในระบบ จึงเปลี่ยนสถานะเป็น "ปลดระวาง (RETIRED)"`);
      } else {
        showToast("success", `ลบข้อมูลทรัพยากร "${resource.name}" สำเร็จ`);
      }
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  // Filtered lists
  const filteredResources = useMemo(() => {
    return resources.filter(r => 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [resources, searchQuery]);

  // Selected Day's active bookings for Schedule Matrix
  const dayBookings = useMemo(() => {
    const selectedDateStr = formatISODateInput(selectedDate);
    return reservations.filter(res => {
      if (res.status === "CANCELLED" || res.status === "REJECTED") return false;
      const resStartStr = formatISODateInput(new Date(res.startAt));
      const resEndStr = formatISODateInput(new Date(res.endAt));
      return resStartStr <= selectedDateStr && selectedDateStr <= resEndStr;
    });
  }, [reservations, selectedDate]);

  // Permissions & Role Adaptive UI (UX Layer)
  const isPrivileged = userRoleInfo?.canManage || userRoleInfo?.isAdmin || userRoleInfo?.isDirector || false;
  const pendingApprovalsCount = reservations.filter(r => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 md:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto font-sans">
      
      {/* TOP HEADER & TWO-PILLARS SWITCHER */}
      <SubsystemHeader
        title={
          moduleMode === "MEETING_ROOM"
            ? "ระบบจองห้องประชุมและอาคารสถานที่"
            : "ระบบจองรถโรงเรียนและยานพาหนะ"
        }
        subtitle="เช็คคิวว่างทันใจ จองง่ายใน 1 นาที และติดตามสถานะแบบเรียลไทม์"
        categoryTitle="ระบบบริหารทรัพยากรสถานศึกษา"
        subsystem={moduleMode === "MEETING_ROOM" ? "facility_room" : "facility_vehicle"}
        versionBadge="v7.3 Teacher-Centric"
        roleBadge={userRoleInfo?.role}
        icon={moduleMode === "MEETING_ROOM" ? Building : Bus}
        actions={
          <>
            {/* Two-Pillars Segmented Toggle (Option A Approved) */}
            <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                onClick={() => setModuleMode("MEETING_ROOM")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  moduleMode === "MEETING_ROOM"
                    ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <Building className="w-4 h-4" />
                ห้องประชุม
              </button>
              <button
                onClick={() => setModuleMode("VEHICLE")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  moduleMode === "VEHICLE"
                    ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <Car className="w-4 h-4" />
                รถโรงเรียน
              </button>
            </div>

            {/* Primary Action Button: Standardized to Unified Indigo */}
            <button
              onClick={handleOpenGeneralBooking}
              className={PRIMARY_ACTION_BUTTON_CLASSES}
            >
              <Plus className="w-4 h-4" />
              + ยื่นคำขอจอง
            </button>
          </>
        }
      />

      {/* ROLE-ADAPTIVE NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {/* Tab 1: Schedule Matrix (Always available) */}
          <button
            onClick={() => setActiveTab("SCHEDULE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "SCHEDULE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            ปฏิทินตารางคิว & จองทันใจ
          </button>

          {/* Tab 2: My Bookings (Always available) */}
          <button
            onClick={() => setActiveTab("MY_BOOKINGS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "MY_BOOKINGS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            ประวัติคำขอของฉัน ({myReservations.length})
          </button>

          {/* Privileged Tabs: Approvals & CRUD */}
          {isPrivileged && (
            <>
              <button
                onClick={() => setActiveTab("APPROVALS")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === "APPROVALS"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                ศูนย์พิจารณาอนุมัติ
                {pendingApprovalsCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("CRUD")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === "CRUD"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Settings className="w-4 h-4" />
                จัดการทรัพยากร (CRUD)
              </button>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, สถานที่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VISUAL SCHOOL SCHEDULE MATRIX (SCHEDULE)           */}
      {/* ========================================================= */}
      {activeTab === "SCHEDULE" && (
        <div className="space-y-4">
          {/* Date Navigator Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="วันก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDay}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="วันถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="font-bold text-sm text-slate-900 dark:text-white px-2">
                {toThaiDateString(selectedDate, true)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                วันนี้
              </button>
              <button
                onClick={handleTomorrow}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                พรุ่งนี้
              </button>
              <input
                type="date"
                value={formatISODateInput(selectedDate)}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(new Date(e.target.value));
                }}
                className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs px-2 text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/40" />
              <span>ว่าง (คลิกเพื่อจองทันใจ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 dark:bg-amber-950" />
              <span>รอการพิจารณา (ล็อกคิวแล้ว)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-purple-600 text-white" />
              <span>อนุมัติแล้ว</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
              <span>ปิดซ่อมบำรุง / ปลดระวาง</span>
            </div>
          </div>

          {/* School Schedule Matrix Table */}
          {filteredResources.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
              ไม่พบรายการทรัพยากรในระบบ
            </div>
          ) : (
            <MatrixShell>
              <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 w-24 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-slate-700">
                        ช่วงเวลา
                      </th>
                      {filteredResources.map((res) => (
                        <th key={res.id} className="p-3 text-left min-w-[190px] border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span className="truncate">{res.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 font-semibold ml-1">
                              {res.code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5 flex items-center gap-1">
                            {moduleMode === "MEETING_ROOM" ? (
                              <span>{res.capacity ? `${res.capacity} ที่นั่ง` : "-"} • {res.roomProfile?.floor || res.location || "ชั้น 1"}</span>
                            ) : (
                              <span>{res.vehicleProfile?.licensePlate || "-"} • {res.capacity || 12} ที่นั่ง</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {MATRIX_HOURS.map((hour) => {
                      const hourStart = new Date(selectedDate);
                      hourStart.setHours(hour, 0, 0, 0);
                      const hourEnd = new Date(selectedDate);
                      hourEnd.setHours(hour + 1, 0, 0, 0);

                      const timeLabel = `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;

                      return (
                        <tr key={hour} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition">
                          {/* Time Column */}
                          <td className="p-2.5 text-center font-mono font-medium text-slate-500 border-r border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 whitespace-nowrap">
                            {timeLabel}
                          </td>

                          {/* Resource Slots */}
                          {filteredResources.map((res) => {
                            if (res.status !== "AVAILABLE") {
                              return (
                                <td key={res.id} className="p-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 text-center text-[11px]">
                                  <span className="inline-flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> {res.status === "UNDER_MAINTENANCE" ? "ปิดซ่อมบำรุง" : "ไม่พร้อมใช้"}
                                  </span>
                                </td>
                              );
                            }

                            // Find booking overlapping this specific hour interval
                            const overlappingBooking = dayBookings.find(b => {
                              if (b.resourceId !== res.id) return false;
                              const bStart = new Date(b.startAt);
                              const bEnd = new Date(b.endAt);
                              return bStart < hourEnd && bEnd > hourStart;
                            });

                            // Case 1: Slot Occupied by APPROVED or IN_USE
                            if (overlappingBooking && (overlappingBooking.status === "APPROVED" || overlappingBooking.status === "IN_USE")) {
                              const bStart = new Date(overlappingBooking.startAt);
                              const bEnd = new Date(overlappingBooking.endAt);
                              const isOverHour = bEnd.getHours() > 17 || bEnd > hourEnd;

                              return (
                                <td key={res.id} className="p-1.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-purple-50/60 dark:bg-purple-950/20">
                                  <div className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs space-y-0.5">
                                    <div className="font-bold truncate text-[11px]">
                                      {overlappingBooking.title}
                                    </div>
                                    <div className="text-[10px] text-purple-100 flex items-center justify-between">
                                      <span className="truncate">{overlappingBooking.reservedByUser?.name || "ครู"}</span>
                                      <span className="font-mono">{toThaiTimeString(bStart)} - {toThaiTimeString(bEnd)}</span>
                                    </div>
                                    {isOverHour && (
                                      <div className="text-[9px] bg-purple-700/80 px-1.5 py-0.2 rounded inline-block font-semibold">
                                        ใช้ถึง {toThaiTimeString(bEnd)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Case 2: Slot Locked by PENDING (Senior Red Lock 2: strictly blocks slot, no double booking!)
                            if (overlappingBooking && overlappingBooking.status === "PENDING") {
                              const bStart = new Date(overlappingBooking.startAt);
                              const bEnd = new Date(overlappingBooking.endAt);

                              return (
                                <td key={res.id} className="p-1.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-amber-50/60 dark:bg-amber-950/20">
                                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 shadow-2xs space-y-0.5">
                                    <div className="font-bold truncate text-[11px] flex items-center gap-1">
                                      <span>⏳ {overlappingBooking.title}</span>
                                    </div>
                                    <div className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                                      <span className="truncate">{overlappingBooking.reservedByUser?.name || "ครู"}</span>
                                      <span className="font-mono">{toThaiTimeString(bStart)} - {toThaiTimeString(bEnd)}</span>
                                    </div>
                                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                      (รอการอนุมัติ - ล็อกคิวแล้ว)
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            // Case 3: Free Slot (Lightweight Cell with 1-Click Booking)
                            return (
                              <td
                                key={res.id}
                                onClick={() => handleOpenSlotBooking(res, hour)}
                                className="p-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-center cursor-pointer hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 transition group"
                                title={`คลิกเพื่อจอง ${res.name} ช่วงเวลา ${timeLabel}`}
                              >
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg shadow-2xs">
                                  <Plus className="w-3 h-3" /> จองช่วงนี้
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </MatrixShell>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MY BOOKINGS (ประวัติคำขอของฉัน + พิมพ์ A4)          */}
      {/* ========================================================= */}
      {activeTab === "MY_BOOKINGS" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                ประวัติคำขอจองของฉัน ({myReservations.length} รายการ)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามขั้นตอนการอนุมัติ พิมพ์เอกสารแบบฟอร์ม A4 หรือยกเลิกคำขอ
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              รีเฟรช
            </button>
          </div>

          {myReservations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">คุณยังไม่มีประวัติการยื่นขอจองในหมวดนี้</p>
              <button
                onClick={handleOpenGeneralBooking}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> ยื่นคำขอจองใหม่
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myReservations.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {res.bookingNumber || "KP-FACILITY"}
                      </span>

                      {/* Status Badge */}
                      <StatusPillBadge
                        status={res.status}
                        label={
                          res.status === "APPROVED" ? "ได้รับการอนุมัติแล้ว" :
                          res.status === "PENDING" && res.currentStep === 1 ? "รอหัวหน้างานจัดสรร (Step 1/2)" :
                          res.status === "PENDING" && res.currentStep === 2 ? "รอ ผอ.อนุมัติขั้นสุดท้าย (Step 2/2)" :
                          res.status === "CANCELLED" ? "ยกเลิกแล้ว" :
                          res.status === "IN_USE" ? "กำลังใช้งาน" :
                          res.status === "COMPLETED" ? "เสร็จสิ้นภารกิจ" : undefined
                        }
                        size="sm"
                      />
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {res.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span><strong>ทรัพยากร:</strong> {res.resource?.name}</span>
                      <span><strong>วันใช้งาน:</strong> {toThaiDateString(res.startAt)}</span>
                      <span><strong>เวลา:</strong> {toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)}</span>
                      {res.vehicleDetails?.destination && (
                        <span><strong>ปลายทาง:</strong> {res.vehicleDetails.destination}</span>
                      )}
                    </div>

                    {res.rejectionReason && (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        เหตุผล: {res.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={moduleMode === "MEETING_ROOM" ? `/print/facility/room/${res.id}` : `/print/facility/vehicle/${res.id}`}
                      target="_blank"
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์แบบฟอร์ม A4
                    </Link>

                    {res.status === "PENDING" && (
                      <button
                        onClick={() => setCancelTarget(res)}
                        className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                      >
                        ยกเลิกคำขอ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: APPROVAL HUB (PRIVILEGED ONLY)                     */}
      {/* ========================================================= */}
      {isPrivileged && activeTab === "APPROVALS" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                ศูนย์พิจารณาอนุมัติคำขอจอง (Official 2-Tier Approval Hub)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ขั้นตอนที่ 1: หัวหน้างานตรวจสอบจัดสรร ➔ ขั้นตอนที่ 2: ผู้อำนวยการโรงเรียนอนุมัติขั้นสุดท้าย
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {reservations.filter(r => r.status === "PENDING").length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">ไม่มีรายการคำขอค้างรอการพิจารณาในขณะนี้</p>
              </div>
            ) : (
              reservations.filter(r => r.status === "PENDING").map((res) => (
                <div
                  key={res.id}
                  className="p-5 rounded-2xl border-2 border-amber-200/80 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-amber-200/40 dark:border-amber-900/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">{res.bookingNumber}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-200 font-bold">
                        สถานะ: รอพิจารณาขั้นตอนที่ {res.currentStep || 1} จาก 2
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      ยื่นเมื่อ {toThaiDateString(res.createdAt)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">ชื่องาน / ภารกิจ:</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{res.title}</p>
                      {res.purpose && <p className="text-slate-500 mt-1">{res.purpose}</p>}
                    </div>

                    <div className="space-y-1">
                      <div><span className="font-semibold">ทรัพยากร:</span> {res.resource?.name}</div>
                      <div><span className="font-semibold">ผู้ขอใช้:</span> {res.reservedByUser?.name} ({res.department || "กลุ่มสาระฯ"})</div>
                      <div><span className="font-semibold">ช่วงเวลา:</span> {toThaiDateString(res.startAt)} ({toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)})</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-amber-200/40 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {res.currentStep === 1 
                        ? "รอการตรวจสอบจัดสรรโดย: หัวหน้างานอาคารสถานที่ / หัวหน้างานยานพาหนะ"
                        : "รอการอนุมัติขั้นสุดท้ายโดย: ผู้อำนวยการโรงเรียน"}
                    </div>

                    <div className="flex items-center gap-2">
                      {res.currentStep === 1 && (
                        <button
                          onClick={() => {
                            setReviewingReservation(res);
                            setReviewDriverId(res.vehicleDetails?.driverProfileId || "");
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          ดำเนินการจัดสรร / ตรวจสอบ (Step 1)
                        </button>
                      )}

                      {res.currentStep === 2 && (
                        <button
                          onClick={() => {
                            setDirectorApprovalTarget(res);
                            setDirectorComment("อนุมัติตามเสนอ");
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ผู้อำนวยการอนุมัติ (Step 2)
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setRejectingTarget(res);
                          setRejectionReason("");
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-bold transition"
                      >
                        ไม่อนุมัติ / ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CRUD RESOURCE MANAGEMENT (PRIVILEGED ONLY)         */}
      {/* ========================================================= */}
      {isPrivileged && activeTab === "CRUD" && (
        <div className="space-y-6">
          {/* Quick Add Resource Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                เพิ่มทรัพยากรส่วนกลางใหม่ (Quick Add: {moduleMode === "MEETING_ROOM" ? "ห้องประชุม" : "รถโรงเรียน"})
              </h2>
            </div>

            <form onSubmit={handleCreateResource} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  รหัสกำกับ *
                </label>
                <input
                  type="text"
                  required
                  placeholder={moduleMode === "MEETING_ROOM" ? "เช่น ROOM-02" : "เช่น BUS-02"}
                  value={quickAddForm.code}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อทรัพยากร *
                </label>
                <input
                  type="text"
                  required
                  placeholder={moduleMode === "MEETING_ROOM" ? "เช่น ห้องประชุมกุญชร 2" : "เช่น รถตู้โตโยต้า 14 ที่นั่ง"}
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  {moduleMode === "VEHICLE" ? "ทะเบียนรถ" : "สถานที่ / ชั้น"}
                </label>
                <input
                  type="text"
                  placeholder={moduleMode === "VEHICLE" ? "เช่น นข-5678 อุดรธานี" : "เช่น อาคาร 1 ชั้น 2"}
                  value={moduleMode === "VEHICLE" ? quickAddForm.licensePlate : quickAddForm.floor}
                  onChange={(e) => moduleMode === "VEHICLE" 
                    ? setQuickAddForm({ ...quickAddForm, licensePlate: e.target.value })
                    : setQuickAddForm({ ...quickAddForm, floor: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  ความจุ (คน / ที่นั่ง)
                </label>
                <input
                  type="number"
                  min={1}
                  value={quickAddForm.capacity}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, capacity: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={addingResource}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {addingResource ? "กำลังเพิ่ม..." : "+ เพิ่มรายการ"}
                </button>
              </div>
            </form>
          </div>

          {/* Central Resources Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                ตารางทรัพยากร ({resources.length} รายการ)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="p-3 font-mono">รหัส</th>
                    <th className="p-3">ชื่อทรัพยากร</th>
                    <th className="p-3">รายละเอียด / ทะเบียน</th>
                    <th className="p-3 text-center">ความจุ</th>
                    <th className="p-3 text-center">สถานะ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        ไม่พบรายการทรัพยากร
                      </td>
                    </tr>
                  ) : (
                    resources.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{res.code}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{res.name}</td>
                        <td className="p-3 text-slate-500">
                          {res.vehicleProfile?.licensePlate ? `ทะเบียน: ${res.vehicleProfile.licensePlate}` : res.location || res.roomProfile?.floor || "-"}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {res.capacity ? `${res.capacity} ที่นั่ง` : "-"}
                        </td>
                        <td className="p-3 text-center">
                          <StatusPillBadge
                            status={res.status}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(res)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-3 h-3 inline mr-1" /> แก้ไข
                            </button>
                            <button
                              onClick={() => handleToggleStatus(res)}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium"
                              title="สลับสถานะ"
                            >
                              {res.status === "AVAILABLE" ? "ปิดซ่อม" : "เปิดใช้"}
                            </button>
                            <button
                              onClick={() => handleDeleteResource(res)}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-medium"
                              title="ลบหรือปลดระวาง"
                            >
                              <Trash2 className="w-3 h-3 inline" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: QUICK BOOKING MODAL (STREAMLINED FOR TEACHERS)   */}
      {/* ========================================================= */}
      <UnifiedModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        size="xl"
      >
        <UnifiedModalHeader
          title={`ยื่นคำขอจอง${moduleMode === "MEETING_ROOM" ? "ห้องประชุมและอาคาร" : "รถโรงเรียนและยานพาหนะ"}`}
          subtitle="กรอกข้อมูลจำเป็นเพื่อส่งพิจารณาอนุมัติ"
          icon={moduleMode === "MEETING_ROOM" ? Building : Bus}
          iconClass={moduleMode === "MEETING_ROOM" ? "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"}
          onClose={() => setIsBookingModalOpen(false)}
        />
        <form onSubmit={handleSubmittingBooking}>
          <UnifiedModalBody className="space-y-4 text-xs">
              {/* Resource Pick */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ทรัพยากรที่เลือก *
                </label>
                <select
                  value={selectedResource?.id || ""}
                  onChange={(e) => {
                    const picked = resources.find(r => r.id === e.target.value);
                    if (picked) setSelectedResource(picked);
                  }}
                  required
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- กรุณาเลือกรายการ --</option>
                  {resources.filter(r => r.status === "AVAILABLE").map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.code}] {r.name} ({moduleMode === "VEHICLE" ? `ทะเบียน: ${r.vehicleProfile?.licensePlate || "-"}` : `${r.capacity || "-"} ที่นั่ง`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Objective */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วัตถุประสงค์ / ชื่องาน / ภารกิจราชการ *
                </label>
                <input
                  type="text"
                  required
                  placeholder={moduleMode === "MEETING_ROOM" ? "เช่น ประชุมกลุ่มสาระการเรียนรู้ภาษาไทย..." : "เช่น พานักเรียนไปแข่งขันศิลปหัตถกรรม..."}
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">วันเริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.startDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value, endDate: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">เวลาเริ่ม *</label>
                  <input
                    type="time"
                    required
                    value={bookingForm.startTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">วันสิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.endDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">เวลาสิ้นสุด *</label>
                  <input
                    type="time"
                    required
                    value={bookingForm.endTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Destination for Vehicle */}
              {moduleMode === "VEHICLE" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานที่ปลายทาง *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น มหาวิทยาลัยขอนแก่น, ศูนย์ประชุม..."
                    value={bookingForm.destination}
                    onChange={(e) => setBookingForm({ ...bookingForm, destination: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* COLLAPSIBLE ACCORDION: ADVANCED OPTIONS */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full p-3 bg-slate-100/70 dark:bg-slate-800 text-left font-bold text-xs flex items-center justify-between text-slate-700 dark:text-slate-300"
                >
                  <span>+ ตัวเลือกเพิ่มเติม (รูปแบบห้อง, เครื่องเสียง, รายชื่อผู้ร่วมเดินทาง)</span>
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900">
                    {moduleMode === "MEETING_ROOM" ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">รูปแบบผังห้อง</label>
                            <select
                              value={bookingForm.layoutType}
                              onChange={(e) => setBookingForm({ ...bookingForm, layoutType: e.target.value })}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            >
                              <option value="THEATER">เธียเตอร์ (Theater / แถวเรียง)</option>
                              <option value="CLASSROOM">ห้องเรียน (Classroom / โต๊ะ+เก้าอี้)</option>
                              <option value="U_SHAPE">ตัวยู (U-Shape / ประชุมกลุ่ม)</option>
                              <option value="BOARDROOM">บอร์ดรูม (Boardroom / ผู้บริหาร)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">จำนวนผู้เข้าร่วม (คน)</label>
                            <input
                              type="number"
                              min={1}
                              value={bookingForm.attendeeCount}
                              onChange={(e) => setBookingForm({ ...bookingForm, attendeeCount: Number(e.target.value) })}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-1">อุปกรณ์โสตฯ ที่ต้องการ</label>
                          <input
                            type="text"
                            placeholder="เช่น ไมค์ลอย 2 ตัว, พอยเตอร์, โปรเจกเตอร์..."
                            value={bookingForm.audioVisualNotes}
                            onChange={(e) => setBookingForm({ ...bookingForm, audioVisualNotes: e.target.value })}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">จำนวนครูร่วมเดินทาง</label>
                            <input
                              type="number"
                              min={0}
                              value={bookingForm.teacherCount}
                              onChange={(e) => setBookingForm({ ...bookingForm, teacherCount: Number(e.target.value) })}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">จำนวนนักเรียน</label>
                            <input
                              type="number"
                              min={0}
                              value={bookingForm.studentCount}
                              onChange={(e) => setBookingForm({ ...bookingForm, studentCount: Number(e.target.value) })}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-1">รายชื่อผู้ร่วมเดินทาง / ข้อมูลเพิ่มเติม</label>
                          <textarea
                            rows={2}
                            placeholder="ระบุรายชื่อครูหรือรายละเอียดเสริม"
                            value={bookingForm.passengerListNotes}
                            onChange={(e) => setBookingForm({ ...bookingForm, passengerListNotes: e.target.value })}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

          </UnifiedModalBody>
          <UnifiedModalFooter>
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการขอจอง"}
            </button>
          </UnifiedModalFooter>
        </form>
      </UnifiedModal>

      {/* ========================================================= */}
      {/* MODAL 2: DIRECTOR APPROVAL DIALOG (REPLACES PROMPT)       */}
      {/* ========================================================= */}
      <UnifiedModal
        isOpen={Boolean(directorApprovalTarget)}
        onClose={() => setDirectorApprovalTarget(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ผู้อำนวยการอนุมัติคำขอ (Step 2)"
          subtitle={`รหัสการจอง: ${directorApprovalTarget?.bookingNumber || "-"}`}
          icon={Check}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
          onClose={() => setDirectorApprovalTarget(null)}
        />
        <UnifiedModalBody>
          {directorApprovalTarget && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 text-xs border border-slate-200 dark:border-slate-700">
                <div><strong>รหัสการจอง:</strong> {directorApprovalTarget.bookingNumber}</div>
                <div><strong>ภารกิจ:</strong> {directorApprovalTarget.title}</div>
                <div><strong>ผู้ขอ:</strong> {directorApprovalTarget.reservedByUser?.name}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                  ข้อคิดเห็นการอนุมัติ (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  value={directorComment}
                  onChange={(e) => setDirectorComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setDirectorApprovalTarget(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDirectorApproveSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันการอนุมัติ"}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* ========================================================= */}
      {/* MODAL 3: REJECTION DIALOG (REPLACES PROMPT)               */}
      {/* ========================================================= */}
      <UnifiedModal
        isOpen={Boolean(rejectingTarget)}
        onClose={() => setRejectingTarget(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="ระบุเหตุผลการไม่อนุมัติ / ปฏิเสธคำขอ"
          subtitle={`รหัสการจอง: ${rejectingTarget?.bookingNumber || "-"}`}
          icon={AlertCircle}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
          onClose={() => setRejectingTarget(null)}
        />
        <UnifiedModalBody>
          {rejectingTarget && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 text-xs border border-slate-200 dark:border-slate-700">
                <div><strong>รหัสการจอง:</strong> {rejectingTarget.bookingNumber}</div>
                <div><strong>ภารกิจ:</strong> {rejectingTarget.title}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                  เหตุผลในการไม่อนุมัติ *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น ติดภารกิจราชการเร่งด่วนของโรงเรียน..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setRejectingTarget(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleRejectSubmit}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* ========================================================= */}
      {/* MODAL 4: CANCEL CONFIRMATION DIALOG (REPLACES CONFIRM)    */}
      {/* ========================================================= */}
      <UnifiedModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        size="sm"
      >
        <UnifiedModalHeader
          title="ยืนยันการยกเลิกคำขอ"
          subtitle={`รหัสการจอง: ${cancelTarget?.bookingNumber || "-"}`}
          icon={AlertCircle}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
          onClose={() => setCancelTarget(null)}
        />
        <UnifiedModalBody>
          {cancelTarget && (
            <p className="text-slate-600 dark:text-slate-300 text-xs text-center py-2">
              ท่านต้องการยกเลิกคำขอจอง &ldquo;{cancelTarget.title}&rdquo; ({cancelTarget.bookingNumber}) ใช่หรือไม่?
            </p>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setCancelTarget(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCancelSubmit}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* ========================================================= */}
      {/* MODAL 5: STEP 1 HEAD REVIEW & DRIVER ASSIGNMENT           */}
      {/* ========================================================= */}
      <UnifiedModal
        isOpen={Boolean(reviewingReservation)}
        onClose={() => setReviewingReservation(null)}
        size="md"
      >
        <UnifiedModalHeader
          title="จัดสรรและตรวจสอบคำขอ (Step 1 Review)"
          subtitle={`รหัสการจอง: ${reviewingReservation?.bookingNumber || "-"}`}
          icon={UserCheck}
          iconClass="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
          onClose={() => setReviewingReservation(null)}
        />
        <UnifiedModalBody>
          {reviewingReservation && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div><strong>รหัสการจอง:</strong> {reviewingReservation.bookingNumber}</div>
                <div><strong>ภารกิจ:</strong> {reviewingReservation.title}</div>
                <div><strong>ทรัพยากร:</strong> {reviewingReservation.resource?.name}</div>
              </div>

              {moduleMode === "VEHICLE" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    มอบหมายพนักงานขับรถ
                  </label>
                  <select
                    value={reviewDriverId}
                    onChange={(e) => setReviewDriverId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="">-- เลือกพนักงานขับรถ --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name} (ใบอนุญาต: {d.licenseNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ความเห็นหัวหน้างาน / บันทึกการตรวจสอบ
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุข้อคิดเห็นในการตรวจสอบสภาพสถานที่/ยานพาหนะ..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          )}
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <button
            type="button"
            onClick={() => setReviewingReservation(null)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleHeadReviewSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันผลการจัดสรรและส่งต่อ ผอ."}
          </button>
        </UnifiedModalFooter>
      </UnifiedModal>

      {/* ========================================================= */}
      {/* MODAL 6: EDIT RESOURCE                                    */}
      {/* ========================================================= */}
      <UnifiedModal
        isOpen={Boolean(editingResource)}
        onClose={() => setEditingResource(null)}
        size="lg"
      >
        <form onSubmit={handleSaveEdit}>
          <UnifiedModalHeader
            title={`แก้ไขข้อมูลทรัพยากร: ${editingResource?.name || ""}`}
            subtitle={editingResource?.code || ""}
            icon={Edit2}
            iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
            onClose={() => setEditingResource(null)}
          />
          <UnifiedModalBody>
            {editingResource && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">รหัสกำกับ</label>
                    <input
                      type="text"
                      required
                      value={editForm.code}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานะ</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="AVAILABLE">พร้อมให้บริการ (AVAILABLE)</option>
                      <option value="UNDER_MAINTENANCE">ซ่อมบำรุง (UNDER_MAINTENANCE)</option>
                      <option value="OUT_OF_SERVICE">ไม่พร้อมใช้งาน (OUT_OF_SERVICE)</option>
                      <option value="RETIRED">ปลดระวาง (RETIRED)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อทรัพยากร</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ความจุ (คน/ที่นั่ง)</label>
                    <input
                      type="number"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานที่ตั้ง / ชั้น</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                {editingResource.type === "VEHICLE" && (
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300">ข้อมูลยานพาหนะ</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-0.5">ทะเบียนรถ</label>
                        <input
                          type="text"
                          value={editForm.licensePlate}
                          onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })}
                          className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-0.5">ยี่ห้อ</label>
                        <input
                          type="text"
                          value={editForm.brand}
                          onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                          className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-0.5">รุ่น</label>
                        <input
                          type="text"
                          value={editForm.model}
                          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                          className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </UnifiedModalBody>
          <UnifiedModalFooter>
            <button
              type="button"
              onClick={() => setEditingResource(null)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {savingEdit ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </button>
          </UnifiedModalFooter>
        </form>
      </UnifiedModal>
    </div>
  );
}
