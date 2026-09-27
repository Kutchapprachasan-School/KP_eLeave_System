"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Building,
  Bus,
  Car,
  Layers,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  X,
  Calendar,
  Clock,
  Lock,
  Save
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  createFacilityResourceAction,
  updateFacilityResourceAction,
  toggleFacilityResourceStatusAction,
  deleteFacilityResourceAction,
  updateFacilitySettingsAction
} from "@/app/actions/facility";
import {
  type ModuleMode,
  parseRoomConfig,
  serializeRoomConfig,
  ROOM_LAYOUT_LABELS,
  parseVehicleConfig,
  serializeVehicleConfig,
  type VehicleRecurringScheduleRule,
  parseSemesterConfigFromGuidelines,
  injectSemesterConfigIntoGuidelines,
  getDefaultSemesterConfig,
  type FacilitySemesterConfig,
  isDateInActiveSemester,
  formatRecurringDaysLabel
} from "./facility-shared";
import {
  StatusPillBadge,
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter
} from "@/components/shared-ui/school-ops";
import FacilitySettingsConfigTab from "./FacilitySettingsConfigTab";

interface FacilityManagementViewProps {
  resources: any[];
  drivers: any[];
  facilitySettings?: any;
  holidays?: any[];
  onRefresh: () => void;
}

