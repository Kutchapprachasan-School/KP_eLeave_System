"use client";

import React, { useState } from "react";
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
  Lock,
  UserCheck,
  Clock,
  HeartHandshake,
  ShieldAlert,
  FileText,
  Wrench,
  Building2,
  Fingerprint,
  Layers,
} from "lucide-react";
import {
  type DashboardWidgetConfig,
  DEFAULT_WIDGET_CONFIG,
  saveDashboardWidgetConfig,
} from "@/app/actions/dashboard-widgets";

interface DashboardWidgetCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardWidgetConfig;
  onUpdateConfig: (newConfig: DashboardWidgetConfig) => void;
  isAdmin: boolean;
}

type WidgetCategory =
  | "เค้าโครง & วิดเจ็ตหลัก"
  | "การ์ด KPI ด้านผู้เรียน"
  | "การ์ด KPI ด้านบุคลากร"
  | "การ์ด KPI ด้านงานสนับสนุน";

interface WidgetItemMeta {
  key: keyof DashboardWidgetConfig;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: WidgetCategory;
}

const WIDGET_METADATA: WidgetItemMeta[] = [
  // ── 1. เค้าโครง & วิดเจ็ตหลัก ──
  {
    key: "heroBanner",
    title: "แบนเนอร์คำขวัญ & ปรัชญาโรงเรียน",
    description: "ส่วนต้อนรับผู้บริหารพร้อมคำขวัญสร้างแรงบันดาลใจและสรุปบทบาทหน้าที่",
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
  },
  {
    key: "subsystemQuickHub",
    title: "แถบสถานะย่อ 5 ระบบย่อย (Subsystem Quick Hub)",
    description: "แสดงภาพรวมสุขภาพและทางลัดเข้าสู่ระบบการลา, สารบรรณ, แจ้งซ่อม, ทรัพยากร และวิชาการ",
    icon: <Layers className="w-4 h-4 text-indigo-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
  },
  {
    key: "kpiStatsGrid",
    title: "แผงการ์ดสถิติ KPI รวมสถานศึกษา (Modular KPI Grid)",
    description: "เปิด/ปิด แผงการ์ดสถิติภาพรวมด้านบนสุดของหน้าแดชบอร์ด",
    icon: <LayoutTemplate className="w-4 h-4 text-blue-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
  },
  {
    key: "approvalQueue",
    title: "คิวงานพิจารณาอนุมัติคำขอลา (Approval Queue)",
    description: "ตารางรายการคำขอลาของครูและบุคลากร พร้อมระบบอนุมัติ/ไม่อนุมัติเร่งด่วนใน 1 คลิก",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
  },
  {
    key: "distributionCharts",
    title: "สัดส่วนประเภทการลา & สถิติรายกลุ่มสาระ",
    description: "กราฟโดนัทจำแนกประเภทการลา พร้อมสถิติเปอร์เซ็นต์แต่ละกลุ่มสาระการเรียนรู้",
    icon: <PieChart className="w-4 h-4 text-indigo-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
  },
  {
    key: "studentAffairsOverview",
    title: "ภาพรวมข้อมูลผู้เรียน & กิจการนักเรียน (Student Overview)",
    description: "สรุปอัตราการมาเรียน แถวเช้า ลาป่วย/กิจ และระบบเฝ้าระวังความเสี่ยง (EWS)",
    icon: <GraduationCap className="w-4 h-4 text-purple-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
  },
  {
    key: "monthlyTrendChart",
    title: "แนวโน้มสถิติการลารายเดือน (Monthly Trend)",
    description: "กราฟเส้นติดตามปริมาณการลาตลอดปีงบประมาณ สามารถเปิด/ปิดดูรายประเภทได้",
    icon: <TrendingUp className="w-4 h-4 text-rose-500" />,
    category: "เค้าโครง & วิดเจ็ตหลัก",
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
  isAdmin,
}: DashboardWidgetCustomizerModalProps) {
  const [localConfig, setLocalConfig] = useState<DashboardWidgetConfig>(config);
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory>("เค้าโครง & วิดเจ็ตหลัก");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if modal reopens with updated props
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof DashboardWidgetConfig) => {
    if (!isAdmin) return;
    setLocalConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetToDefault = () => {
    if (!isAdmin) return;
    setLocalConfig(DEFAULT_WIDGET_CONFIG);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await saveDashboardWidgetConfig(localConfig);
      if (res.success && res.config) {
        onUpdateConfig(res.config);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err: any) {
      alert(err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const categories: WidgetCategory[] = [
    "เค้าโครง & วิดเจ็ตหลัก",
    "การ์ด KPI ด้านผู้เรียน",
    "การ์ด KPI ด้านบุคลากร",
    "การ์ด KPI ด้านงานสนับสนุน",
  ];

  const currentItems = WIDGET_METADATA.filter((item) => item.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#163A66] dark:text-white text-base sm:text-lg">
                ปรับแต่งแดชบอร์ดสถานศึกษา (Widget & KPI Customizer)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เปิด/ปิด วิดเจ็ตและ Card KPI ผู้เรียน บุคลากร สารบรรณ ตามความต้องการของผู้บริหาร
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if non-admin */}
        {!isAdmin && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>คุณไม่มีสิทธิ์ผู้ดูแลระบบ (Admin) หรือผู้อำนวยการ จึงสามารถดูการตั้งค่านี้ได้เท่านั้น</span>
          </div>
        )}

        {/* Category Tab Bar */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Modal Body: Widgets List for Active Category */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 text-xs flex-1">
          {currentItems.map((item) => {
            const isChecked = Boolean(localConfig[item.key]);
            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isChecked
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-2xs"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xs mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-[#163A66] dark:text-white text-sm flex items-center gap-1.5">
                      <span>{item.title}</span>
                      {isChecked && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded-full">
                          เปิดใช้งาน
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ml-3 ${
                    isChecked
                      ? "bg-blue-600 justify-end"
                      : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={!isAdmin || saving}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span>กำลังบันทึก...</span>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกแล้ว!</span>
                  </>
                ) : (
                  <span>บันทึกการตั้งค่า</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
