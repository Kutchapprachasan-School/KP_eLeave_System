"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Check,
  X,
  Lock,
  Paperclip,
  Layers,
  ArrowUpRight,
  Info
} from "lucide-react";
import {
  getFiscalYearDashboardAction,
  getFiscalYearsListAction,
  getBudgetUsersAction,
  ensureDefaultFiscalYearAction,
  confirmTrancheDepositAction,
  createProjectAction,
  createActivityAction,
  recordExpenseAction,
  recordAndApproveExpenseAction,
  approveExpenseAction,
  reverseExpenseAction,
  transferBudgetAction,
  attachProjectFileAction,
} from "@/app/actions/project-budget";

const DEPARTMENTS = [
  "ฝ่ายบริหารงานวิชาการ",
  "ฝ่ายบริหารงานงบประมาณ",
  "ฝ่ายบริหารงานบุคคล",
  "ฝ่ายบริหารงานทั่วไป",
  "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
  "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
  "กลุ่มสาระการเรียนรู้ภาษาไทย",
  "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
  "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม",
  "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา",
  "กลุ่มสาระการเรียนรู้ศิลปะ",
  "กลุ่มสาระการเรียนรู้การงานอาชีพ",
  "กิจกรรมพัฒนาผู้เรียน",
];

export default function BudgetAffairsPage() {
  const [isPending, startTransition] = useTransition();
  const [fiscalYears, setFiscalYears] = useState<Array<{ id: string; year: number; title: string; status: string }>>([]);
  const [selectedFyId, setSelectedFyId] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [users, setUsers] = useState<Array<any>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedTrancheForDeposit, setSelectedTrancheForDeposit] = useState<any>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedProjectForActivity, setSelectedProjectForActivity] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedAllocationForExpense, setSelectedAllocationForExpense] = useState<any>(null);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedExpenseForReversal, setSelectedExpenseForReversal] = useState<any>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedProjectForAttach, setSelectedProjectForAttach] = useState<any>(null);

  // Form States
  const [depositForm, setDepositForm] = useState({
    amount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    documentRef: "",
    bankStatement: "",
    notes: "",
  });

  const [projectForm, setProjectForm] = useState({
    code: "",
    name: "",
    departmentName: DEPARTMENTS[0],
    leaderUserId: "",
    targetAcademicYear: 2569,
    allocatedAmount: "",
    attachmentUrl: "",
  });

  const [activityForm, setActivityForm] = useState({
    activityNo: 1,
    name: "",
    responsibleUserId: "",
    allocatedAmount: "",
    trancheAllocations: [] as Array<{ budgetTrancheId: string; allocatedAmount: string }>,
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    receiptNo: "",
  });

  const [reverseReason, setReverseReason] = useState("");
  const [attachForm, setAttachForm] = useState({
    originalFileName: "",
    objectKey: "",
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Initialize and load data
  const loadInitialData = async () => {
    startTransition(async () => {
      // 1. Fetch Fiscal Years
      const fyRes = await getFiscalYearsListAction();
      let activeFyId = "";
      if (fyRes.success && fyRes.data && fyRes.data.length > 0) {
        setFiscalYears(fyRes.data);
        activeFyId = fyRes.data[0].id;
        setSelectedFyId(activeFyId);
      } else {
        // Seed default 2569
        const seedRes = await ensureDefaultFiscalYearAction(2569);
        if (seedRes.success && seedRes.data) {
          activeFyId = seedRes.data.id;
          setFiscalYears([{ id: seedRes.data.id, year: seedRes.data.year, title: seedRes.data.title, status: seedRes.data.status }]);
          setSelectedFyId(activeFyId);
        }
      }

      // 2. Fetch Users
      const usersRes = await getBudgetUsersAction();
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
        if (usersRes.data.length > 0) {
          setProjectForm((prev) => ({ ...prev, leaderUserId: usersRes.data[0].id }));
        }
      }

      // 3. Fetch Dashboard Metrics
      if (activeFyId) {
        const metricsRes = await getFiscalYearDashboardAction(activeFyId);
        if (metricsRes.success && metricsRes.data) {
          setDashboardData(metricsRes.data);
        }
      }
    });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshDashboard = async (fyId = selectedFyId) => {
    if (!fyId) return;
    setActionError(null);
    startTransition(async () => {
      const res = await getFiscalYearDashboardAction(fyId);
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else if (!res.success) {
        setActionError(res.error);
      }
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fyId = e.target.value;
    setSelectedFyId(fyId);
    refreshDashboard(fyId);
  };

  const toggleExpandProject = (projectId: string) => {
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  // --- Actions ---

  // 1. Confirm Deposit
  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrancheForDeposit) return;
    setActionError(null);

    const amountNum = parseFloat(depositForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError("กรุณากรอกจำนวนเงินที่มากกว่า 0 บาท");
      return;
    }

    const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;

    startTransition(async () => {
      const res = await confirmTrancheDepositAction({
        idempotencyKey,
        budgetTrancheId: selectedTrancheForDeposit.id,
        amount: amountNum,
        receivedDate: new Date(depositForm.receivedDate),
        documentRef: depositForm.documentRef || undefined,
        bankStatement: depositForm.bankStatement || undefined,
        notes: depositForm.notes || undefined,
      });

      if (res.success) {
        setShowDepositModal(false);
        setActionSuccess("บันทึกการรับเงินเข้าบัญชีเรียบร้อยแล้ว");
        setDepositForm({ amount: "", receivedDate: new Date().toISOString().split("T")[0], documentRef: "", bankStatement: "", notes: "" });
        await refreshDashboard();
      } else {
        setActionError(res.error);
      }
    });
  };

  // 2. Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const amountNum = parseFloat(projectForm.allocatedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError("กรุณากรอกวงเงินโครงการที่มากกว่า 0 บาท");
      return;
    }

    const targetSourceId = dashboardData?.budgetSources?.[0]?.id || dashboardData?.tranches?.[0]?.budgetSourceId;
    if (!dashboardData?.fiscalYear?.id || !targetSourceId) {
      setActionError("ไม่พบข้อมูลปีงบประมาณหรือแหล่งงบประมาณ");
      return;
    }

    startTransition(async () => {
      // Call create project action
      const res = await createProjectAction({
        fiscalYearId: selectedFyId,
        budgetSourceId: targetSourceId,
        departmentName: projectForm.departmentName,
        leaderUserId: projectForm.leaderUserId || users[0]?.id,
        code: projectForm.code.trim(),
        name: projectForm.name.trim(),
        targetAcademicYear: projectForm.targetAcademicYear,
        allocatedAmount: amountNum,
      });

      if (res.success) {
        // If attachment URL provided, attach it
        if (projectForm.attachmentUrl.trim() && res.data?.id) {
          await attachProjectFileAction({
            parentId: res.data.id,
            storageProvider: "GOOGLE_DRIVE_LINK",
            objectKey: projectForm.attachmentUrl.trim(),
            originalFileName: "เอกสารเล่มโครงการ (ลิงก์)",
          });
        }

        setShowProjectModal(false);
        setActionSuccess(`สร้างโครงการ "${projectForm.name}" สำเร็จ`);
        setProjectForm({
          code: "",
          name: "",
          departmentName: DEPARTMENTS[0],
          leaderUserId: users[0]?.id || "",
          targetAcademicYear: 2569,
          allocatedAmount: "",
          attachmentUrl: "",
        });
        await refreshDashboard();
      } else {
        setActionError(res.error);
      }
    });
  };

  // 3. Create Activity
  const openActivityModal = (project: any) => {
    setSelectedProjectForActivity(project);
    const nextNo = (project.activities?.length || 0) + 1;
    // Pre-fill tranche allocations with available tranches
    const defaultTranches = (dashboardData?.tranches || []).map((t: any) => ({
      budgetTrancheId: t.id,
      name: t.name,
      allocatedAmount: "",
    }));
    setActivityForm({
      activityNo: nextNo,
      name: "",
      responsibleUserId: project.leaderUser?.id || users[0]?.id || "",
      allocatedAmount: "",
      trancheAllocations: defaultTranches,
    });
    setShowActivityModal(true);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForActivity) return;
    setActionError(null);

    const totalAllocNum = parseFloat(activityForm.allocatedAmount);
    if (isNaN(totalAllocNum) || totalAllocNum <= 0) {
      setActionError("กรุณาระบุงบประมาณกิจกรรมที่มากกว่า 0 บาท");
      return;
    }

    const validTranches = activityForm.trancheAllocations
      .map((t) => ({
        budgetTrancheId: t.budgetTrancheId,
        allocatedAmount: parseFloat(t.allocatedAmount),
      }))
      .filter((t) => !isNaN(t.allocatedAmount) && t.allocatedAmount > 0);

    if (validTranches.length === 0) {
      setActionError("กรุณาระบุการจัดสรรงบประมาณลงในงวดเงินอย่างน้อย 1 งวด");
      return;
    }

    const sumTranches = validTranches.reduce((sum, t) => sum + t.allocatedAmount, 0);
    if (Math.abs(sumTranches - totalAllocNum) > 0.001) {
      setActionError(`ยอดรวมการจัดสรรในแต่ละงวด (${sumTranches.toLocaleString()} บ.) ไม่เท่ากับงบประมาณกิจกรรม (${totalAllocNum.toLocaleString()} บ.)`);
      return;
    }

    startTransition(async () => {
      const res = await createActivityAction({
        projectId: selectedProjectForActivity.id,
        responsibleUserId: activityForm.responsibleUserId || users[0]?.id,
        activityNo: activityForm.activityNo,
        name: activityForm.name.trim(),
        allocatedAmount: totalAllocNum,
        trancheAllocations: validTranches,
      });

      if (res.success) {
        setShowActivityModal(false);
        setActionSuccess(`เพิ่มกิจกรรม "${activityForm.name}" สำเร็จ`);
        await refreshDashboard();
      } else {
        setActionError(res.error);
      }
    });
  };

  // 4. Record Expense
  const openExpenseModal = (allocationId: string, activityName: string) => {
    setSelectedAllocationForExpense({ id: allocationId, activityName });
    setExpenseForm({
      title: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      receiptNo: "",
    });
    setShowExpenseModal(true);
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationForExpense) return;
    setActionError(null);

    const amountNum = parseFloat(expenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError("กรุณากรอกยอดเบิกจ่ายที่มากกว่า 0 บาท");
      return;
    }

    const idempotencyKey = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;

    startTransition(async () => {
      const res = await recordAndApproveExpenseAction({
        idempotencyKey,
        allocationId: selectedAllocationForExpense.id,
        title: expenseForm.title.trim(),
        amount: amountNum,
        expenseDate: new Date(expenseForm.expenseDate),
        receiptNo: expenseForm.receiptNo.trim() || undefined,
      });

      if (res.success) {
        setShowExpenseModal(false);
        setActionSuccess(`บันทึกการเบิกจ่าย "${expenseForm.title}" จำนวน ${amountNum.toLocaleString()} บ. สำเร็จ`);
        await refreshDashboard();
      } else {
        setActionError(res.error);
      }
    });
  };

  // 5. Reverse Expense
  const handleReverseExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseForReversal) return;
    setActionError(null);

    if (reverseReason.trim().length < 5) {
      setActionError("กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร");
      return;
    }

    startTransition(async () => {
      const res = await reverseExpenseAction({
        originalExpenseId: selectedExpenseForReversal.id,
        reason: reverseReason.trim(),
      });

      if (res.success) {
        setShowReverseModal(false);
        setReverseReason("");
        setActionSuccess("ยกเลิกรายการเบิกจ่ายและคืนยอดงบประมาณสำเร็จ");
        await refreshDashboard();
      } else {
        setActionError(res.error);
      }
    });
  };

  // Filter projects
  const filteredProjects = (dashboardData?.projects || []).filter((p: any) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.departmentName && p.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDeptFilter === "ALL" || p.departmentName === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <Link href="/dashboard" className="hover:underline">หน้าหลัก</Link>
            <span>/</span>
            <span>ฝ่ายบริหารงานงบประมาณ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Wallet className="w-7 h-7" />
            </div>
            ระบบบริหารงบประมาณ & แผนงานโครงการ
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            โรงเรียนกุดจับประชาสรรค์ — บัญชีคุมงวดเงิน 70%/30% และติดตามงบโครงการแบบเรียลไทม์
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedFyId}
              onChange={handleYearChange}
              className="text-xs font-bold bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id} className="dark:bg-slate-900">
                  {fy.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => refreshDashboard()}
            disabled={isPending}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            สร้างโครงการใหม่
          </button>
        </div>
      </div>

      {/* Notifications Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Grand Metric Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">งบประมาณตามแผน</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
            ฿{(dashboardData?.metrics?.totalPlanned || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">รวมทั้งปีงบประมาณ</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">เงินโอนเข้าบัญชีจริง</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400">
            ฿{(dashboardData?.metrics?.totalReceived || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">จาก สพฐ. / ต้นสังกัด</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">จัดสรรให้โครงการ</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg md:text-xl font-black text-purple-600 dark:text-purple-400">
            ฿{(dashboardData?.metrics?.totalAllocatedToProjects || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">ทุกโครงการรวมกัน</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">เบิกจ่ายจริงสุทธิ</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg md:text-xl font-black text-rose-600 dark:text-rose-400">
            ฿{(dashboardData?.metrics?.totalSpent || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">หักยอดคืนเงินแล้ว</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg shadow-emerald-600/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="text-[11px] font-semibold">สภาพคล่องในคลัง</span>
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-lg md:text-xl font-black">
            ฿{(dashboardData?.metrics?.netLiquidity || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-100 font-medium">เงินเข้าลบเงินจ่ายจริง</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">เงินรับเข้ายังไม่จัดสรร</span>
            <PieChart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg md:text-xl font-black text-amber-600 dark:text-amber-400">
            ฿{(dashboardData?.metrics?.remainingUnallocatedInflow || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">พร้อมตั้งโครงการใหม่</p>
        </div>
      </div>

      {/* 2. 4 Tranche Inflow Monitor (งวดเงิน 70%/30% ภาคเรียนที่ 1 และ 2) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            การจัดสรรงบประมาณ 4 งวด (รอบ 70% / 30% ประจำภาคเรียนที่ 1 และ 2)
          </h2>
          <span className="text-xs text-slate-500">เจ้าหน้าที่การเงินกด &quot;ยืนยันเงินเข้าบัญชี&quot; เมื่อมีเงินเข้าจริง</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(dashboardData?.tranches || []).map((tranche: any) => {
            const receivedPct = tranche.plannedAmount > 0 ? (tranche.receivedAmount / tranche.plannedAmount) * 100 : 0;
            const spentPct = tranche.receivedAmount > 0 ? (tranche.spentAmount / tranche.receivedAmount) * 100 : 0;

            return (
              <div
                key={tranche.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      งวดที่ {tranche.trancheNo}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        tranche.status === "RECEIVED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : tranche.status === "PARTIAL"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {tranche.status === "RECEIVED" ? "โอนเข้าครบแล้ว" : tranche.status === "PARTIAL" ? "โอนเข้าบางส่วน" : "รอยืนยันเงินเข้า"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{tranche.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">ปีการศึกษา {tranche.academicYear} ภาคเรียนที่ {tranche.semester}</p>

                  {/* Financial Breakdown */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>แผนจัดสรร:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">฿{tranche.plannedAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>เงินเข้าบัญชีจริง:</span>
                      <span className="font-black">฿{tranche.receivedAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>จัดสรรให้กิจกรรม:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">฿{tranche.allocatedAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>เบิกจ่ายไปแล้ว:</span>
                      <span className="font-bold">฿{tranche.spentAmount.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>สภาพคล่องคงเหลืองวด:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">฿{tranche.remainingLiquidity.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>เงินเข้า ({receivedPct.toFixed(0)}%)</span>
                      <span>ใช้ไป ({spentPct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div style={{ width: `${Math.min(receivedPct, 100)}%` }} className="bg-emerald-500 h-full" />
                    </div>
                  </div>
                </div>

                {/* Confirm Receipt Button */}
                <button
                  onClick={() => {
                    setSelectedTrancheForDeposit(tranche);
                    setShowDepositModal(true);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ยืนยันเงินเข้าบัญชี
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Projects & Activities Master Ledger */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              แผนงานโครงการและกิจกรรมย่อย (Projects & Activities Ledger)
            </h2>
            <p className="text-xs text-slate-500">
              ติดตามงบประมาณที่ได้รับจัดสรร, ยอดเบิกจ่ายจริงรายกิจกรรม และยอดคงเหลือแต่ละโครงการ
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโครงการ, รหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 w-48 md:w-64"
              />
            </div>

            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="py-2 px-3 text-xs font-medium rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="ALL">ทุกฝ่ายงาน / กลุ่มสาระฯ</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">ยังไม่มีโครงการในหมวดนี้</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                กดปุ่ม &quot;สร้างโครงการใหม่&quot; เพื่อเริ่มต้นตั้งแผนงานโครงการประจำปีงบประมาณ 2569
              </p>
              <button
                onClick={() => setShowProjectModal(true)}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> สร้างโครงการใหม่
              </button>
            </div>
          ) : (
            filteredProjects.map((project: any) => {
              const isExpanded = expandedProjects[project.id] !== false; // Default expanded
              const spentPct = project.allocatedAmount > 0 ? (project.spentAmount / project.allocatedAmount) * 100 : 0;

              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
                >
                  {/* Project Header Row */}
                  <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black">
                          {project.code}
                        </span>
                        {project.departmentName && (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            {project.departmentName}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">ปีการศึกษา {project.targetAcademicYear}</span>
                      </div>

                      <h3 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white">
                        {project.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          หัวหน้าโครงการ: <strong className="text-slate-700 dark:text-slate-200">{project.leaderUser?.name || "ไม่ระบุ"}</strong>
                        </span>

                        {/* Attachments */}
                        {project.attachments?.map((att: any) => (
                          <a
                            key={att.id}
                            href={att.objectKey}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {att.originalFileName}
                          </a>
                        ))}

                        <button
                          onClick={() => {
                            setSelectedProjectForAttach(project);
                            setShowAttachModal(true);
                          }}
                          className="text-[11px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 underline"
                        >
                          <Paperclip className="w-3 h-3" /> แนบลิงก์ไฟล์
                        </button>
                      </div>
                    </div>

                    {/* Project Financial Summary & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="grid grid-cols-3 gap-3 bg-white dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center min-w-[320px]">
                        <div>
                          <p className="text-[10px] text-slate-400">งบจัดสรร</p>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            ฿{project.allocatedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-rose-500">ใช้จ่ายแล้ว</p>
                          <p className="text-xs font-black text-rose-600 dark:text-rose-400">
                            ฿{project.spentAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-500">คงเหลือสุทธิ</p>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            ฿{project.remainingAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openActivityModal(project)}
                          className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่มกิจกรรม
                        </button>

                        <button
                          onClick={() => toggleExpandProject(project.id)}
                          className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Activities List */}
                  {isExpanded && (
                    <div className="p-5 md:p-6 space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>รายการกิจกรรมย่อย ({project.activities?.length || 0} กิจกรรม)</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">เบิกจ่ายแล้ว {spentPct.toFixed(1)}%</span>
                          <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div style={{ width: `${Math.min(spentPct, 100)}%` }} className="bg-emerald-500 h-full" />
                          </div>
                        </div>
                      </div>

                      {project.activities?.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                          ยังไม่มีกิจกรรมย่อยในโครงการนี้ กดปุ่ม &quot;+ เพิ่มกิจกรรม&quot; เพื่อระบุงวดเงินและผู้รับผิดชอบ
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                          {project.activities.map((act: any) => (
                            <div
                              key={act.id}
                              className="p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center">
                                    {act.activityNo}
                                  </span>
                                  <h4 className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-100">
                                    {act.name}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-400 pl-8">
                                  ผู้รับผิดชอบ: <strong className="text-slate-600 dark:text-slate-300">{act.responsibleUser?.name || "ไม่ระบุ"}</strong>
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pl-8 md:pl-0">
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-400">งบจัดสรร</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">฿{act.allocatedAmount.toLocaleString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-rose-500">ใช้ไปแล้ว</p>
                                    <p className="font-bold text-rose-600 dark:text-rose-400">฿{act.spentAmount.toLocaleString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-emerald-500">คงเหลือ</p>
                                    <p className="font-black text-emerald-600 dark:text-emerald-400">฿{act.remainingAmount.toLocaleString()}</p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => openExpenseModal(act.id, act.name)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> เบิกจ่าย
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 1. Confirm Deposit Modal */}
      {showDepositModal && selectedTrancheForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                ยืนยันเงินโอนเข้าบัญชีจริง
              </h3>
              <button onClick={() => setShowDepositModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeposit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">งวดเงินเป้าหมาย</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedTrancheForDeposit.name} (แผนจัดสรร ฿${selectedTrancheForDeposit.plannedAmount.toLocaleString()})`}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">จำนวนเงินที่โอนเข้าจริง (บาท) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="เช่น 420000"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">วันที่เงินเข้าบัญชี *</label>
                <input
                  type="date"
                  required
                  value={depositForm.receivedDate}
                  onChange={(e) => setDepositForm({ ...depositForm, receivedDate: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">เลขที่หนังสือ / หนังสือแจ้งจัดสรร</label>
                <input
                  type="text"
                  placeholder="เช่น ศธ 0400/1234"
                  value={depositForm.documentRef}
                  onChange={(e) => setDepositForm({ ...depositForm, documentRef: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">บันทึกเพิ่มเติม / ลิงก์สเตทเมนต์</label>
                <textarea
                  rows={2}
                  placeholder="บันทึกช่วยจำ..."
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {isPending ? "กำลังบันทึก..." : "ยืนยันเงินเข้า"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                สร้างแผนงานโครงการใหม่
              </h3>
              <button onClick={() => setShowProjectModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">รหัสโครงการ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น PRJ-2569-001"
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">ปีการศึกษาเป้าหมาย</label>
                  <input
                    type="number"
                    required
                    value={projectForm.targetAcademicYear}
                    onChange={(e) => setProjectForm({ ...projectForm, targetAcademicYear: parseInt(e.target.value) || 2569 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">ชื่อโครงการตามแผนปฏิบัติการ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น โครงการพัฒนาคุณภาพการจัดการเรียนรู้วิทยาศาสตร์"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">ฝ่ายงาน / กลุ่มสาระฯ</label>
                  <select
                    value={projectForm.departmentName}
                    onChange={(e) => setProjectForm({ ...projectForm, departmentName: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">หัวหน้าโครงการ *</label>
                  <select
                    value={projectForm.leaderUserId}
                    onChange={(e) => setProjectForm({ ...projectForm, leaderUserId: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} {u.position ? `(${u.position})` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">วงเงินงบประมาณโครงการ (บาท) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="เช่น 50000"
                  value={projectForm.allocatedAmount}
                  onChange={(e) => setProjectForm({ ...projectForm, allocatedAmount: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base text-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">ลิงก์ไฟล์เล่มโครงการ (Google Drive / PDF)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={projectForm.attachmentUrl}
                  onChange={(e) => setProjectForm({ ...projectForm, attachmentUrl: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {isPending ? "กำลังบันทึก..." : "สร้างโครงการ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Activity Modal */}
      {showActivityModal && selectedProjectForActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  เพิ่มกิจกรรมย่อย
                </h3>
                <p className="text-[11px] text-slate-400">โครงการ: {selectedProjectForActivity.name}</p>
              </div>
              <button onClick={() => setShowActivityModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ลำดับที่</label>
                  <input
                    type="number"
                    required
                    value={activityForm.activityNo}
                    onChange={(e) => setActivityForm({ ...activityForm, activityNo: parseInt(e.target.value) || 1 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ชื่อกิจกรรม *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น กิจกรรมอบรมเชิงปฏิบัติการ AI ครู"
                    value={activityForm.name}
                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">ผู้รับผิดชอบกิจกรรม</label>
                  <select
                    value={activityForm.responsibleUserId}
                    onChange={(e) => setActivityForm({ ...activityForm, responsibleUserId: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">งบประมาณกิจกรรม (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="เช่น 20000"
                    value={activityForm.allocatedAmount}
                    onChange={(e) => setActivityForm({ ...activityForm, allocatedAmount: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* Tranche Allocation Split */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>จัดสรรลงงวดเงิน (70% / 30%) *</span>
                  <span className="text-[10px] text-slate-400">ระบุยอดเงินที่ใช้ในแต่ละงวด</span>
                </label>

                <div className="space-y-2">
                  {activityForm.trancheAllocations.map((t, idx) => (
                    <div key={t.budgetTrancheId} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 w-1/2 truncate">
                        {(t as any).name || `งวดที่ ${idx + 1}`}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={t.allocatedAmount}
                        onChange={(e) => {
                          const updated = [...activityForm.trancheAllocations];
                          updated[idx].allocatedAmount = e.target.value;
                          setActivityForm({ ...activityForm, trancheAllocations: updated });
                        }}
                        className="w-1/2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {isPending ? "กำลังบันทึก..." : "เพิ่มกิจกรรม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Record Expense Modal */}
      {showExpenseModal && selectedAllocationForExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  บันทึกรายการเบิกจ่ายเงิน
                </h3>
                <p className="text-[11px] text-slate-400">กิจกรรม: {selectedAllocationForExpense.activityName}</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">รายการค่าใช้จ่าย / ใบสั่งซื้อ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าจัดซื้อวัสดุอุปกรณ์ทดลอง"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">จำนวนเงินที่เบิกจ่าย (บาท) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="เช่น 3500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base text-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">วันที่เบิกจ่าย *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">เลขที่ใบเสร็จ / อ้างอิง</label>
                  <input
                    type="text"
                    placeholder="เช่น RC-6901"
                    value={expenseForm.receiptNo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receiptNo: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {isPending ? "กำลังบันทึก..." : "บันทึกการเบิกจ่าย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Attach Link Modal */}
      {showAttachModal && selectedProjectForAttach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-emerald-600" />
              แนบลิงก์เอกสารโครงการ
            </h3>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">ชื่อเอกสาร</label>
              <input
                type="text"
                placeholder="เช่น เล่มโครงการฉบับอนุมัติ"
                value={attachForm.originalFileName}
                onChange={(e) => setAttachForm({ ...attachForm, originalFileName: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">URL ลิงก์ (Google Drive / Cloud)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={attachForm.objectKey}
                onChange={(e) => setAttachForm({ ...attachForm, objectKey: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="w-1/2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!attachForm.objectKey.trim()) return;
                  await attachProjectFileAction({
                    parentId: selectedProjectForAttach.id,
                    storageProvider: "GOOGLE_DRIVE_LINK",
                    objectKey: attachForm.objectKey.trim(),
                    originalFileName: attachForm.originalFileName.trim() || "เอกสารแนบโครงการ",
                  });
                  setShowAttachModal(false);
                  await refreshDashboard();
                }}
                className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                บันทึกลิงก์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
