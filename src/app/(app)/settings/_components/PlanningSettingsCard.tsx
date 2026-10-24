"use client";

import React, { useState, useTransition } from "react";
import { 
  Map, 
  Users, 
  ShieldCheck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  Info 
} from "lucide-react";
import { updatePlanningSettingsAction } from "@/app/actions/planning-settings";

export interface UserOption {
  id: string;
  name: string;
  position?: string | null;
  department?: string | null;
  email?: string | null;
}

interface PlanningSettingsCardProps {
  initialEnablePlanning?: boolean;
  initialPlanningOfficerUserIds?: string[];
  availableUsers: UserOption[];
  onSaved?: () => void;
}

export function PlanningSettingsCard({
  initialEnablePlanning = true,
  initialPlanningOfficerUserIds = [],
  availableUsers = [],
  onSaved,
}: PlanningSettingsCardProps) {
  const [enablePlanning, setEnablePlanning] = useState<boolean>(initialEnablePlanning);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>(initialPlanningOfficerUserIds);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter available users for dropdown
  const filteredUsers = availableUsers.filter((u) => {
    if (selectedOfficerIds.includes(u.id)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = u.name.toLowerCase().includes(term);
    const posMatch = u.position?.toLowerCase().includes(term);
    const deptMatch = u.department?.toLowerCase().includes(term);
    return nameMatch || !!posMatch || !!deptMatch;
  });

  const handleAddOfficer = (userId: string) => {
    if (!selectedOfficerIds.includes(userId)) {
      setSelectedOfficerIds([...selectedOfficerIds, userId]);
    }
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleRemoveOfficer = (userId: string) => {
    setSelectedOfficerIds(selectedOfficerIds.filter((id) => id !== userId));
  };

  const handleSave = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await updatePlanningSettingsAction({
        enablePlanning,
        planningOfficerUserIds: selectedOfficerIds,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "บันทึกการตั้งค่าระบบแผนงานและติดตามงบประมาณเรียบร้อยแล้ว",
        });
        if (onSaved) onSaved();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        });
      }
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              ตั้งค่าระบบแผนงานโครงการและงบประมาณ
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              กำหนดการเปิดใช้งานระบบ และแต่งตั้งครูผู้ปฏิบัติงานแผนงานและการเงิน
            </p>
          </div>
        </div>

        {/* Global Module Toggle */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {enablePlanning ? "เปิดใช้งานระบบ" : "ปิดใช้งานระบบ"}
          </span>
          <button
            type="button"
            onClick={() => setEnablePlanning(!enablePlanning)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enablePlanning ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enablePlanning ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in-50 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Planning Officers Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            ครูผู้ปฏิบัติงานแผนงานและการเงิน (Planning & Budget Officers)
          </h3>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 flex gap-3 text-sm text-purple-800 dark:text-purple-300">
          <Info className="w-5 h-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <p className="font-medium mb-1">สิทธิ์เฉพาะของผู้ปฏิบัติงานแผนงานและการเงิน:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-purple-700 dark:text-purple-300">
              <li>สร้างโครงการ, กำหนดกิจกรรมย่อย และจัดสรรงบประมาณของสถานศึกษา</li>
              <li>ปรับปรุง/โอนเปลี่ยนแปลงงบประมาณโครงการและกิจกรรม (Budget Adjustment)</li>
              <li>บันทึกการเบิกจ่ายจริง (PAID) หรือกันเงินงบประมาณ (RESERVED) ของทุกโครงการ</li>
              <li>ยืนยันการเบิกจ่ายจริงเพื่อตัดยอดงบประมาณที่กันไว้</li>
              <li>ครูทั่วไปสามารถดูรายงานโครงการและกิจกรรมที่ตนเองรับผิดชอบได้โดยอัตโนมัติ</li>
            </ul>
          </div>
        </div>

        {/* Selected Officers List */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            รายชื่อผู้ได้รับแต่งตั้ง ({selectedOfficerIds.length} ท่าน)
          </label>

          {selectedOfficerIds.length === 0 ? (
            <div className="p-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 text-sm">
              ยังไม่มีการแต่งตั้งผู้ปฏิบัติงานแผนงาน (เฉพาะแอดมินเท่านั้นที่จะมีสิทธิ์จัดการงบประมาณ)
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedOfficerIds.map((userId) => {
                const user = availableUsers.find((u) => u.id === userId);
                return (
                  <div
                    key={userId}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-xl text-sm font-medium shadow-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 flex items-center justify-center text-xs font-bold shrink-0">
                      {user?.name ? user.name.slice(0, 1) : "?"}
                    </div>
                    <span>{user?.name || `User ID: ${userId}`}</span>
                    {user?.position && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">
                        ({user.position})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveOfficer(userId)}
                      className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-100 p-0.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                      title="ลบออกจากการแต่งตั้ง"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Search & Selection Combobox */}
        <div className="relative pt-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            ค้นหาและเพิ่มผู้ปฏิบัติงานแผนงาน
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="พิมพ์ชื่อ, สกุล, ตำแหน่ง หรือกลุ่มสาระ เพื่อค้นหา..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          </div>

          {/* Dropdown Options */}
          {isDropdownOpen && (
            <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-400">
                  {searchTerm.trim() ? "ไม่พบบุคลากรที่ตรงกับคำค้นหา" : "ไม่มีบุคลากรเพิ่มเติมให้เลือก"}
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleAddOfficer(u.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {u.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[u.position, u.department].filter(Boolean).join(" • ") || "บุคลากร"}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 px-2 py-1 bg-purple-50 dark:bg-purple-900/40 rounded-lg">
                      + แต่งตั้ง
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center gap-2 transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าแผนงาน</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