export default function FacilityManagementView({
  resources,
  drivers,
  facilitySettings,
  holidays = [],
  onRefresh
}: FacilityManagementViewProps) {
  const { showToast } = useToast();

  const [resourceType, setResourceType] = useState<ModuleMode>("MEETING_ROOM");
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingSemester, setSavingSemester] = useState(false);

  // Semester Config State
  const [semesterConfig, setSemesterConfig] = useState<FacilitySemesterConfig>(
    () => parseSemesterConfigFromGuidelines(facilitySettings?.guidelinesHtml).semesterConfig
  );

  useEffect(() => {
    if (facilitySettings) {
      setSemesterConfig(parseSemesterConfigFromGuidelines(facilitySettings.guidelinesHtml).semesterConfig);
    }
  }, [facilitySettings]);

  const handleSaveSemesterConfig = async () => {
    try {
      setSavingSemester(true);
      const { cleanGuidelinesHtml } = parseSemesterConfigFromGuidelines(facilitySettings?.guidelinesHtml);
      const updatedHtml = injectSemesterConfigIntoGuidelines(cleanGuidelinesHtml, semesterConfig);
      await updateFacilitySettingsAction({
        guidelinesHtml: updatedHtml
      });
      showToast("success", "บันทึกการตั้งค่าวันเปิดเทอม – ปิดเทอมเรียบร้อยแล้ว");
      onRefresh();
    } catch (err: any) {
      showToast("error", "บันทึกไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSavingSemester(false);
    }
  };

  // Quick Add Form State
  const [quickAddForm, setQuickAddForm] = useState({
    code: "",
    name: "",
    type: "MEETING_ROOM" as ModuleMode,
    capacity: 30,
    location: "",
    description: "",
    licensePlate: "",
    floor: "ชั้น 1",
    defaultLayout: "THEATER",
    defaultEquipment: "โปรเจคเตอร์, จอฉายภาพ, เครื่องเสียง, ไมค์ลอย 2 ตัว"
  });

  // Edit Modal State
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
    model: "",
    defaultLayout: "THEATER",
    defaultEquipment: "",
    roomNote: "",
    vehicleNote: "",
    hasRecurringSchedule: false,
    recurringSchedules: [] as VehicleRecurringScheduleRule[],
    semesterConfig: getDefaultSemesterConfig()
  });

  // Create Resource
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.code.trim() || !quickAddForm.name.trim()) {
      showToast("error", "กรุณากรอกรหัสกำกับและชื่อทรัพยากร");
      return;
    }

    try {
      setAdding(true);
      const isVehicle = resourceType === "VEHICLE";

      const descToSave = isVehicle
        ? serializeVehicleConfig({
            note: quickAddForm.description.trim(),
            hasRecurringSchedule: false,
            recurringSchedules: [],
            semesterConfig: getDefaultSemesterConfig()
          })
        : serializeRoomConfig({
            defaultLayout: quickAddForm.defaultLayout,
            defaultEquipment: quickAddForm.defaultEquipment.trim(),
            note: quickAddForm.description.trim()
          });

      await createFacilityResourceAction({
        code: quickAddForm.code.trim(),
        name: quickAddForm.name.trim(),
        type: resourceType,
        capacity: Number(quickAddForm.capacity) || 30,
        location: quickAddForm.location.trim() || undefined,
        description: descToSave,
        ...(isVehicle
          ? {
              vehicleProfile: {
                licensePlate: quickAddForm.licensePlate.trim() || quickAddForm.code.trim(),
                seatCapacity: Number(quickAddForm.capacity) || 12
              }
            }
          : {
              roomProfile: {
                floor: quickAddForm.floor || "ชั้น 1",
                hasProjector: true,
                hasSoundSystem: true
              }
            })
      });

      showToast("success", `เพิ่มทรัพยากร "${quickAddForm.name}" เรียบร้อยแล้ว!`);
      setQuickAddForm({
        code: "",
        name: "",
        type: resourceType,
        capacity: 30,
        location: "",
        description: "",
        licensePlate: "",
        floor: "ชั้น 1",
        defaultLayout: "THEATER",
        defaultEquipment: "โปรเจคเตอร์, จอฉายภาพ, เครื่องเสียง, ไมค์ลอย 2 ตัว"
      });
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาดในการเพิ่มทรัพยากร");
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (res: any) => {
    const parsedRoom = res.type === "MEETING_ROOM" ? parseRoomConfig(res.description) : null;
    const parsedVeh = res.type === "VEHICLE" ? parseVehicleConfig(res.description) : null;
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
      model: res.vehicleProfile?.model || "",
      defaultLayout: parsedRoom?.defaultLayout || "THEATER",
      defaultEquipment: parsedRoom?.defaultEquipment || "",
      roomNote: parsedRoom?.note || "",
      vehicleNote: parsedVeh?.note || "",
      hasRecurringSchedule: parsedVeh?.hasRecurringSchedule ?? false,
      recurringSchedules: parsedVeh?.recurringSchedules || [],
      semesterConfig: parsedVeh?.semesterConfig || getDefaultSemesterConfig()
    });
  };

  const addVehicleRecurringRule = (preset?: "MORNING_SHUTTLE" | "AFTERNOON_SHUTTLE") => {
    const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRule: VehicleRecurringScheduleRule =
      preset === "MORNING_SHUTTLE"
        ? {
            id,
            title: "รับนักเรียนช่วงเช้า (สายประจำ)",
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: "06:30",
            endTime: "08:15",
            activeOnlyDuringSemester: true,
            enabled: true
          }
        : preset === "AFTERNOON_SHUTTLE"
          ? {
              id,
              title: "ส่งนักเรียนกลับบ้านช่วงเย็น",
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: "15:30",
              endTime: "17:15",
              activeOnlyDuringSemester: true,
              enabled: true
            }
          : {
              id,
              title: "คิวใช้รถประจำสัปดาห์",
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: "07:00",
              endTime: "08:30",
              activeOnlyDuringSemester: true,
              enabled: true
            };

    setEditForm((prev) => ({
      ...prev,
      hasRecurringSchedule: true,
      recurringSchedules: [...prev.recurringSchedules, newRule]
    }));
  };

  const updateVehicleRecurringRule = (
    ruleId: string,
    patch: Partial<VehicleRecurringScheduleRule>
  ) => {
    setEditForm((prev) => ({
      ...prev,
      recurringSchedules: prev.recurringSchedules.map((r) =>
        r.id === ruleId ? { ...r, ...patch } : r
      )
    }));
  };

  const removeVehicleRecurringRule = (ruleId: string) => {
    setEditForm((prev) => ({
      ...prev,
      recurringSchedules: prev.recurringSchedules.filter((r) => r.id !== ruleId)
    }));
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    try {
      setSavingEdit(true);
      const isVehicle = editingResource.type === "VEHICLE";

      const descToSave = isVehicle
        ? serializeVehicleConfig({
            note: editForm.vehicleNote.trim(),
            hasRecurringSchedule: editForm.hasRecurringSchedule,
            recurringSchedules: editForm.hasRecurringSchedule ? editForm.recurringSchedules : [],
            semesterConfig: editForm.semesterConfig
          })
        : serializeRoomConfig({
            defaultLayout: editForm.defaultLayout,
            defaultEquipment: editForm.defaultEquipment.trim(),
            note: editForm.roomNote.trim()
          });

      await updateFacilityResourceAction(editingResource.id, {
        code: editForm.code,
        name: editForm.name,
        capacity: Number(editForm.capacity),
        location: editForm.location,
        description: descToSave,
        status: editForm.status as any,
        ...(isVehicle
          ? {
              vehicleProfile: {
                licensePlate: editForm.licensePlate,
                brand: editForm.brand,
                model: editForm.model,
                seatCapacity: Number(editForm.capacity)
              }
            }
          : {
              roomProfile: {
                floor: editForm.floor
              }
            })
      });

      showToast("success", "บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว");
      setEditingResource(null);
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาดในการแก้ไข");
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Maintenance Status
  const handleToggleStatus = async (resource: any) => {
    const nextStatus = resource.status === "AVAILABLE" ? "UNDER_MAINTENANCE" : "AVAILABLE";
    const label = nextStatus === "AVAILABLE" ? "พร้อมให้บริการ" : "แจ้งซ่อมบำรุง";
    try {
      await toggleFacilityResourceStatusAction(resource.id, nextStatus as any);
      showToast("success", `เปลี่ยนสถานะ "${resource.name}" เป็น "${label}" แล้ว`);
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    }
  };

  // Delete Resource
  const handleDeleteResource = async (resource: any) => {
    if (!confirm(`ต้องการลบหรือปลดระวางทรัพยากร "${resource.name}" ใช่หรือไม่?`)) return;
    try {
      const res = await deleteFacilityResourceAction(resource.id);
      if (res.action === "RETIRED") {
        showToast("info", `มีประวัติการจองเดิมในระบบ จึงเปลี่ยนสถานะเป็น "ปลดระวาง (RETIRED)" เพื่อรักษาประวัติ`);
      } else {
        showToast("success", `ลบข้อมูล "${resource.name}" สำเร็จ`);
      }
      await onRefresh();
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    }
  };

  const [activeTab, setActiveTab] = useState<"MEETING_ROOM" | "VEHICLE" | "SETTINGS">("MEETING_ROOM");
  const filteredResources = resources.filter((r) => r.type === activeTab);
  const todaySemesterState = isDateInActiveSemester(new Date(), semesterConfig, holidays);

  return (
    <div className="space-y-6">
      {/* Category Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 max-w-xl">
        <button
          onClick={() => { setActiveTab("MEETING_ROOM"); setResourceType("MEETING_ROOM"); }}
          className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "MEETING_ROOM"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Building className="w-4 h-4" />
          ห้องประชุม
        </button>
        <button
          onClick={() => { setActiveTab("VEHICLE"); setResourceType("VEHICLE"); }}
          className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "VEHICLE"
              ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Bus className="w-4 h-4" />
          รถโรงเรียน
        </button>
        <button
          onClick={() => setActiveTab("SETTINGS")}
          className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "SETTINGS"
              ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Settings className="w-4 h-4" />
          ตั้งค่าผู้อนุมัติ & คนขับ
        </button>
      </div>

      {activeTab === "SETTINGS" ? (
        <FacilitySettingsConfigTab onSaved={onRefresh} />
      ) : (
        <>
          {/* Quick Add Resource Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              เพิ่มทรัพยากรส่วนกลางใหม่ ({resourceType === "MEETING_ROOM" ? "ห้องประชุม" : "รถโรงเรียน"})
            </h2>

            <form onSubmit={handleCreateResource} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    รหัสกำกับ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={resourceType === "MEETING_ROOM" ? "เช่น ROOM-02" : "เช่น BUS-02"}
                    value={quickAddForm.code}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, code: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อทรัพยากร <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={resourceType === "MEETING_ROOM" ? "เช่น ห้องประชุมกุญชร 2" : "เช่น รถตู้โตโยต้า 14 ที่นั่ง"}
                    value={quickAddForm.name}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    {resourceType === "VEHICLE" ? "ทะเบียนรถ" : "สถานที่ / ชั้น"}
                  </label>
                  <input
                    type="text"
                    placeholder={resourceType === "VEHICLE" ? "เช่น นข-5678 อุดรธานี" : "เช่น อาคาร 1 ชั้น 2"}
                    value={resourceType === "VEHICLE" ? quickAddForm.licensePlate : quickAddForm.floor}
                    onChange={(e) =>
                      resourceType === "VEHICLE"
                        ? setQuickAddForm({ ...quickAddForm, licensePlate: e.target.value })
                        : setQuickAddForm({ ...quickAddForm, floor: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
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
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              {resourceType === "MEETING_ROOM" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
                  <div>
                    <label className="block font-bold text-xs text-indigo-900 dark:text-indigo-300 mb-1">
                      รูปแบบจัดห้องมาตรฐาน
                    </label>
                    <select
                      value={quickAddForm.defaultLayout}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, defaultLayout: e.target.value })}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      {Object.entries(ROOM_LAYOUT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-indigo-900 dark:text-indigo-300 mb-1">
                      อุปกรณ์ประจำห้องมาตรฐาน
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น โปรเจคเตอร์, ไมค์ 2 ตัว, จอแอลอีดี"
                      value={quickAddForm.defaultEquipment}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, defaultEquipment: e.target.value })}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-indigo-900 dark:text-indigo-300 mb-1">
                      คำอธิบาย / หมายเหตุห้อง
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ห้องประชุมใหญ่ส่วนกลาง"
                      value={quickAddForm.description}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, description: e.target.value })}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={adding}
                  className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {adding ? "กำลังเพิ่ม..." : "+ เพิ่มรายการทรัพยากร"}
                </button>
              </div>
            </form>
          </div>

          {/* Central Resources Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ตารางข้อมูลทรัพยากร ({filteredResources.length} รายการ)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="p-3.5 font-mono">รหัส</th>
                    <th className="p-3.5">ชื่อทรัพยากร</th>
                    <th className="p-3.5">รายละเอียด / ทะเบียน / คิวประจำสัปดาห์</th>
                    <th className="p-3.5 text-center">ความจุ</th>
                    <th className="p-3.5 text-center">สถานะ</th>
                    <th className="p-3.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        ไม่พบรายการทรัพยากรในหมวดนี้
                      </td>
                    </tr>
                  ) : (
                    filteredResources.map((res) => {
                      const vCfg = res.type === "VEHICLE" ? parseVehicleConfig(res.description) : null;
                      const vehSemState =
                        vCfg && vCfg.hasRecurringSchedule
                          ? isDateInActiveSemester(new Date(), vCfg.semesterConfig, holidays)
                          : null;
                      return (
                        <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{res.code}</td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">{res.name}</td>
                          <td className="p-3.5 text-slate-500 dark:text-slate-400">
                            {res.type === "VEHICLE" ? (
                              <div className="space-y-1.5">
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">ทะเบียน: </span>
                                  <span className="font-bold text-slate-900 dark:text-white">{res.vehicleProfile?.licensePlate || "-"}</span>
                                  {res.vehicleProfile?.brand && (
                                    <span className="text-[11px] text-slate-400 ml-1.5">({res.vehicleProfile.brand} {res.vehicleProfile.model})</span>
                                  )}
                                </div>
                                {vCfg && vCfg.hasRecurringSchedule && vCfg.recurringSchedules.length > 0 ? (
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-1">
                                      {vCfg.recurringSchedules.map((rule) => (
                                        <span
                                          key={rule.id}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                            rule.enabled
                                              ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                                              : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                                          }`}
                                        >
                                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                                          <span>{rule.title}: {formatRecurringDaysLabel(rule.daysOfWeek)} ({rule.startTime}–{rule.endTime} น.)</span>
                                        </span>
                                      ))}
                                    </div>
                                    {vehSemState && (
                                      <div className="text-[10px] font-semibold">
                                        {vehSemState.isSemesterOpen ? (
                                          <span className="text-amber-700 dark:text-amber-400">
                                            🏫 สถานะวันนี้: อยู่ในช่วง{vehSemState.semesterName || "เปิดเทอม"} (ล็อคคิวรถรับ-ส่งนักเรียน)
                                          </span>
                                        ) : (
                                          <span className="text-emerald-700 dark:text-emerald-400">
                                            🏖️ สถานะวันนี้: ปิดเทอม/วันหยุด (ปลดล็อคคิวรถให้จองได้)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400">
                                    รถส่วนกลางทั่วไป (ไม่มีคิววิ่งรับ-ส่งนักเรียนประจำสัปดาห์)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                  {res.location || res.roomProfile?.floor || "-"}
                                </div>
                                {(() => {
                                  const parsed = parseRoomConfig(res.description);
                                  return (
                                    <div className="space-y-0.5">
                                      <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold text-[10px] border border-indigo-200/60 dark:border-indigo-800/60">
                                        ผังมาตรฐาน: {ROOM_LAYOUT_LABELS[parsed.defaultLayout] || "แบบเธียเตอร์"}
                                      </span>
                                      {parsed.defaultEquipment && (
                                        <div className="text-[10px] text-slate-400 line-clamp-1" title={parsed.defaultEquipment}>
                                          อุปกรณ์: {parsed.defaultEquipment}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {res.capacity ? `${res.capacity} ที่นั่ง` : "-"}
                          </td>
                          <td className="p-3.5 text-center">
                            <StatusPillBadge status={res.status} size="sm" />
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                              {res.type === "VEHICLE" && (
                                <button
                                  onClick={() => handleOpenEdit(res)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold cursor-pointer transition"
                                  title="ตั้งค่าคิวรถใช้งานประจำสัปดาห์และช่วงเปิด-ปิดเทอมเฉพาะคันนี้"
                                >
                                  <Clock className="w-3.5 h-3.5 inline mr-1" /> ตั้งค่าคิวรถประจำ
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(res)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit2 className="w-3.5 h-3.5 inline mr-1" /> แก้ไข
                              </button>
                              <button
                                onClick={() => handleToggleStatus(res)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium cursor-pointer transition"
                                title="สลับสถานะความพร้อม"
                              >
                                {res.status === "AVAILABLE" ? "ปิดซ่อม" : "เปิดใช้"}
                              </button>
                              <button
                                onClick={() => handleDeleteResource(res)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-medium cursor-pointer transition"
                                title="ลบหรือปลดระวาง"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Driver List Card (for vehicle mode) */}
          {resourceType === "VEHICLE" && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                รายชื่อพนักงานขับรถในระบบ ({drivers.length} ท่าน)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {drivers.length === 0 ? (
                  <p className="text-xs text-slate-400 col-span-3">ยังไม่มีข้อมูลพนักงานขับรถในระบบ</p>
                ) : (
                  drivers.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{d.user?.name}</div>
                      <div className="text-slate-500">ใบขับขี่: {d.licenseNumber || "-"}</div>
                      <div className="text-slate-500">โทร: {d.phoneNumber || d.user?.phoneNumber || "-"}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
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
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">รหัสกำกับ</label>
                    <input
                      type="text"
                      required
                      value={editForm.code}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานะ</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="AVAILABLE">พร้อมให้บริการ</option>
                      <option value="UNDER_MAINTENANCE">ซ่อมบำรุง</option>
                      <option value="OUT_OF_SERVICE">งดให้บริการชั่วคราว</option>
                      <option value="RETIRED">ปลดระวาง</option>
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
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ความจุ (คน/ที่นั่ง)</label>
                    <input
                      type="number"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">สถานที่ตั้ง / ชั้น</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                {editingResource.type === "VEHICLE" ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
                      <span className="font-bold text-amber-800 dark:text-amber-300">ข้อมูลยานพาหนะ</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-0.5">ทะเบียนรถ</label>
                          <input
                            type="text"
                            value={editForm.licensePlate}
                            onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-0.5">ยี่ห้อ</label>
                          <input
                            type="text"
                            value={editForm.brand}
                            onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-0.5">รุ่น</label>
                          <input
                            type="text"
                            value={editForm.model}
                            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Per-Vehicle Recurring Schedule & Semester Open/Break Configuration */}
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-4">
                      <label className="flex items-start sm:items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editForm.hasRecurringSchedule}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditForm((prev) => ({
                              ...prev,
                              hasRecurringSchedule: checked,
                              recurringSchedules:
                                checked && prev.recurringSchedules.length === 0
                                  ? [
                                      {
                                        id: `rec-${Date.now()}-1`,
                                        title: "รับนักเรียนช่วงเช้า (สายประจำ)",
                                        daysOfWeek: [1, 2, 3, 4, 5],
                                        startTime: "06:30",
                                        endTime: "08:15",
                                        activeOnlyDuringSemester: true,
                                        enabled: true
                                      },
                                      {
                                        id: `rec-${Date.now()}-2`,
                                        title: "ส่งนักเรียนกลับบ้านช่วงเย็น",
                                        daysOfWeek: [1, 2, 3, 4, 5],
                                        startTime: "15:30",
                                        endTime: "17:15",
                                        activeOnlyDuringSemester: true,
                                        enabled: true
                                      }
                                    ]
                                  : prev.recurringSchedules
                            }));
                          }}
                          className="w-4 h-4 mt-0.5 sm:mt-0 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>รถคันนี้มีคิววิ่งประจำสัปดาห์ (เช่น รับ-ส่งนักเรียนประจำวัน)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            กำหนดเฉพาะคัน: หากรถคันนี้ไม่ได้วิ่งรับ-ส่งนักเรียนประจำ ไม่ต้องติ๊กช่องนี้
                          </p>
                        </div>
                      </label>

                      {editForm.hasRecurringSchedule && (
                        <div className="space-y-4 pt-3 border-t border-emerald-200/70 dark:border-emerald-800/50">
                          {/* Step 1: Recurring Time Slots for this vehicle */}
                          <div className="space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                1. ช่วงเวลาวิ่งประจำสัปดาห์ของรถคันนี้
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => addVehicleRecurringRule("MORNING_SHUTTLE")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer transition"
                                >
                                  + คิวรับเช้า (06:30-08:15)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addVehicleRecurringRule("AFTERNOON_SHUTTLE")}
                                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] cursor-pointer transition"
                                >
                                  + คิวส่งเย็น (15:30-17:15)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addVehicleRecurringRule()}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer transition"
                                >
                                  + กำหนดเอง
                                </button>
                              </div>
                            </div>

                            {editForm.recurringSchedules.length === 0 ? (
                              <div className="py-3 text-center text-slate-400 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                กดปุ่มด้านบนเพื่อเพิ่มช่วงเวลาวิ่งประจำสัปดาห์
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {editForm.recurringSchedules.map((rule) => (
                                  <div
                                    key={rule.id}
                                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <input
                                        type="text"
                                        value={rule.title}
                                        onChange={(e) =>
                                          updateVehicleRecurringRule(rule.id, { title: e.target.value })
                                        }
                                        placeholder="เช่น รับนักเรียนช่วงเช้า (สายประจำ)"
                                        className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeVehicleRecurringRule(rule.id)}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                        title="ลบคิวประจำนี้"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {/* Days of week selector + time range */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-[11px] text-slate-500 mr-1">วันวิ่ง:</span>
                                        {[
                                          { dow: 1, label: "จ." },
                                          { dow: 2, label: "อ." },
                                          { dow: 3, label: "พ." },
                                          { dow: 4, label: "พฤ." },
                                          { dow: 5, label: "ศ." },
                                          { dow: 6, label: "ส." },
                                          { dow: 0, label: "อา." }
                                        ].map(({ dow, label }) => {
                                          const active = rule.daysOfWeek.includes(dow);
                                          return (
                                            <button
                                              key={dow}
                                              type="button"
                                              onClick={() => {
                                                const nextDays = active
                                                  ? rule.daysOfWeek.filter((d) => d !== dow)
                                                  : [...rule.daysOfWeek, dow];
                                                updateVehicleRecurringRule(rule.id, { daysOfWeek: nextDays });
                                              }}
                                              className={`w-7 h-7 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                                active
                                                  ? "bg-emerald-600 text-white shadow-2xs"
                                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                                              }`}
                                            >
                                              {label}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="time"
                                          value={rule.startTime}
                                          onChange={(e) =>
                                            updateVehicleRecurringRule(rule.id, { startTime: e.target.value })
                                          }
                                          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                                        />
                                        <span className="text-slate-400">ถึง</span>
                                        <input
                                          type="time"
                                          value={rule.endTime}
                                          onChange={(e) =>
                                            updateVehicleRecurringRule(rule.id, { endTime: e.target.value })
                                          }
                                          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                        <input
                                          type="checkbox"
                                          checked={rule.activeOnlyDuringSemester}
                                          onChange={(e) =>
                                            updateVehicleRecurringRule(rule.id, {
                                              activeOnlyDuringSemester: e.target.checked
                                            })
                                          }
                                          className="w-3.5 h-3.5 rounded text-emerald-600"
                                        />
                                        <span>
                                          ล็อคเฉพาะช่วงเปิดเทอมของรถคันนี้ (ปลดล็อคอัตโนมัติในช่วงปิดเทอมเพื่อให้จองไปกิจกรรมได้)
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Step 2: Per-Vehicle Semester Open/Break Period Configuration */}
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-emerald-600" />
                                  <span>2. กำหนดช่วงเปิดเทอม – ปิดเทอม (เฉพาะของรถคันนี้)</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  เมื่ออยู่นอกช่วงวันที่เปิดเทอม หรือตรงกับวันหยุดราชการ ระบบจะปลดล็อคคิวรถคันนี้ให้อัตโนมัติ
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                  การตรวจสอบช่วงเปิด-ปิดเทอมของรถคันนี้
                                </label>
                                <select
                                  value={editForm.semesterConfig.mode}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      semesterConfig: {
                                        ...prev.semesterConfig,
                                        mode: e.target.value as FacilitySemesterConfig["mode"]
                                      }
                                    }))
                                  }
                                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                                >
                                  <option value="AUTO_DATE_RANGE">คำนวณตามช่วงวันที่เปิดเทอม–ปิดเทอมด้านล่าง</option>
                                  <option value="FORCE_OPEN">ล็อคคิวประจำทุกสัปดาห์ (เปิดเทอมตลอด)</option>
                                  <option value="FORCE_CLOSED">งดคิวประจำชั่วคราว (ปลดล็อคให้จองได้ตลอด)</option>
                                </select>
                              </div>

                              <div className="flex items-end pb-1.5">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  <input
                                    type="checkbox"
                                    checked={editForm.semesterConfig.excludePublicHolidays}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        semesterConfig: {
                                          ...prev.semesterConfig,
                                          excludePublicHolidays: e.target.checked
                                        }
                                      }))
                                    }
                                    className="w-4 h-4 rounded text-emerald-600"
                                  />
                                  <span>ปลดล็อคคิวอัตโนมัติในวันหยุดราชการ</span>
                                </label>
                              </div>
                            </div>

                            {editForm.semesterConfig.mode === "AUTO_DATE_RANGE" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {editForm.semesterConfig.semesters.map((sem, idx) => (
                                  <div
                                    key={sem.id || idx}
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {sem.name}
                                      </span>
                                      <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={sem.enabled}
                                          onChange={(e) => {
                                            const updated = [...editForm.semesterConfig.semesters];
                                            updated[idx] = { ...sem, enabled: e.target.checked };
                                            setEditForm((prev) => ({
                                              ...prev,
                                              semesterConfig: { ...prev.semesterConfig, semesters: updated }
                                            }));
                                          }}
                                          className="w-3.5 h-3.5 rounded text-emerald-600"
                                        />
                                        เปิดใช้
                                      </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                          วันเปิดเทอม
                                        </label>
                                        <input
                                          type="date"
                                          value={sem.startDate}
                                          onChange={(e) => {
                                            const updated = [...editForm.semesterConfig.semesters];
                                            updated[idx] = { ...sem, startDate: e.target.value };
                                            setEditForm((prev) => ({
                                              ...prev,
                                              semesterConfig: { ...prev.semesterConfig, semesters: updated }
                                            }));
                                          }}
                                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                          วันปิดเทอม
                                        </label>
                                        <input
                                          type="date"
                                          value={sem.endDate}
                                          onChange={(e) => {
                                            const updated = [...editForm.semesterConfig.semesters];
                                            updated[idx] = { ...sem, endDate: e.target.value };
                                            setEditForm((prev) => ({
                                              ...prev,
                                              semesterConfig: { ...prev.semesterConfig, semesters: updated }
                                            }));
                                          }}
                                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl space-y-3">
                    <span className="font-bold text-indigo-800 dark:text-indigo-300">การจัดผังห้องและอุปกรณ์มาตรฐาน</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-0.5">รูปแบบจัดห้องมาตรฐาน</label>
                        <select
                          value={editForm.defaultLayout}
                          onChange={(e) => setEditForm({ ...editForm, defaultLayout: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        >
                          {Object.entries(ROOM_LAYOUT_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-0.5">อุปกรณ์ประจำห้องมาตรฐาน</label>
                        <input
                          type="text"
                          placeholder="เช่น โปรเจคเตอร์, ไมค์ 2 ตัว, จอแอลอีดี"
                          value={editForm.defaultEquipment}
                          onChange={(e) => setEditForm({ ...editForm, defaultEquipment: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-0.5">คำอธิบาย / หมายเหตุห้องเพิ่มเติม</label>
                      <input
                        type="text"
                        placeholder="เช่น ห้องประชุมใหญ่ส่วนกลางชั้น 2"
                        value={editForm.roomNote}
                        onChange={(e) => setEditForm({ ...editForm, roomNote: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
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
