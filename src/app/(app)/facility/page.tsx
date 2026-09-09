"use client";

import React, { useState, useEffect } from "react";
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
  SlidersHorizontal, 
  UserCheck, 
  Settings, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Sparkles,
  Layers,
  FlaskConical,
  GraduationCap,
  Wrench,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
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
  seedDefaultFacilityResourcesAction,
  getCurrentFacilityUserRoleAction
} from "@/app/actions/facility";
import Link from "next/link";

type ModuleMode = "MEETING_ROOM" | "VEHICLE";
type ActiveTab = "CATALOG" | "CRUD" | "TIMELINE" | "APPROVALS";

function toThaiDateString(dateInput: string | Date | null | undefined) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear() + 543;

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

function getResourceTypeName(type: string) {
  switch (type) {
    case "MEETING_ROOM": return "ห้องประชุม";
    case "VEHICLE": return "ยานพาหนะ";
    case "LABORATORY": return "ห้องแล็บ/ปฏิบัติการ";
    case "CLASSROOM": return "ห้องเรียนพิเศษ";
    case "EQUIPMENT": return "อุปกรณ์ส่วนกลาง";
    default: return "ทรัพยากรทั่วไป";
  }
}

function getResourceTypeBadge(type: string) {
  switch (type) {
    case "MEETING_ROOM":
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><Building className="w-3 h-3" /> ห้องประชุม</span>;
    case "VEHICLE":
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1"><Car className="w-3 h-3" /> รถโรงเรียน</span>;
    case "LABORATORY":
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> ห้องแล็บ</span>;
    case "CLASSROOM":
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> ห้องเรียน</span>;
    case "EQUIPMENT":
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1"><Wrench className="w-3 h-3" /> อุปกรณ์</span>;
    default:
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> ทั่วไป</span>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "AVAILABLE":
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">พร้อมให้บริการ</span>;
    case "UNDER_MAINTENANCE":
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">ซ่อมบำรุง</span>;
    case "OUT_OF_SERVICE":
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">ไม่พร้อมใช้งาน</span>;
    case "RETIRED":
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">ปลดระวาง</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{status}</span>;
  }
}

