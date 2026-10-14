"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  LayoutTemplate,
  CheckCircle2,
  PieChart,
  GraduationCap,
  TrendingUp,
  Calendar,
  Sparkles,
  UserCheck,
  Clock,
  HeartHandshake,
  ShieldAlert,
  FileText,
  Wrench,
  Building2,
  Fingerprint,
  Layers,
  Plus,
  Trash2,
  Search,
  CheckCheck,
  ToggleLeft,
  ToggleRight,
  Megaphone,
  Briefcase
} from "lucide-react";
import {
  type DashboardWidgetConfig,
  DEFAULT_WIDGET_CONFIG,
  saveDashboardWidgetConfig,
  resetUserWidgetConfigToDefault,
} from "@/app/actions/dashboard-widgets";

interface DashboardWidgetCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardWidgetConfig;
  onUpdateConfig: (newConfig: DashboardWidgetConfig) => void;
  isAdmin?: boolean;
}

type WidgetCategory =
  | "ทั้งหมด"
  | "เค้าโครง & วิดเจ็ตหลัก"
  | "การ์ด KPI ด้านผู้เรียน"
  | "การ์ด KPI ด้านบุคลากร"
  | "การ์ด KPI ด้านงานสนับสนุน";

interface WidgetItemMeta {
  key: keyof DashboardWidgetConfig;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "เค้าโครง & วิดเจ็ตหลัก" | "การ์ด KPI ด้านผู้เรียน" | "การ์ด KPI ด้านบุคลากร" | "การ์ด KPI ด้านงานสนับสนุน";
  badge?: string;
}

