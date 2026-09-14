"use client";

import React, { useState } from "react";
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
  X
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  createFacilityResourceAction,
  updateFacilityResourceAction,
  toggleFacilityResourceStatusAction,
  deleteFacilityResourceAction
} from "@/app/actions/facility";
import { type ModuleMode } from "./facility-shared";
import {
  StatusPillBadge,
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter
} from "@/components/shared-ui/school-ops";

interface FacilityManagementViewProps {
  resources: any[];
  drivers: any[];
  onRefresh: () => void;
}

export default function FacilityManagementView({
  resources,
  drivers,
  onRefresh
}: FacilityManagementViewProps) {
  const { showToast } = useToast();

  const [resourceType, setResourceType] = useState<ModuleMode>("MEETING_ROOM");
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Add Form State
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
    model: ""
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

      await createFacilityResourceAction({
        code: quickAddForm.code.trim(),
        name: quickAddForm.name.trim(),
        type: resourceType,
        capacity: Number(quickAddForm.capacity) || 30,
        location: quickAddForm.location.trim() || undefined,
        description: quickAddForm.description.trim() || undefined,
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
        floor: "ชั้น 1"
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

  // Save Edit
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

  const filteredResources = resources.filter((r) => r.type === resourceType);

  return (
    <div className="space-y-6">
      {/* Category Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 max-w-md">
        <button
          onClick={() => setResourceType("MEETING_ROOM")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            resourceType === "MEETING_ROOM"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Building className="w-4 h-4" />
          ห้องประชุมและอาคาร
        </button>
        <button
          onClick={() => setResourceType("VEHICLE")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            resourceType === "VEHICLE"
              ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Bus className="w-4 h-4" />
          รถโรงเรียนและยานพาหนะ
        </button>
      </div>

      {/* Quick Add Resource Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          เพิ่มทรัพยากรส่วนกลางใหม่ (Quick Add: {resourceType === "MEETING_ROOM" ? "ห้องประชุม" : "รถโรงเรียน"})
        </h2>

        <form onSubmit={handleCreateResource} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
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

          <div>
            <button
              type="submit"
              disabled={adding}
              className="w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {adding ? "กำลังเพิ่ม..." : "+ เพิ่มรายการ"}
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
                <th className="p-3.5">รายละเอียด / ทะเบียน</th>
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
                filteredResources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{res.code}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{res.name}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">
                      {res.vehicleProfile?.licensePlate
                        ? `ทะเบียน: ${res.vehicleProfile.licensePlate}`
                        : res.location || res.roomProfile?.floor || "-"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                      {res.capacity ? `${res.capacity} ที่นั่ง` : "-"}
                    </td>
                    <td className="p-3.5 text-center">
                      <StatusPillBadge status={res.status} size="sm" />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
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
                ))
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
                  <div className="text-slate-500">โทร: {d.user?.phone || "-"}</div>
                </div>
              ))
            )}
          </div>
        </div>
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
