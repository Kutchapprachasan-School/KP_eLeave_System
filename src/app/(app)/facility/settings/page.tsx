"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Car, 
  Building, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  ArrowLeft,
  Info
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import Link from "next/link";
import {
  getFacilityResourcesAction,
  createFacilityResourceAction,
  toggleFacilityResourceStatusAction,
  deleteFacilityResourceAction,
  getCurrentFacilityUserRoleAction
} from "@/app/actions/facility";

export default function FacilitySettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [userRoleInfo, setUserRoleInfo] = useState<any>(null);

  // Form State
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"MEETING_ROOM" | "VEHICLE">("MEETING_ROOM");
  const [newCapacity, setNewCapacity] = useState(30);
  const [newLocation, setNewLocation] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [resList, roleInfo] = await Promise.all([
        getFacilityResourcesAction({ includeRetired: true }),
        getCurrentFacilityUserRoleAction().catch(() => null)
      ]);
      setResources(resList || []);
      setUserRoleInfo(roleInfo);
    } catch (err: any) {
      showToast("error", "ไม่สามารถดึงข้อมูลทรัพยากร: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      showToast("error", "กรุณาระบุรหัสกำกับและชื่อทรัพยากร");
      return;
    }

    try {
      setSubmitting(true);
      const isVehicle = newType === "VEHICLE";
      await createFacilityResourceAction({
        code: newCode.trim(),
        name: newName.trim(),
        type: newType,
        capacity: Number(newCapacity) || 30,
        location: newLocation.trim() || undefined,
        ...(isVehicle ? {
          vehicleProfile: {
            licensePlate: licensePlate.trim() || newCode.trim(),
            seatCapacity: Number(newCapacity) || 12
          }
        } : {
          roomProfile: {
            floor: newLocation.trim() || "ชั้น 1",
            hasProjector: true,
            hasSoundSystem: true
          }
        })
      });

      showToast("success", `เพิ่ม "${newName}" สำเร็จเรียบร้อยแล้ว`);
      setNewCode("");
      setNewName("");
      setNewLocation("");
      setLicensePlate("");
      loadData();
    } catch (err: any) {
      showToast("error", "เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (res: any) => {
    const nextStatus = res.status === "AVAILABLE" ? "UNDER_MAINTENANCE" : "AVAILABLE";
    const label = nextStatus === "AVAILABLE" ? "พร้อมให้บริการ" : "แจ้งปิดซ่อมบำรุง";
    try {
      await toggleFacilityResourceStatusAction(res.id, nextStatus as any);
      showToast("success", `เปลี่ยนสถานะ "${res.name}" เป็น "${label}" แล้ว`);
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDelete = async (res: any) => {
    try {
      const result = await deleteFacilityResourceAction(res.id);
      if (result.action === "RETIRED") {
        showToast("info", `ทรัพยากรนี้มีประวัติการจอง จึงถูกเปลี่ยนสถานะเป็น "ปลดระวาง (RETIRED)"`);
      } else {
        showToast("success", `ลบรายการ "${res.name}" สำเร็จ`);
      }
      loadData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const canManage = userRoleInfo?.canManage || userRoleInfo?.isAdmin;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/general/facility"
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:hover:text-white shadow-2xs transition"
            title="กลับไประบบจองทรัพยากร"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              การตั้งค่าทรัพยากรส่วนกลาง (2-Pillars: ห้องประชุม & รถโรงเรียน)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              จัดการฐานข้อมูลทรัพยากรส่วนกลาง เชื่อมต่อตรงกับฐานข้อมูลจริง PostgreSQL
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {!canManage && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Info className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <strong>โหมดดูข้อมูล:</strong> คุณกำลังเปิดหน้านี้ในฐานะผู้ใช้ทั่วไป สำหรับการเพิ่ม แก้ไข หรือเปลี่ยนสถานะทรัพยากร ต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin) หรือหัวหน้างานที่เกี่ยวข้อง
          </div>
        </div>
      )}

      {/* Add Resource Form (Only if privileged) */}
      {canManage && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Plus className="w-5 h-5 text-emerald-600" /> เพิ่มทรัพยากรใหม่สู่ฐานข้อมูลกลาง
          </h2>

          <form onSubmit={handleAddResource} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">รหัสกำกับ *</label>
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="เช่น ROOM-02, BUS-02"
                className="w-full h-10 px-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ชื่อทรัพยากร *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น ห้องประชุมกุญชร 2"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ประเภท *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="MEETING_ROOM">🏢 ห้องประชุมและอาคาร</option>
                <option value="VEHICLE">🚐 รถโรงเรียนและยานพาหนะ</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {newType === "VEHICLE" ? "ทะเบียนรถ" : "สถานที่ / ชั้น"}
              </label>
              <input
                type="text"
                value={newType === "VEHICLE" ? licensePlate : newLocation}
                onChange={(e) => newType === "VEHICLE" ? setLicensePlate(e.target.value) : setNewLocation(e.target.value)}
                placeholder={newType === "VEHICLE" ? "เช่น นข-1234 อุดรฯ" : "เช่น อาคาร 2 ชั้น 2"}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> {submitting ? "กำลังเพิ่ม..." : "+ เพิ่มรายการ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            รายการทรัพยากรทั้งหมดในระบบ ({resources.length} รายการ)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700/80">
                <th className="p-3.5 font-mono">รหัส</th>
                <th className="p-3.5">ชื่อรายการ</th>
                <th className="p-3.5">ประเภท</th>
                <th className="p-3.5">รายละเอียด / ทะเบียน</th>
                <th className="p-3.5 text-center">ความจุ</th>
                <th className="p-3.5 text-center">สถานะ</th>
                {canManage && <th className="p-3.5 text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบรายการทรัพยากรในระบบ"}
                  </td>
                </tr>
              ) : (
                resources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{res.code}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{res.name}</td>
                    <td className="p-3.5">
                      {res.type === "MEETING_ROOM" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Building className="w-3 h-3" /> ห้องประชุม
                        </span>
                      ) : res.type === "VEHICLE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Car className="w-3 h-3" /> รถโรงเรียน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {res.type}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {res.vehicleProfile?.licensePlate ? `ทะเบียน: ${res.vehicleProfile.licensePlate}` : res.location || "-"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                      {res.capacity ? `${res.capacity} ที่นั่ง` : "-"}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        res.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                        res.status === "UNDER_MAINTENANCE" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                        res.status === "RETIRED" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400" :
                        "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}>
                        {res.status === "AVAILABLE" ? "พร้อมให้บริการ" :
                         res.status === "UNDER_MAINTENANCE" ? "ซ่อมบำรุง" :
                         res.status === "RETIRED" ? "ปลดระวาง" : res.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(res)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="สลับสถานะเปิด/ปิดซ่อม"
                          >
                            {res.status === "AVAILABLE" ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(res)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 transition"
                            title="ลบหรือปลดระวาง"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
