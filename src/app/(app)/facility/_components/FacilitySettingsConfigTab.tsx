"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Phone,
  FileText,
  Save,
  Users,
  Car,
  UserCheck,
  Search,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  getFacilitySettingsAction,
  updateFacilitySettingsAction,
  getFacilityEligibleUsersAction
} from "@/app/actions/facility";

interface FacilitySettingsConfigTabProps {
  onSaved?: () => void;
}

export default function FacilitySettingsConfigTab({ onSaved }: FacilitySettingsConfigTabProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Form State
  const [hotlinePhone, setHotlinePhone] = useState("042-261234");
  const [guidelinesHtml, setGuidelinesHtml] = useState("");
  const [step1UserIds, setStep1UserIds] = useState<string[]>([]);
  const [step2UserIds, setStep2UserIds] = useState<string[]>([]);
  const [driverAssignerUserIds, setDriverAssignerUserIds] = useState<string[]>([]);
  const [driverPoolUserIds, setDriverPoolUserIds] = useState<string[]>([]);

  // Search filters for user selectors
  const [searchStep1, setSearchStep1] = useState("");
  const [searchStep2, setSearchStep2] = useState("");
  const [searchAssigner, setSearchAssigner] = useState("");
  const [searchDriver, setSearchDriver] = useState("");

  useEffect(() => {
    loadSettingsAndUsers();
  }, []);

  async function loadSettingsAndUsers() {
    try {
      setLoading(true);
      const [settings, userList] = await Promise.all([
        getFacilitySettingsAction(),
        getFacilityEligibleUsersAction().catch(() => [])
      ]);

      setUsers(userList || []);
      if (settings) {
        setHotlinePhone(settings.hotlinePhone || "042-261234");
        setGuidelinesHtml(settings.guidelinesHtml || "");
        setStep1UserIds(parseUserIds(settings.approverStep1UserIds));
        setStep2UserIds(parseUserIds(settings.approverStep2UserIds));
        setDriverAssignerUserIds(parseUserIds(settings.driverAssignerUserIds));
        setDriverPoolUserIds(parseUserIds(settings.driverPoolUserIds));
      }
    } catch (err: any) {
      console.error("Error loading facility settings:", err);
      showToast("error", "ไม่สามารถโหลดการตั้งค่า: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function parseUserIds(raw?: string | null): string[] {
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateFacilitySettingsAction({
        hotlinePhone: hotlinePhone.trim(),
        guidelinesHtml: guidelinesHtml.trim(),
        approverStep1UserIds: step1UserIds.join(","),
        approverStep2UserIds: step2UserIds.join(","),
        driverAssignerUserIds: driverAssignerUserIds.join(","),
        driverPoolUserIds: driverPoolUserIds.join(",")
      });

      showToast("success", "บันทึกการตั้งค่าระบบทรัพยากรส่วนกลางเรียบร้อยแล้ว");
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error("Save error:", err);
      showToast("error", "บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserInList = (
    userId: string,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(userId)) {
      setter(currentList.filter((id) => id !== userId));
    } else {
      setter([...currentList, userId]);
    }
  };

  const renderUserPicker = (
    label: string,
    description: string,
    selectedIds: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    search: string,
    setSearch: (val: string) => void,
    badgeColor: string
  ) => {
    const filtered = users.filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.position?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {label}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {description} ({selectedIds.length} คนที่เลือก)
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือตำแหน่ง..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* User Selection List */}
        <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar pr-1">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">ไม่พบรายชื่อบุคลากร</div>
          ) : (
            filtered.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUserInList(user.id, selectedIds, setter)}
                  className={`pt-1.5 pb-1.5 px-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-[10.5px] text-slate-400 ml-1.5">
                      ({user.position || user.role || "เจ้าหน้าที่"})
                    </span>
                  </div>
                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-600 block" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">กำลังโหลดข้อมูลการตั้งค่าระบบส่วนกลาง...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. General Info & Hotline */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              สายด่วนและข้อความประกาศประจำระบบ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              กำหนดหมายเลขโทรศัพท์สายด่วนที่แสดงบนหน้าจองของครูและบุคลากร
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              หมายเลขโทรศัพท์สายด่วน (Hotline Phone) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={hotlinePhone}
              onChange={(e) => setHotlinePhone(e.target.value)}
              placeholder="เช่น 042-261234 หรือ 081-2345678"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            ระเบียบและแนวปฏิบัติการใช้ทรัพยากร (HTML หรือข้อความระเบียบราชการ)
          </label>
          <textarea
            rows={4}
            value={guidelinesHtml}
            onChange={(e) => setGuidelinesHtml(e.target.value)}
            placeholder="กรอกระเบียบ ประกาศ หรือแนวทางการใช้ห้องประชุมและรถโรงเรียน..."
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            หากเว้นว่างไว้ ระบบจะแสดงตารางแนวปฏิบัติมาตรฐานของโรงเรียนโดยอัตโนมัติ
          </p>
        </div>
      </div>

      {/* 2. Approver & Driver Pool Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Approver Step 1 */}
        {renderUserPicker(
          "ผู้ตรวจสอบขั้นที่ 1 (Approver Step 1)",
          "เจ้าหน้าที่ผู้รับผิดชอบห้อง / หัวหน้างานสถานที่ ตรวจสอบความพร้อม",
          step1UserIds,
          setStep1UserIds,
          searchStep1,
          setSearchStep1,
          "indigo"
        )}

        {/* Approver Step 2 */}
        {renderUserPicker(
          "ผู้อนุมัติขั้นที่ 2 (Approver Step 2)",
          "ผู้อำนวยการ / รองผู้อำนวยการฝ่ายบริหาร อนุมัติขั้นสุดท้าย",
          step2UserIds,
          setStep2UserIds,
          searchStep2,
          setSearchStep2,
          "purple"
        )}

        {/* Driver Assigner */}
        {renderUserPicker(
          "ผู้มีสิทธิ์จัดสรรคนขับรถ (Driver Assigner)",
          "เจ้าหน้าที่งานยานพาหนะที่มีสิทธิ์มอบหมายคนขับในแต่ละภารกิจ",
          driverAssignerUserIds,
          setDriverAssignerUserIds,
          searchAssigner,
          setSearchAssigner,
          "emerald"
        )}

        {/* Driver Pool */}
        {renderUserPicker(
          "รายชื่อคนขับรถในสังกัด (Driver Pool)",
          "บุคลากรที่มีใบอนุญาตขับขี่และได้รับมอบหมายให้ปฏิบัติหน้าที่ขับรถโรงเรียน",
          driverPoolUserIds,
          setDriverPoolUserIds,
          searchDriver,
          setSearchDriver,
          "amber"
        )}
      </div>

      {/* Submit Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}</span>
        </button>
      </div>
    </form>
  );
}
