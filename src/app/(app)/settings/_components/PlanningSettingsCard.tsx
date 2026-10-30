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
  Info,
  Coins,
  Receipt,
  FileCheck
} from "lucide-react";
import { 
  updatePlanningSettingsAction,
  getPlanningStaffListAction,
} from "@/actions/planning/settings-actions";
import { getSimpleUsersList } from "@/app/actions/settings";
import { DocumentRequirementPolicy } from "@/lib/planning/types";

export interface UserOption {
  id: string;
  name: string;
  position?: string | null;
  department?: string | null;
  email?: string | null;
}

interface RoleUserPickerProps {
  title: string;
  subtitle: string;
  roleBadgeText: string;
  icon: React.ReactNode;
  theme: "purple" | "indigo" | "emerald";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  availableUsers: UserOption[];
  emptyNote: string;
  infoBulletPoints: string[];
  isLoading?: boolean;
  onReload?: () => void;
}

function RoleUserPicker({
  title,
  subtitle,
  roleBadgeText,
  icon,
  theme,
  selectedIds,
  onChange,
  availableUsers,
  emptyNote,
  infoBulletPoints,
  isLoading = false,
  onReload,
}: RoleUserPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const themeClasses = {
    purple: {
      icon: "w-5 h-5 text-purple-600 dark:text-purple-400",
      infoBg: "bg-purple-50/60 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50 text-purple-800 dark:text-purple-300",
      infoIcon: "text-purple-600 dark:text-purple-400",
      infoList: "text-purple-700 dark:text-purple-300",
      chip: "bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800",
      chipAvatar: "bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200",
      chipRemove: "text-purple-400 hover:text-purple-700 dark:hover:text-purple-100 hover:bg-purple-100 dark:hover:bg-purple-900",
      chipPos: "text-purple-600 dark:text-purple-400",
      focusRing: "focus:ring-purple-500",
      btnBadge: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40",
      hoverBg: "hover:bg-purple-50/70 dark:hover:bg-purple-950/40",
    },
    indigo: {
      icon: "w-5 h-5 text-indigo-600 dark:text-indigo-400",
      infoBg: "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300",
      infoIcon: "text-indigo-600 dark:text-indigo-400",
      infoList: "text-indigo-700 dark:text-indigo-300",
      chip: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800",
      chipAvatar: "bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200",
      chipRemove: "text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-900",
      chipPos: "text-indigo-600 dark:text-indigo-400",
      focusRing: "focus:ring-indigo-500",
      btnBadge: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40",
      hoverBg: "hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40",
    },
    emerald: {
      icon: "w-5 h-5 text-emerald-600 dark:text-emerald-400",
      infoBg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300",
      infoIcon: "text-emerald-600 dark:text-emerald-400",
      infoList: "text-emerald-700 dark:text-emerald-300",
      chip: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
      chipAvatar: "bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200",
      chipRemove: "text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900",
      chipPos: "text-emerald-600 dark:text-emerald-400",
      focusRing: "focus:ring-emerald-500",
      btnBadge: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40",
      hoverBg: "hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40",
    },
  }[theme];

  const filteredUsers = (availableUsers || []).filter((u) => {
    if (!u || !u.id) return false;
    if (selectedIds && selectedIds.includes(u.id)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (u.name || "").toLowerCase().includes(term);
    const posMatch = (u.position || "").toLowerCase().includes(term);
    const deptMatch = (u.department || "").toLowerCase().includes(term);
    return nameMatch || !!posMatch || !!deptMatch;
  });

  const handleAdd = (userId: string) => {
    if (!selectedIds.includes(userId)) {
      onChange([...selectedIds, userId]);
    }
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleRemove = (userId: string) => {
    onChange(selectedIds.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
      </div>

      <div className={`p-4 rounded-xl border flex gap-3 text-sm ${themeClasses.infoBg}`}>
        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${themeClasses.infoIcon}`} />
        <div>
          <p className="font-medium mb-1">สิทธิ์เฉพาะของ {title}:</p>
          <ul className={`list-disc list-inside space-y-0.5 text-xs ${themeClasses.infoList}`}>
            {infoBulletPoints.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Selected Users Chips */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          รายชื่อผู้ได้รับสิทธิ์ ({selectedIds.length} ท่าน)
        </label>

        {selectedIds.length === 0 ? (
          <div className="p-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 text-sm">
            {emptyNote}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((userId) => {
              const user = availableUsers.find((u) => u.id === userId);
              return (
                <div
                  key={userId}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-sm font-medium shadow-xs ${themeClasses.chip}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${themeClasses.chipAvatar}`}>
                    {user?.name ? user.name.slice(0, 1) : "?"}
                  </div>
                  <span>{user?.name || `User ID: ${userId}`}</span>
                  {user?.position && (
                    <span className={`text-xs font-normal ${themeClasses.chipPos}`}>
                      ({user.position})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(userId)}
                    className={`p-0.5 rounded-full transition-colors ${themeClasses.chipRemove}`}
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

      {/* Combobox Search */}
      <div className="relative pt-1">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          ค้นหาและเพิ่มบุคลากร ({roleBadgeText})
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
            className={`w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${themeClasses.focusRing} text-sm`}
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>

        {isDropdownOpen && (
          <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                <span>กำลังโหลดรายชื่อบุคลากร...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400 space-y-1">
                <p>
                  {searchTerm.trim()
                    ? `ไม่พบบุคลากรที่ตรงกับคำค้นหา "${searchTerm}"`
                    : (availableUsers || []).length === 0
                    ? "ยังไม่พบรายชื่อบุคลากรในระบบ"
                    : "บุคลากรทุกคนได้รับการแต่งตั้งแล้ว"}
                </p>
                {onReload && (
                  <button
                    type="button"
                    onClick={onReload}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
                  >
                    ↻ กดเพื่อโหลดรายชื่อบุคลากรใหม่
                  </button>
                )}
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleAdd(u.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${themeClasses.hoverBg}`}
                >
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {u.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {[u.position, u.department].filter(Boolean).join(" • ") || "บุคลากร"}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${themeClasses.btnBadge}`}>
                    + แต่งตั้ง
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PlanningSettingsCardProps {
  initialEnablePlanning?: boolean;
  initialPlanningOfficerUserIds?: string[];
  initialPlanningBudgetOfficerUserIds?: string[];
  initialPlanningDisburserUserIds?: string[];
  initialPlanningDocumentRequirement?: DocumentRequirementPolicy;
  availableUsers: UserOption[];
  onSaved?: () => void;
}

export function PlanningSettingsCard({
  initialEnablePlanning = true,
  initialPlanningOfficerUserIds = [],
  initialPlanningBudgetOfficerUserIds = [],
  initialPlanningDisburserUserIds = [],
  initialPlanningDocumentRequirement = "BOTH",
  availableUsers = [],
  onSaved,
}: PlanningSettingsCardProps) {
  const [enablePlanning, setEnablePlanning] = useState<boolean>(initialEnablePlanning);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>(initialPlanningOfficerUserIds);
  const [selectedBudgetOfficerIds, setSelectedBudgetOfficerIds] = useState<string[]>(initialPlanningBudgetOfficerUserIds);
  const [selectedDisburserIds, setSelectedDisburserIds] = useState<string[]>(initialPlanningDisburserUserIds);
  const [documentRequirement, setDocumentRequirement] = useState<DocumentRequirementPolicy>(initialPlanningDocumentRequirement);
  const [usersList, setUsersList] = useState<UserOption[]>(availableUsers);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(!availableUsers || availableUsers.length === 0);

  const loadStaffUsers = React.useCallback(async (force = false) => {
    setIsLoadingUsers(true);
    try {
      const res = await getPlanningStaffListAction();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setUsersList(res.data);
        return;
      }
      const fallback = await getSimpleUsersList();
      if (fallback && Array.isArray(fallback) && fallback.length > 0) {
        setUsersList(
          fallback.map((u: any) => ({
            id: u.id,
            name: u.name || "ไม่ระบุชื่อ",
            position: u.position || null,
            department: u.department || u.subjectGroup || null,
            email: u.email || null,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load users for planning settings:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    if (availableUsers && availableUsers.length > 0) {
      setUsersList(availableUsers);
      setIsLoadingUsers(false);
    } else {
      loadStaffUsers();
    }
  }, [availableUsers, loadStaffUsers]);

  React.useEffect(() => {
    setEnablePlanning(initialEnablePlanning);
  }, [initialEnablePlanning]);

  React.useEffect(() => {
    setSelectedOfficerIds(initialPlanningOfficerUserIds);
  }, [initialPlanningOfficerUserIds]);

  React.useEffect(() => {
    setSelectedBudgetOfficerIds(initialPlanningBudgetOfficerUserIds);
  }, [initialPlanningBudgetOfficerUserIds]);

  React.useEffect(() => {
    setSelectedDisburserIds(initialPlanningDisburserUserIds);
  }, [initialPlanningDisburserUserIds]);

  React.useEffect(() => {
    setDocumentRequirement(initialPlanningDocumentRequirement);
  }, [initialPlanningDocumentRequirement]);

  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await updatePlanningSettingsAction({
        enablePlanning,
        planningOfficerUserIds: selectedOfficerIds,
        planningBudgetOfficerUserIds: selectedBudgetOfficerIds,
        planningDisburserUserIds: selectedDisburserIds,
        planningDocumentRequirement: documentRequirement,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "บันทึกการตั้งค่าระบบแผนงานและกำหนดสิทธิ์เรียบร้อยแล้ว",
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 space-y-8">
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
              กำหนดการเปิดใช้งานระบบ และแต่งตั้งสิทธิ์เจ้าหน้าที่แผนงาน ผู้แก้ไขจำนวนเงิน และผู้บันทึกการเบิกจ่าย
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

      {/* 1. General Planning Officers */}
      <RoleUserPicker
        title="1. เจ้าหน้าที่แผนงานหลัก (General Planning Officers)"
        subtitle="ผู้ดูแลและบริหารจัดการแผนงานโครงการ กิจกรรม และรายงานสรุปโครงการภาพรวมของสถานศึกษา"
        roleBadgeText="เจ้าหน้าที่แผนงานหลัก"
        icon={<ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
        theme="purple"
        selectedIds={selectedOfficerIds}
        onChange={setSelectedOfficerIds}
        availableUsers={usersList}
        isLoading={isLoadingUsers}
        onReload={() => loadStaffUsers(true)}
        emptyNote="ยังไม่มีการแต่งตั้งเจ้าหน้าที่แผนงานหลัก (เฉพาะผู้ดูแลระบบที่จะมีสิทธิ์จัดการโครงสร้างโครงการ)"
        infoBulletPoints={[
          "สร้างโครงการ, กำหนดกิจกรรมย่อย และจัดทำรายงานแผนปฏิบัติการประจำปี",
          "จัดการเอกสารแนบและรายงานสรุปโครงการ",
          "ดูภาพรวมสถิติโครงการและสถานะงบประมาณทั้งหมดของโรงเรียน",
        ]}
      />

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* 2. Budget Adjustment Officers (แก้ไขจำนวนเงิน) */}
      <RoleUserPicker
        title="2. ผู้มีสิทธิ์แก้ไขข้อมูลจำนวนเงินและโอนเกลี่ย (Budget Adjustment Officers)"
        subtitle="ผู้มีอำนาจในการกำหนด/แก้ไขวงเงินงบประมาณโครงการ กิจกรรมย่อย และการโอนเปลี่ยนแปลงงบประมาณ"
        roleBadgeText="ผู้จัดการงบประมาณ"
        icon={<Coins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        theme="indigo"
        selectedIds={selectedBudgetOfficerIds}
        onChange={setSelectedBudgetOfficerIds}
        availableUsers={usersList}
        isLoading={isLoadingUsers}
        onReload={() => loadStaffUsers(true)}
        emptyNote="ยังไม่ได้ระบุเฉพาะเจาะจง (ระบบจะให้สิทธิ์แก่ผู้ดูแลระบบและเจ้าหน้าที่แผนงานหลักโดยอัตโนมัติ)"
        infoBulletPoints={[
          "กำหนดวงเงินงบประมาณเริ่มต้นของโครงการและกิจกรรมย่อย",
          "แก้ไข/ปรับปรุงวงเงินงบประมาณที่จัดสรร (Allocated Amount)",
          "ทำการโอนเปลี่ยนแปลงงบประมาณ หรือปรับยอดเงินจัดสรรงวดเงิน (Budget Adjustment)",
          "หากไม่มีการระบุรายชื่อ สิทธิ์นี้จะตกเป็นของผู้ดูแลระบบ (Admin) และเจ้าหน้าที่แผนงานหลัก",
        ]}
      />

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* 3. Disbursement & Expense Officers (เพิ่มข้อมูลการเบิก) */}
      <RoleUserPicker
        title="3. ผู้มีสิทธิ์บันทึกและเพิ่มข้อมูลการเบิกจ่าย (Disbursement & Expense Officers)"
        subtitle="ผู้มีอำนาจในการลงรายการเบิกจ่ายงบประมาณจริง ตัดยอดเงิน และยืนยันผลการเบิกจ่าย"
        roleBadgeText="เจ้าหน้าที่เบิกจ่าย"
        icon={<Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        theme="emerald"
        selectedIds={selectedDisburserIds}
        onChange={setSelectedDisburserIds}
        availableUsers={usersList}
        isLoading={isLoadingUsers}
        onReload={() => loadStaffUsers(true)}
        emptyNote="ยังไม่ได้ระบุเฉพาะเจาะจง (ระบบจะให้สิทธิ์แก่ผู้ดูแลระบบและเจ้าหน้าที่แผนงานหลักโดยอัตโนมัติ)"
        infoBulletPoints={[
          "บันทึกข้อมูลการเบิกจ่ายจริง (PAID) พร้อมแนบใบสำคัญรับเงิน/หลักฐานการจ่าย",
          "บันทึกการกันเงินงบประมาณ (RESERVED) สำหรับโครงการที่อยู่ระหว่างดำเนินการ",
          "ยืนยันผลการเบิกจ่ายจริงและตัดยอดเงินส่วนต่างคืนโครงการ (Settlement Delta)",
          "หากไม่มีการระบุรายชื่อ สิทธิ์นี้จะตกเป็นของผู้ดูแลระบบ (Admin) และเจ้าหน้าที่แผนงานหลัก",
        ]}
      />

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* 4. Document Requirement Policy */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              4. เกณฑ์การตรวจสอบเอกสารสรุปผลโครงการและกิจกรรม (Document Requirement Policy)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              กำหนดเงื่อนไขในการพิจารณาว่าโครงการและกิจกรรมย่อยดำเนินการส่งรายงานครบถ้วนตามเกณฑ์ของโรงเรียน
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              id: "BOTH" as DocumentRequirementPolicy,
              title: "ส่งทั้ง สรุปกิจกรรม + สรุปโครงการ",
              desc: "บังคับส่งรายงานกิจกรรมย่อยครบทุกกิจกรรม และต้องมีเล่มรายงานสรุปโครงการภาพรวม (แนะนำสำหรับโรงเรียนทั่วไป)",
              badge: "มาตรฐานสูงสุด (Recommended)",
              badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
            },
            {
              id: "PROJECT_ONLY" as DocumentRequirementPolicy,
              title: "ส่งเฉพาะ เล่มสรุปโครงการ",
              desc: "ผู้รับผิดชอบโครงการส่งเฉพาะเล่มรายงานสรุปโครงการภาพรวม (ไม่บังคับรายงานกิจกรรมย่อยแยกรายกิจกรรม)",
              badge: "สรุปโครงการเท่านั้น",
              badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
            },
            {
              id: "ACTIVITY_ONLY" as DocumentRequirementPolicy,
              title: "ส่งเฉพาะ รายงานกิจกรรมย่อย",
              desc: "ผู้รับผิดชอบกิจกรรมย่อยส่งรายงานครบทุกกิจกรรม (ไม่บังคับทำเล่มสรุปโครงการรวมอีกฉบับ)",
              badge: "สรุปกิจกรรมเท่านั้น",
              badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            },
            {
              id: "EITHER" as DocumentRequirementPolicy,
              title: "ส่งอย่างใดอย่างหนึ่ง",
              desc: "ถือว่าสมบูรณ์หากมีรายงานกิจกรรมย่อยครบทุกกิจกรรม หรือมีเล่มสรุปโครงการภาพรวมอย่างใดอย่างหนึ่ง",
              badge: "ยืดหยุ่นสูง",
              badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            },
          ].map((opt) => {
            const isSelected = documentRequirement === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setDocumentRequirement(opt.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-indigo-600 bg-indigo-600" : "border-gray-300 dark:border-gray-600"
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      {opt.title}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pl-5 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </div>
            );
          })}
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