const WIDGET_METADATA: WidgetItemMeta[] = [
  // ── 1. เค้าโครง & วิดเจ็ตหลัก ──
  {
    key: "heroBanner",
    title: "แบนเนอร์คำขวัญ & ปรัชญาโรงเรียน",
    description: "ส่วนต้อนรับผู้บริหารพร้อมคำขวัญสร้างแรงบันดาลใจและสรุปบทบาทหน้าที่",
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Header",
  },
  {
    key: "subsystemQuickHub",
    title: "แถบสถานะย่อ 5 ระบบย่อย (Subsystem Quick Hub)",
    description: "แสดงภาพรวมสุขภาพและทางลัดเข้าสู่ระบบการลา, สารบรรณ, แจ้งซ่อม, ทรัพยากร และวิชาการ",
    icon: <Layers className="w-4 h-4 text-indigo-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Quick Access",
  },
  {
    key: "kpiStatsGrid",
    title: "แผงการ์ดสถิติ KPI รวมสถานศึกษา (Modular KPI Grid)",
    description: "แผงการ์ดสถิติภาพรวมผู้เรียน บุคลากร งานสารบรรณ และทรัพยากรส่วนกลาง",
    icon: <LayoutTemplate className="w-4 h-4 text-blue-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "KPI Matrix",
  },
  {
    key: "learningOutcomeChart",
    title: "กราฟผลการเรียนรู้รายกลุ่มสาระ (Learning Outcomes)",
    description: "กราฟแท่งเปรียบเทียบผลสัมฤทธิ์ทางการเรียนรู้ 8 กลุ่มสาระและสถิติเกรดเฉลี่ย",
    icon: <GraduationCap className="w-4 h-4 text-blue-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Academic",
  },
  {
    key: "attendanceDonutCard",
    title: "สถิติการเข้าเรียน & เช็กแถวประจำวัน",
    description: "กราฟโดนัทสรุปเปอร์เซ็นต์มาเรียน สาย ขาด และลา ของนักเรียนในวันนี้",
    icon: <PieChart className="w-4 h-4 text-emerald-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Daily Attendance",
  },
  {
    key: "operationsStrip",
    title: "แถบสถิติงานปฏิบัติการ 4 ฝ่าย (SMS Operations Strip)",
    description: "สรุปงบประมาณการเงิน, งานสารบรรณ, ระบบแจ้งซ่อม และการจองห้อง/รถโรงเรียน",
    icon: <Briefcase className="w-4 h-4 text-amber-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Operations",
  },
  {
    key: "distributionCharts",
    title: "สัดส่วนประเภทการลา & สถิติรายกลุ่มสาระ",
    description: "กราฟโดนัทจำแนกประเภทการลา พร้อมสถิติเปอร์เซ็นต์แต่ละกลุ่มสาระการเรียนรู้",
    icon: <PieChart className="w-4 h-4 text-indigo-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "HR Analytics",
  },
  {
    key: "studentAffairsOverview",
    title: "ภาพรวมข้อมูลผู้เรียน & กิจการนักเรียน (Student Overview)",
    description: "สรุปอัตราการมาเรียน แถวเช้า ลาป่วย/กิจ และระบบเฝ้าระวังความเสี่ยง (EWS)",
    icon: <GraduationCap className="w-4 h-4 text-purple-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Student Care",
  },
  {
    key: "announcementsCard",
    title: "ข่าวประชาสัมพันธ์และประกาศล่าสุด",
    description: "การ์ดแสดงข่าวสาร กิจกรรม และประกาศสำคัญของสถานศึกษา",
    icon: <Megaphone className="w-4 h-4 text-blue-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "School News",
  },
  {
    key: "academicCalendarCard",
    title: "ปฏิทินการศึกษาและกิจกรรมโรงเรียน",
    description: "ปฏิทินกิจกรรมโรงเรียน กำหนดการสอบ และวันสำคัญประจำภาคเรียน",
    icon: <Calendar className="w-4 h-4 text-indigo-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Calendar",
  },
  {
    key: "approvalQueue",
    title: "คิวงานพิจารณาอนุมัติคำขอลา (Approval Queue)",
    description: "ตารางรายการคำขอลาของครูและบุคลากร พร้อมระบบอนุมัติ/ไม่อนุมัติเร่งด่วนใน 1 คลิก",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Workflow",
  },
  {
    key: "monthlyTrendChart",
    title: "แนวโน้มสถิติการลารายเดือน (Monthly Trend)",
    description: "กราฟเส้นติดตามปริมาณการลาตลอดปีงบประมาณ สามารถเปิด/ปิดดูรายประเภทได้",
    icon: <TrendingUp className="w-4 h-4 text-rose-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
    badge: "Trends",
  },

  // ── 2. การ์ด KPI ด้านผู้เรียน ──
  {
    key: "kpiStudentTotal",
    title: "Card: นักเรียนทั้งหมดในระบบ",
    description: "แสดงยอดรวมนักเรียนปัจจุบันที่มีสถานะปกติ (Active) ในทะเบียนนักเรียน",
    icon: <GraduationCap className="w-4 h-4 text-purple-500" />,
    category: "การ์ด KPI ด้านผู้เรียน",
  },
  {
    key: "kpiStudentPresentToday",
    title: "Card: อัตราการมาเรียนวันนี้",
    description: "แสดงเปอร์เซ็นต์การมาเรียนของนักเรียนจากการเช็กแถวหน้าเสาธง",
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    category: "การ์ด KPI ด้านผู้เรียน",
  },
  {
    key: "kpiStudentLeavesToday",
    title: "Card: นักเรียนลาป่วย/ลากิจวันนี้",
    description: "สรุปยอดนักเรียนที่ขอลาและมีหลักฐานหรือครูที่ปรึกษารับทราบ",
    icon: <HeartHandshake className="w-4 h-4 text-blue-500" />,
    category: "การ์ด KPI ด้านผู้เรียน",
  },
  {
    key: "kpiStudentRiskEws",
    title: "Card: นักเรียนกลุ่มเฝ้าระวังความเสี่ยง (EWS)",
    description: "แจ้งเตือนเคสนักเรียนกลุ่มเสี่ยงวิกฤตที่ต้องการการดูแลช่วยเหลือเร่งด่วน",
    icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
    category: "การ์ด KPI ด้านผู้เรียน",
  },

  // ── 3. การ์ด KPI ด้านบุคลากร ──
  {
    key: "kpiStaffLeavePending",
    title: "Card: คำขอรอพิจารณาอนุมัติ",
    description: "จำนวนคำขอลาของครู/บุคลากรที่รอผู้อำนวยการหรือหัวหน้าลงนาม",
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    category: "การ์ด KPI ด้านบุคลากร",
  },
  {
    key: "kpiStaffOnLeave",
    title: "Card: ครูและบุคลากรลาวันนี้",
    description: "จำนวนบุคลากรที่ได้รับอนุมัติการลาและไม่ได้มาปฏิบัติหน้าที่ในวันนี้",
    icon: <UserCheck className="w-4 h-4 text-blue-500" />,
    category: "การ์ด KPI ด้านบุคลากร",
  },
  {
    key: "kpiStaffProxyTeaching",
    title: "Card: จัดครูสอนแทนประจำคาบ",
    description: "จำนวนคาบเรียนที่มีการจัดครูสอนแทนเรียบร้อยแล้ว",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    category: "การ์ด KPI ด้านบุคลากร",
  },
  {
    key: "kpiStaffAttendance",
    title: "Card: การลงเวลาปฏิบัติหน้าที่",
    description: "สถิติการสแกนใบหน้าและเช็กพิกัด GPS เข้าทำงานของบุคลากรวันนี้",
    icon: <Fingerprint className="w-4 h-4 text-indigo-500" />,
    category: "การ์ด KPI ด้านบุคลากร",
  },

  // ── 4. การ์ด KPI ด้านงานสนับสนุน ──
  {
    key: "kpiDocumentPending",
    title: "Card: หนังสือราชการรอเกษียณ",
    description: "ยอดหนังสือรับเข้าและคำสั่งโรงเรียนที่อยู่ระหว่างรอการส่งต่อหรือลงนาม",
    icon: <FileText className="w-4 h-4 text-indigo-500" />,
    category: "การ์ด KPI ด้านงานสนับสนุน",
  },
  {
    key: "kpiRepairActive",
    title: "Card: งานแจ้งซ่อมบำรุงที่ค้างอยู่",
    description: "รายการแจ้งซ่อมอาคารสถานที่ อุปกรณ์ IT หรือระบบไฟฟ้าที่กำลังดำเนินการ",
    icon: <Wrench className="w-4 h-4 text-rose-500" />,
    category: "การ์ด KPI ด้านงานสนับสนุน",
  },
  {
    key: "kpiFacilityToday",
    title: "Card: การใช้ทรัพยากรส่วนกลางวันนี้",
    description: "คิวขอใช้ห้องประชุมและรถโรงเรียนที่ได้รับอนุมัติในวันนี้",
    icon: <Building2 className="w-4 h-4 text-teal-500" />,
    category: "การ์ด KPI ด้านงานสนับสนุน",
  },
];

export default function DashboardWidgetCustomizerModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  isAdmin = true,
}: DashboardWidgetCustomizerModalProps) {
  const [localConfig, setLocalConfig] = useState<DashboardWidgetConfig>(config);
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory>("ทั้งหมด");
  const [filterMode, setFilterMode] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveAsSystemDefault, setSaveAsSystemDefault] = useState(Boolean(isAdmin));

  // Sync state if modal reopens with updated props
  useEffect(() => {
    setLocalConfig(config);
    if (isAdmin) setSaveAsSystemDefault(true);
  }, [config, isOpen, isAdmin]);

  const categories: WidgetCategory[] = [
    "ทั้งหมด",
    "เค้าโครง & วิดเจ็ตหลัก",
    "การ์ด KPI ด้านผู้เรียน",
    "การ์ด KPI ด้านบุคลากร",
    "การ์ด KPI ด้านงานสนับสนุน",
  ];

  const handleToggle = (key: keyof DashboardWidgetConfig) => {
    setLocalConfig((prev) => {
      const updated = {
        ...prev,
        [key]: !prev[key],
      };
      try {
        localStorage.setItem("kp_dashboard_widget_config", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleEnableAll = () => {
    const allEnabled = { ...localConfig };
    WIDGET_METADATA.forEach((w) => {
      allEnabled[w.key] = true;
    });
    setLocalConfig(allEnabled);
    try {
      localStorage.setItem("kp_dashboard_widget_config", JSON.stringify(allEnabled));
    } catch {}
  };

  const handleDisableAll = () => {
    const allDisabled = { ...localConfig };
    WIDGET_METADATA.forEach((w) => {
      allDisabled[w.key] = false;
    });
    setLocalConfig(allDisabled);
    try {
      localStorage.setItem("kp_dashboard_widget_config", JSON.stringify(allDisabled));
    } catch {}
  };

  const handleResetToDefault = () => {
    setLocalConfig(DEFAULT_WIDGET_CONFIG);
    try {
      localStorage.setItem("kp_dashboard_widget_config", JSON.stringify(DEFAULT_WIDGET_CONFIG));
    } catch {}
  };

  const handleResetToAdminDefault = async () => {
    setSaving(true);
    try {
      const res = await resetUserWidgetConfigToDefault();
      if (res.success && res.config) {
        setLocalConfig(res.config);
        try {
          localStorage.setItem("kp_dashboard_widget_config", JSON.stringify(res.config));
        } catch {}
        onUpdateConfig(res.config);
      } else {
        handleResetToDefault();
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 500);
    } catch {
      handleResetToDefault();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (asDefaultOverride?: boolean) => {
    setSaving(true);
    setSaveSuccess(false);

    const isSystemDefaultSave = asDefaultOverride ?? (isAdmin && saveAsSystemDefault);

    try {
      // 1. Instant client-side persistence
      try {
        localStorage.setItem("kp_dashboard_widget_config", JSON.stringify(localConfig));
      } catch {}

      // 2. Update parent component state immediately
      onUpdateConfig(localConfig);

      // 3. Save to server database asynchronously
      await saveDashboardWidgetConfig(localConfig, { saveAsDefault: isSystemDefaultSave }).catch(() => null);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Save config error:", err);
      onUpdateConfig(localConfig);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return WIDGET_METADATA.filter((item) => {
      const matchesCategory =
        selectedCategory === "ทั้งหมด" || item.category === selectedCategory;

      const isChecked = Boolean(localConfig[item.key]);
      const matchesStatus =
        filterMode === "all" ||
        (filterMode === "active" && isChecked) ||
        (filterMode === "inactive" && !isChecked);

      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [localConfig, selectedCategory, filterMode, searchQuery]);

  const activeCount = useMemo(() => {
    return WIDGET_METADATA.filter((w) => Boolean(localConfig[w.key])).length;
  }, [localConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base sm:text-lg">
                  ปรับแต่งและเพิ่มวิดเจ็ตแดชบอร์ด
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  เปิดอยู่ {activeCount}/{WIDGET_METADATA.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกเปิด/ปิด หรือเพิ่ม Card KPI จากทุกระบบย่อยลงในหน้าแดชบอร์ดหลัก
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin System Default Option Banner */}
        {isAdmin ? (
          <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-indigo-950 dark:text-indigo-200">
                <strong>สิทธิ์ผู้ดูแลระบบ:</strong> กำหนดค่าเริ่มต้นของสถานศึกษา เพื่อให้ครูและผู้ใช้ทุกคนเห็นวิดเจ็ตนี้โดยอัตโนมัติ (ไม่โล่ง)
              </span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-700 dark:text-indigo-300 shrink-0 self-end sm:self-auto select-none">
              <input
                type="checkbox"
                checked={saveAsSystemDefault}
                onChange={(e) => setSaveAsSystemDefault(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
              <span>บันทึกเป็นค่ามาตรฐานของโรงเรียน</span>
            </label>
          </div>
        ) : (
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-blue-950 dark:text-blue-200">
                คุณกำลังปรับแต่งวิดเจ็ตส่วนตัว หากต้องการใช้หน้าตามที่โรงเรียนกำหนดไว้ สามารถกด "ใช้ค่ามาตรฐานตามที่แอดมินกำหนด" ได้ตลอดเวลา
              </span>
            </div>
          </div>
        )}

        {/* Search & Quick Action Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวิดเจ็ตหรือการ์ด KPI..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === "all"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("active")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === "active"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              ใช้งานอยู่ ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("inactive")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === "inactive"
                  ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              ยังไม่ได้เพิ่ม ({WIDGET_METADATA.length - activeCount})
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
          {categories.map((cat) => {
            const countInCat =
              cat === "ทั้งหมด"
                ? WIDGET_METADATA.length
                : WIDGET_METADATA.filter((w) => w.category === cat).length;
            const activeInCat =
              cat === "ทั้งหมด"
                ? activeCount
                : WIDGET_METADATA.filter((w) => w.category === cat && localConfig[w.key]).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold border border-slate-200/60 dark:border-slate-600"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] opacity-75">
                  ({activeInCat}/{countInCat})
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body: Widgets List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 text-xs flex-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Sliders className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-sm">ไม่พบวิดเจ็ตที่ตรงกับเงื่อนไข</p>
              <p className="text-xs mt-1">ลองเปลี่ยนหมวดหมู่หรือคำค้นหา</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isChecked = Boolean(localConfig[item.key]);
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggle(item.key)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isChecked
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-2xs hover:border-blue-300"
                      : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xs shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-1.5 py-0.5 rounded-md">
                            {item.badge}
                          </span>
                        )}
                        {isChecked && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            เปิดใช้งาน
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Button: Toggle or Add */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isChecked ? (
                      <div
                        className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 bg-blue-600 justify-end"
                        title="คลิกเพื่อปิดใช้งาน"
                      >
                        <div className="bg-white w-4 h-4 rounded-full shadow-md transition-transform" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(item.key);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="เพิ่มวิดเจ็ตนี้เข้าแดชบอร์ด"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่ม</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleEnableAll}
              disabled={saving}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>เปิดทั้งหมด</span>
            </button>
            <button
              type="button"
              onClick={handleResetToAdminDefault}
              disabled={saving}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="คืนค่าเป็นค่ามาตรฐานสถานศึกษาที่ Admin กำหนดไว้"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>ใช้ค่ามาตรฐานตามที่แอดมินกำหนด</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={saving}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="รีเซ็ตกลับเป็นค่าเริ่มต้นจากระบบทั้งหมด"
            >
              <span>รีเซ็ตทั้งหมด</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isAdmin && saveAsSystemDefault
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              }`}
            >
              {saving ? (
                <span>กำลังบันทึก...</span>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกแล้ว!</span>
                </>
              ) : (
                <span>
                  {isAdmin && saveAsSystemDefault
                    ? "บันทึกเป็นค่ามาตรฐานโรงเรียน"
                    : "บันทึกการตั้งค่า"}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