export default function UnifiedFacilityPortalPage() {
  const [moduleMode, setModuleMode] = useState<ModuleMode>("MEETING_ROOM");
  const [activeTab, setActiveTab] = useState<ActiveTab>("CATALOG");

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [userRoleInfo, setUserRoleInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    title: "",
    purpose: "",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endDate: new Date().toISOString().split("T")[0],
    endTime: "12:00",
    attendeeCount: 10,
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

  // Approval / Review Modal State
  const [reviewingReservation, setReviewingReservation] = useState<any>(null);
  const [reviewDriverId, setReviewDriverId] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  // CRUD State (Quick Add Resource Form matching Image 2)
  const [quickAddForm, setQuickAddForm] = useState({
    code: "",
    name: "",
    type: "MEETING_ROOM",
    capacity: 30,
    location: "",
    description: "",
    licensePlate: "",
    floor: "ชั้น 1"
  });
  const [addingResource, setAddingResource] = useState(false);

  // Edit Resource Modal State
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
      const targetType = moduleMode === "MEETING_ROOM" ? "MEETING_ROOM" : "VEHICLE";
      const [resList, allResList, bookingList, driverList, roleInfo] = await Promise.all([
        getFacilityResourcesAction(targetType as any).catch(() => []),
        getFacilityResourcesAction({ includeRetired: true }).catch(() => []),
        getFacilityReservationsAction({ consumerModule: moduleMode }).catch(() => []),
        getDriverProfilesAction().catch(() => []),
        getCurrentFacilityUserRoleAction().catch(() => null)
      ]);

      setResources(resList || []);
      setAllResources(allResList || []);
      setReservations(bookingList || []);
      setDrivers(driverList || []);
      setUserRoleInfo(roleInfo);
    } catch (err: any) {
      console.error("Failed to load facility portal data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Open general booking modal (user selects resource inside)
  const handleOpenGeneralBooking = () => {
    const defaultRes = resources.find(r => r.status === "AVAILABLE") || allResources.find(r => r.status === "AVAILABLE") || null;
    setSelectedResource(defaultRes);
    setIsBookingModalOpen(true);
  };

  // Open booking modal for specific resource
  const handleOpenBooking = (resource: any) => {
    setSelectedResource(resource);
    setIsBookingModalOpen(true);
  };

  const handleSubmittingBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) {
      alert("กรุณาเลือกทรัพยากรที่ต้องการจอง");
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
        title: bookingForm.title,
        purpose: bookingForm.purpose,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        attendeeCount: Number(bookingForm.attendeeCount),
        department: bookingForm.department,
        contactPhone: bookingForm.contactPhone,
        ...(!isVehicleTarget ? {
          roomDetails: {
            layoutType: bookingForm.layoutType,
            layoutNotes: bookingForm.layoutNotes,
            audioVisualNotes: bookingForm.audioVisualNotes,
            cateringNotes: bookingForm.cateringNotes,
            requireAirCon: bookingForm.requireAirCon
          }
        } : {
          vehicleDetails: {
            missionType: bookingForm.missionType,
            origin: bookingForm.origin,
            destination: bookingForm.destination,
            teacherCount: Number(bookingForm.teacherCount),
            studentCount: Number(bookingForm.studentCount),
            passengerListNotes: bookingForm.passengerListNotes,
            driverProfileId: bookingForm.driverProfileId || undefined
          }
        })
      });

      alert("ยื่นคำขอจองสำเร็จ! ระบบได้บันทึกคำขอและส่งต่อไปยังขั้นตอนการพิจารณาอนุมัติเรียบร้อยแล้ว");
      setIsBookingModalOpen(false);
      loadData();
      setActiveTab("TIMELINE");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Create Resource (Quick Add)
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.code.trim() || !quickAddForm.name.trim()) {
      alert("กรุณากรอกรหัสกำกับและชื่อทรัพยากร");
      return;
    }

    try {
      setAddingResource(true);
      const isVehicle = quickAddForm.type === "VEHICLE";
      await createFacilityResourceAction({
        code: quickAddForm.code.trim(),
        name: quickAddForm.name.trim(),
        type: quickAddForm.type as any,
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

      alert(`เพิ่มรายการ "${quickAddForm.name}" เรียบร้อยแล้ว!`);
      setQuickAddForm({
        code: "",
        name: "",
        type: "MEETING_ROOM",
        capacity: 30,
        location: "",
        description: "",
        licensePlate: "",
        floor: "ชั้น 1"
      });
      loadData();
    } catch (err: any) {
      alert("ไม่สามารถเพิ่มทรัพยากรได้: " + err.message);
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

      alert("บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว");
      setEditingResource(null);
      loadData();
    } catch (err: any) {
      alert("ไม่สามารถบันทึกได้: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (resource: any) => {
    const nextStatus = resource.status === "AVAILABLE" ? "UNDER_MAINTENANCE" : "AVAILABLE";
    const label = nextStatus === "AVAILABLE" ? "พร้อมให้บริการ" : "แจ้งซ่อมบำรุง";
    if (!confirm(`ต้องการเปลี่ยนสถานะของ "${resource.name}" เป็น "${label}" หรือไม่?`)) return;

    try {
      await toggleFacilityResourceStatusAction(resource.id, nextStatus as any);
      loadData();
    } catch (err: any) {
      alert("ไม่สามารถเปลี่ยนสถานะได้: " + err.message);
    }
  };

  // Delete / Retire Resource
  const handleDeleteResource = async (resource: any) => {
    if (!confirm(`ต้องการลบหรือปลดระวางทรัพยากร "${resource.name}" (${resource.code}) หรือไม่?\n\n(หากเคยมีประวัติการจอง ระบบจะทำการปลดระวาง RETIRED เพื่อรักษาประวัติความถูกต้อง)`)) {
      return;
    }

    try {
      const res = await deleteFacilityResourceAction(resource.id);
      if (res.action === "RETIRED") {
        alert(`ทรัพยากรนี้มีประวัติการจองในระบบ จึงถูกเปลี่ยนสถานะเป็น "ปลดระวาง (RETIRED)" เรียบร้อยแล้ว`);
      } else {
        alert(`ลบข้อมูลทรัพยากร "${resource.name}" สำเร็จเรียบร้อยแล้ว`);
      }
      loadData();
    } catch (err: any) {
      alert("ไม่สามารถดำเนินการได้: " + err.message);
    }
  };

  // Seed Default Resources
  const handleSeedDefaults = async () => {
    if (!confirm("คุณต้องการโหลดข้อมูลตัวอย่างเริ่มต้น (ห้องประชุมกุญชร 1, รถบัส 45 ที่นั่ง, ห้องแล็บเคมี 1) เข้าสู่ระบบหรือไม่?")) return;
    try {
      setLoading(true);
      await seedDefaultFacilityResourcesAction();
      alert("โหลดข้อมูลตัวอย่างเริ่มต้นสำเร็จ!");
      loadData();
    } catch (err: any) {
      alert("ไม่สามารถโหลดข้อมูลตัวอย่างได้: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHeadReviewSubmit = async () => {
    if (!reviewingReservation) return;
    try {
      setSubmitting(true);
      await reviewFacilityReservationHeadAction(reviewingReservation.id, {
        driverProfileId: reviewDriverId || undefined,
        comment: reviewComment
      });
      alert("บันทึกผลการตรวจสอบและจัดสรรเรียบร้อยแล้ว");
      setReviewingReservation(null);
      loadData();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectorApprove = async (id: string) => {
    const comment = prompt("ข้อคิดเห็นการอนุมัติ (ไม่บังคับ):", "อนุมัติตามเสนอ");
    if (comment === null) return;
    try {
      await approveFacilityReservationDirectorAction(id, { comment });
      alert("อนุมัติคำขอจองเรียบร้อยแล้ว!");
      loadData();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("กรุณาระบุเหตุผลการไม่อนุมัติ / ปฏิเสธ:");
    if (!reason) return;
    try {
      await rejectFacilityReservationAction(id, reason);
      alert("ปฏิเสธคำขอเรียบร้อยแล้ว");
      loadData();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("ท่านต้องการยกเลิกคำขอจองนี้ใช่หรือไม่?")) return;
    try {
      await cancelFacilityReservationAction(id);
      alert("ยกเลิกคำขอเรียบร้อยแล้ว");
      loadData();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  // Filtered lists
  const filteredResources = resources.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllResources = allResources.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canUserManage = userRoleInfo?.canManage || userRoleInfo?.isAdmin || false;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Top Header with Interactive Dropdown Mode Switcher & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            {moduleMode === "MEETING_ROOM" ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ระบบบริหารทรัพยากรสถานศึกษา
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                  v7.2 Hardened
                </span>
                {userRoleInfo?.role && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
                    สิทธิ์: {userRoleInfo.role}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {moduleMode === "MEETING_ROOM" ? "ระบบจองห้องประชุมและอาคารสถานที่" : "ระบบจองรถโรงเรียนและยานพาหนะ"}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-15">
            ศูนย์จัดการทรัพยากรส่วนกลาง CRUD + ระบบจองและอนุมัติ 2 ขั้นตอน (หัวหน้าฝ่ายจัดสรร ➔ ผู้อำนวยการอนุมัติ) ป้องกันการจองซ้อน 100%
          </p>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Top Action: ยื่นคำขอจอง */}
          <button
            onClick={handleOpenGeneralBooking}
            className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + ยื่นคำขอจอง
          </button>

          {/* Admin Sample Data Seed Button */}
          {userRoleInfo?.isAdmin && (
            <button
              onClick={handleSeedDefaults}
              title="โหลดข้อมูลตัวอย่างเริ่มต้น (ห้องประชุม, รถบัส, ห้องแล็บ)"
              className="px-3.5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              โหลดข้อมูลตัวอย่าง
            </button>
          )}

          {/* Dropdown Mode Switcher */}
          <div className="relative">
            <select
              value={moduleMode}
              onChange={(e) => setModuleMode(e.target.value as ModuleMode)}
              aria-label="เลือกระบบที่ต้องการใช้งาน"
              className="appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm rounded-2xl px-5 py-3 pr-10 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs transition"
            >
              <option value="MEETING_ROOM">🏢 ระบบห้องประชุม (Meeting Rooms)</option>
              <option value="VEHICLE">🚐 ระบบรถโรงเรียน (School Vehicles)</option>
            </select>
            <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabs Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex p-1.5 bg-slate-200/60 dark:bg-slate-900/80 rounded-2xl gap-1.5 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("CATALOG")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "CATALOG"
                ? moduleMode === "MEETING_ROOM" ? "bg-emerald-700 text-white shadow-xs" : "bg-amber-700 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Layers className="w-4 h-4" />
            รายการทรัพยากร ({filteredResources.length})
          </button>

          <button
            onClick={() => setActiveTab("CRUD")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "CRUD"
                ? "bg-indigo-700 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            จัดการทรัพยากรกลาง (CRUD) ({allResources.length})
          </button>

          <button
            onClick={() => setActiveTab("TIMELINE")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "TIMELINE"
                ? moduleMode === "MEETING_ROOM" ? "bg-emerald-700 text-white shadow-xs" : "bg-amber-700 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            ตารางคิวและไทม์ไลน์ ({reservations.length})
          </button>

          <button
            onClick={() => setActiveTab("APPROVALS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "APPROVALS"
                ? moduleMode === "MEETING_ROOM" ? "bg-emerald-700 text-white shadow-xs" : "bg-amber-700 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ศูนย์พิจารณาอนุมัติ (2-Tier Hub)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อทรัพยากร, รหัส, สถานที่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
          />
        </div>
      </div>

      {/* TAB 1: CATALOG VIEW */}
      {activeTab === "CATALOG" && (
        <div className="space-y-4">
          {filteredResources.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold">ไม่พบรายการทรัพยากรในระบบ</p>
              {canUserManage && (
                <button
                  onClick={() => setActiveTab("CRUD")}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> ไปที่เมนูจัดการทรัพยากรเพื่อเพิ่มรายการ
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        {res.code}
                      </span>
                      {getStatusBadge(res.status)}
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {res.name}
                      </h2>
                      {res.location && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {res.location}
                        </p>
                      )}
                    </div>

                    {/* Room Attributes */}
                    {moduleMode === "MEETING_ROOM" && res.roomProfile && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ความจุผู้เข้าร่วม:</span>
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {res.capacity || 50} ที่นั่ง
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ตำแหน่งชั้น:</span>
                          <span className="font-medium">{res.roomProfile.floor || "ชั้น 1"}</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5 text-[10px]">
                          {res.roomProfile.hasProjector && <span className="px-2 py-0.5 bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded font-medium">โปรเจคเตอร์</span>}
                          {res.roomProfile.hasSoundSystem && <span className="px-2 py-0.5 bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded font-medium">ระบบเครื่องเสียง</span>}
                          {res.roomProfile.hasVideoConference && <span className="px-2 py-0.5 bg-purple-100/70 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded font-medium">Video Conference</span>}
                        </div>
                      </div>
                    )}

                    {/* Vehicle Attributes */}
                    {moduleMode === "VEHICLE" && res.vehicleProfile && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">หมายเลขทะเบียน:</span>
                          <span className="font-bold text-amber-800 dark:text-amber-400 font-mono text-sm">
                            {res.vehicleProfile.licensePlate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ยี่ห้อ / รุ่น:</span>
                          <span className="font-medium">{res.vehicleProfile.brand} {res.vehicleProfile.model}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ความจุผู้โดยสาร:</span>
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {res.vehicleProfile.seatCapacity} ที่นั่ง
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <button
                      onClick={() => handleOpenBooking(res)}
                      disabled={res.status !== "AVAILABLE"}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 ${
                        res.status !== "AVAILABLE"
                          ? "bg-slate-400 cursor-not-allowed opacity-60"
                          : moduleMode === "MEETING_ROOM" 
                            ? "bg-emerald-700 hover:bg-emerald-800" 
                            : "bg-amber-700 hover:bg-amber-800"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {res.status !== "AVAILABLE" ? `ไม่สามารถจองได้ (${res.status})` : `ยื่นคำขอจอง ${moduleMode === "MEETING_ROOM" ? "ห้องนี้" : "รถคันนี้"}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CENTRAL RESOURCE MANAGEMENT (CRUD VIEW - MATCHING MOCKUP IMAGE 2) */}
      {activeTab === "CRUD" && (
        <div className="space-y-6">
          {/* Top Info Banner if general teacher */}
          {!canUserManage && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
              <Info className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <strong>โหมดดูข้อมูล:</strong> คุณกำลังดูรายการในฐานะผู้ใช้ทั่วไป (สามารถยื่นขอจองได้) สำหรับการเพิ่ม แก้ไข หรือลบทรัพยากร ต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin) หรือหัวหน้างานที่เกี่ยวข้อง
              </div>
            </div>
          )}

          {/* Quick Add Resource Card (Horizontal Bar - Matching Image 2) */}
          {canUserManage && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  เพิ่มทรัพยากรส่วนกลางใหม่ (Quick Add Resource)
                </h2>
                <span className="text-xs text-slate-400 font-medium">บันทึกตรงสู่ระบบฐานข้อมูลส่วนกลาง</span>
              </div>

              <form onSubmit={handleCreateResource} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    รหัสกำกับ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ROOM-02, BUS-02"
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
                    placeholder="เช่น ห้องประชุมบุณฑริก"
                    value={quickAddForm.name}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    ประเภททรัพยากร *
                  </label>
                  <select
                    value={quickAddForm.type}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="MEETING_ROOM">🏢 ห้องประชุม (MEETING_ROOM)</option>
                    <option value="VEHICLE">🚐 ยานพาหนะ (VEHICLE)</option>
                    <option value="LABORATORY">🧪 ห้องแล็บ (LABORATORY)</option>
                    <option value="CLASSROOM">🎓 ห้องเรียนพิเศษ (CLASSROOM)</option>
                    <option value="EQUIPMENT">🔧 อุปกรณ์ส่วนกลาง (EQUIPMENT)</option>
                    <option value="OTHER">📦 อื่น ๆ (OTHER)</option>
                  </select>
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
          )}

          {/* Central Resources Table matching Image 2 mockup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  ตารางทรัพยากรกลางทั้งหมด ({filteredAllResources.length} รายการ)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  แสดงรายการทรัพยากรทั้งหมดในระบบ พร้อมเครื่องมือจัดการ (ขอจอง, แก้ไข, สลับสถานะ, ลบ/ปลดระวาง)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4 font-mono">รหัส</th>
                    <th className="py-3 px-4">ชื่อรายการทรัพยากร</th>
                    <th className="py-3 px-4">ประเภท</th>
                    <th className="py-3 px-4">ความจุ</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAllResources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        ไม่พบรายการทรัพยากรตรงตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredAllResources.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {res.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{res.name}</div>
                          {res.location && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {res.location}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getResourceTypeBadge(res.type)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {res.capacity ? `${res.capacity} คน/ที่นั่ง` : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(res.status)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Action 1: ขอจอง (Available for all staff) */}
                            <button
                              onClick={() => handleOpenBooking(res)}
                              disabled={res.status !== "AVAILABLE"}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                res.status === "AVAILABLE"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                  : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                              }`}
                              title={res.status === "AVAILABLE" ? "ขอจองทรัพยากรนี้" : "ไม่พร้อมให้จอง"}
                            >
                              <Plus className="w-3 h-3" /> ขอจอง
                            </button>

                            {/* Management Actions (Admin / Heads) */}
                            {canUserManage && (
                              <>
                                {/* Action 2: แก้ไข */}
                                <button
                                  onClick={() => handleOpenEdit(res)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition flex items-center gap-1"
                                  title="แก้ไขข้อมูล"
                                >
                                  <Edit2 className="w-3 h-3" /> แก้ไข
                                </button>

                                {/* Action 3: สลับสถานะ */}
                                <button
                                  onClick={() => handleToggleStatus(res)}
                                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium transition flex items-center gap-1"
                                  title="สลับสถานะ (พร้อมใช้งาน <-> ซ่อมบำรุง)"
                                >
                                  {res.status === "AVAILABLE" ? (
                                    <>
                                      <ToggleRight className="w-3.5 h-3.5 text-emerald-600" /> ปิดซ่อม
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> เปิดใช้
                                    </>
                                  )}
                                </button>

                                {/* Action 4: ลบ / ปลดระวาง */}
                                <button
                                  onClick={() => handleDeleteResource(res)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-medium transition flex items-center gap-1"
                                  title="ลบหรือปลดระวางทรัพยากร"
                                >
                                  <Trash2 className="w-3 h-3" /> ลบ
                                </button>
                              </>
                            )}
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

      {/* TAB 3: TIMELINE & AGENDA */}
      {activeTab === "TIMELINE" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              รายการคำขอจองและการใช้งานทั้งหมด ({reservations.length})
            </h2>
          </div>

          {reservations.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm">ยังไม่มีประวัติการขอจองในระบบ</p>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {res.bookingNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        res.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                        res.status === "PENDING" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                        res.status === "CANCELLED" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" :
                        res.status === "IN_USE" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                        "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}>
                        {res.status === "APPROVED" ? "✓ อนุมัติแล้ว" :
                         res.status === "PENDING" ? "⏳ รอการอนุมัติ (Step " + (res.currentStep || 1) + "/2)" :
                         res.status === "CANCELLED" ? "ยกเลิกแล้ว" :
                         res.status === "IN_USE" ? "กำลังใช้งาน" :
                         res.status === "COMPLETED" ? "เสร็จสิ้นภารกิจ" : "ไม่อนุมัติ"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {res.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span><strong>ทรัพยากร:</strong> {res.resource?.name}</span>
                      <span><strong>ผู้ขอ:</strong> {res.reservedByUser?.name}</span>
                      <span><strong>เวลา:</strong> {toThaiDateString(res.startAt)} ({toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={moduleMode === "MEETING_ROOM" ? `/print/facility/room/${res.id}` : `/print/facility/vehicle/${res.id}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์ A4
                    </Link>

                    {res.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(res.id)}
                        className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
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

      {/* TAB 4: 2-TIER APPROVAL HUB */}
      {activeTab === "APPROVALS" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                ศูนย์ตรวจสอบและอนุมัติคำขอจอง (Official 2-Tier Approval Hub)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ขั้นตอนที่ 1: หัวหน้าฝ่ายตรวจสอบสถานที่/จัดสรรรถและคนขับ ➔ ขั้นตอนที่ 2: ผู้อำนวยการโรงเรียนอนุมัติขั้นสุดท้าย
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
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      ยื่นเมื่อ {toThaiDateString(res.createdAt)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">ชื่องาน / ภารกิจ:</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{res.title}</p>
                      <p className="text-slate-500 mt-1">{res.purpose}</p>
                    </div>

                    <div className="space-y-1">
                      <div><span className="font-semibold">ทรัพยากร:</span> {res.resource?.name}</div>
                      <div><span className="font-semibold">ผู้ขอใช้:</span> {res.reservedByUser?.name} ({res.department || "กลุ่มสาระฯ"})</div>
                      <div><span className="font-semibold">ช่วงเวลา:</span> {toThaiDateString(res.startAt)} ({toThaiTimeString(res.startAt)} - {toThaiTimeString(res.endAt)})</div>
                    </div>
                  </div>

                  {/* Actions for Step 1 vs Step 2 */}
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
                          onClick={() => handleDirectorApprove(res.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ผู้อำนวยการอนุมัติ (Step 2)
                        </button>
                      )}

                      <button
                        onClick={() => handleReject(res.id)}
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

      {/* DYNAMIC BOOKING MODAL */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-700" />
                  ยื่นคำขอจองทรัพยากรส่วนกลาง
                </h3>
                <span className="text-xs text-slate-500">กรอกข้อมูลวัตถุประสงค์และกำหนดการใช้งาน</span>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmittingBooking} className="space-y-4 text-xs">
              {/* Dynamic Resource Selector Dropdown */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  เลือกทรัพยากรที่ต้องการจอง *
                </label>
                <select
                  value={selectedResource?.id || ""}
                  onChange={(e) => {
                    const picked = allResources.find(r => r.id === e.target.value);
                    if (picked) setSelectedResource(picked);
                  }}
                  required
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
                >
                  <option value="">-- กรุณาเลือกรายการทรัพยากร --</option>
                  <optgroup label="🏢 ห้องประชุมและอาคารสถานที่">
                    {allResources.filter(r => r.type !== "VEHICLE" && r.status === "AVAILABLE").map(r => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name} (ความจุ: {r.capacity || "-"} ที่นั่ง)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🚐 รถโรงเรียนและยานพาหนะ">
                    {allResources.filter(r => r.type === "VEHICLE" && r.status === "AVAILABLE").map(r => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name} ({r.vehicleProfile?.licensePlate || "ไม่มีทะเบียน"} - {r.capacity || "-"} ที่นั่ง)
                      </option>
                    ))}
                  </optgroup>
                </select>

                {selectedResource && (
                  <div className="mt-2.5 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span>ประเภท: {getResourceTypeBadge(selectedResource.type)}</span>
                    <span>• รหัส: <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedResource.code}</strong></span>
                    {selectedResource.location && <span>• สถานที่: <strong>{selectedResource.location}</strong></span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วัตถุประสงค์ / ชื่องาน / ภารกิจราชการ *
                </label>
                <input
                  type="text"
                  required
                  placeholder={selectedResource?.type === "VEHICLE" ? "เช่น พานักเรียนไปแข่งขันโอลิมปิกวิชาการ มข..." : "เช่น การประชุมกลุ่มสาระภาษาไทย, อบรมเชิงปฏิบัติการ..."}
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดกำหนดการ หรือข้อความเพิ่มเติม"
                  value={bookingForm.purpose}
                  onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
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

              {/* Room Specific Fields */}
              {selectedResource?.type !== "VEHICLE" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">รูปแบบการจัดห้อง</label>
                      <select
                        value={bookingForm.layoutType}
                        onChange={(e) => setBookingForm({ ...bookingForm, layoutType: e.target.value })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value="THEATER">เธียเตอร์ (Theater / เก้าอี้แถวเรียง)</option>
                        <option value="CLASSROOM">ห้องเรียน (Classroom / โต๊ะ+เก้าอี้)</option>
                        <option value="U_SHAPE">ตัวยู (U-Shape / ประชุมกลุ่ม)</option>
                        <option value="BOARDROOM">บอร์ดรูม (Boardroom / ประชุมผู้บริหาร)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">จำนวนผู้เข้าร่วม (คน)</label>
                      <input
                        type="number"
                        value={bookingForm.attendeeCount}
                        onChange={(e) => setBookingForm({ ...bookingForm, attendeeCount: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ความต้องการอุปกรณ์โสตทัศนูปกรณ์</label>
                    <input
                      type="text"
                      placeholder="เช่น ไมค์ลอย 2 ตัว, พอยเตอร์, สาย HDMI..."
                      value={bookingForm.audioVisualNotes}
                      onChange={(e) => setBookingForm({ ...bookingForm, audioVisualNotes: e.target.value })}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Vehicle Specific Fields */}
              {selectedResource?.type === "VEHICLE" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ประเภทภารกิจ</label>
                      <select
                        value={bookingForm.missionType}
                        onChange={(e) => setBookingForm({ ...bookingForm, missionType: e.target.value })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value="OFFICIAL_MEETING">ไปราชการ/ประชุม/อบรม</option>
                        <option value="STUDENT_COMPETITION">พานักเรียนไปแข่งขัน</option>
                        <option value="FIELD_TRIP">ทัศนศึกษา/กิจกรรมนอกสถานที่</option>
                        <option value="COMMUNITY_SERVICE">บริการชุมชน</option>
                        <option value="OTHER">ภารกิจอื่น ๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานที่ปลายทาง *</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น มหาวิทยาลัยขอนแก่น, ศาลากลาง..."
                        value={bookingForm.destination}
                        onChange={(e) => setBookingForm({ ...bookingForm, destination: e.target.value })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">จำนวนครูร่วมเดินทาง</label>
                      <input
                        type="number"
                        value={bookingForm.teacherCount}
                        onChange={(e) => setBookingForm({ ...bookingForm, teacherCount: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">จำนวนนักเรียน</label>
                      <input
                        type="number"
                        value={bookingForm.studentCount}
                        onChange={(e) => setBookingForm({ ...bookingForm, studentCount: Number(e.target.value) })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">รายชื่อผู้ร่วมเดินทาง / ข้อมูลเพิ่มเติม</label>
                    <textarea
                      rows={2}
                      placeholder="ระบุรายชื่อครูหรือจำนวนนักเรียนที่ร่วมเดินทาง"
                      value={bookingForm.passengerListNotes}
                      onChange={(e) => setBookingForm({ ...bookingForm, passengerListNotes: e.target.value })}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการขอจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESOURCE MODAL */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                แก้ไขข้อมูลทรัพยากร: {editingResource.name}
              </h3>
              <button
                onClick={() => setEditingResource(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">รหัสกำกับ</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานะ</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
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
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ความจุ (คน/ที่นั่ง)</label>
                  <input
                    type="number"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานที่ตั้ง / ชั้น</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {editingResource.type === "VEHICLE" && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
                  <span className="font-bold text-amber-800 dark:text-amber-300">ข้อมูลยานพาหนะ</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-0.5">ทะเบียนรถ</label>
                      <input
                        type="text"
                        value={editForm.licensePlate}
                        onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })}
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">ยี่ห้อ</label>
                      <input
                        type="text"
                        value={editForm.brand}
                        onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">รุ่น</label>
                      <input
                        type="text"
                        value={editForm.model}
                        onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  {savingEdit ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEAD REVIEW MODAL */}
      {reviewingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-700" />
                จัดสรรและตรวจสอบคำขอ (Step 1 Review)
              </h3>
              <button
                onClick={() => setReviewingReservation(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <div><strong>รหัสการจอง:</strong> {reviewingReservation.bookingNumber}</div>
              <div><strong>ภารกิจ:</strong> {reviewingReservation.title}</div>
              <div><strong>ยานพาหนะ/สถานที่:</strong> {reviewingReservation.resource?.name}</div>
            </div>

            {moduleMode === "VEHICLE" && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  มอบหมายพนักงานขับรถ *
                </label>
                <select
                  value={reviewDriverId}
                  onChange={(e) => setReviewDriverId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
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
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingReservation(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleHeadReviewSubmit}
                className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-md"
              >
                {submitting ? "กำลังบันทึก..." : "ยืนยันผลการจัดสรรและส่งต่อ ผอ."}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
