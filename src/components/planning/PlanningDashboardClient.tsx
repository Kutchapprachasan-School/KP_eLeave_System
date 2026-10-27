"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PlanningDashboardPayload,
  softDeleteActivityAction,
  softDeleteProjectAction,
} from "@/actions/planning/project-actions";
import { calculatePortfolioSummary } from "@/lib/planning/calculator";
import {
  ActivityExpenseDTO,
  DepartmentDTO,
  PortfolioSummaryDTO,
  ProjectActivityDTO,
  ProjectDTO,
  SimpleUserDTO,
} from "@/lib/planning/types";
import { FinancialMetricCards } from "./FinancialMetricCards";
import { PlanningFilterToolbar } from "./PlanningFilterToolbar";
import { ProjectLedgerTable } from "./ProjectLedgerTable";
import { Landmark, Calendar, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast-provider";

// Modals from Phase 4
import { ProjectFormModal } from "./modals/ProjectFormModal";
import { ActivityFormModal } from "./modals/ActivityFormModal";
import { AttachmentManagerModal } from "./modals/AttachmentManagerModal";
import { ExpenseFormModal } from "./modals/ExpenseFormModal";
import { ExpenseHistoryDrawer } from "./modals/ExpenseHistoryDrawer";
import { ConfirmDialog } from "./modals/ConfirmDialog";

export type ActivePlanningModalState =
  | { type: "CREATE_PROJECT" }
  | { type: "EDIT_PROJECT"; project: ProjectDTO }
  | { type: "CREATE_ACTIVITY"; project: ProjectDTO }
  | {
      type: "EDIT_ACTIVITY";
      project: ProjectDTO;
      activity: ProjectActivityDTO;
    }
  | { type: "ATTACHMENTS"; project: ProjectDTO }
  | {
      type: "RECORD_EXPENSE";
      project: ProjectDTO;
      activity: ProjectActivityDTO;
    }
  | {
      type: "SETTLE_EXPENSE";
      project: ProjectDTO;
      activity: ProjectActivityDTO;
      expense: ActivityExpenseDTO;
    }
  | {
      type: "EXPENSE_HISTORY";
      project: ProjectDTO;
      activity: ProjectActivityDTO;
    }
  | null;

export interface PlanningDashboardClientProps {
  initialData?: PlanningDashboardPayload;
  selectedFiscalYear?: number;
  // Two-way backwards compatibility props
  initialProjects?: ProjectDTO[];
  initialSummary?: PortfolioSummaryDTO;
  departments?: DepartmentDTO[] | Array<{ id: string; name: string }>;
  users?: SimpleUserDTO[] | Array<{ id: string; name: string; position?: string | null }>;
  currentUserId?: string;
  canManageBudget?: boolean;
  defaultFiscalYear?: number;
  availableFiscalYears?: number[];
}

export function PlanningDashboardClient({
  initialData,
  selectedFiscalYear,
  initialProjects,
  initialSummary,
  departments: propDepartments,
  users: propUsers,
  currentUserId: propCurrentUserId,
  canManageBudget: propCanManageBudget,
  defaultFiscalYear,
  availableFiscalYears: propAvailableFiscalYears,
}: PlanningDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Resolve data from either initialData or direct props
  const projects = initialData?.projects || initialProjects || [];
  const departments = (initialData?.departments || propDepartments || []) as DepartmentDTO[];
  const teachers = (initialData?.teachers || propUsers || []) as SimpleUserDTO[];
  const currentUserId = initialData?.currentUserId || propCurrentUserId || "";
  const canManageProjectsAndBudget =
    initialData?.modulePermissions?.canManageProjectsAndBudget ?? propCanManageBudget ?? false;
  const canAdjustBudget =
    initialData?.modulePermissions?.canAdjustBudget ?? canManageProjectsAndBudget;
  const canRecordAndSettleExpenses =
    initialData?.modulePermissions?.canRecordAndSettleExpenses ?? canManageProjectsAndBudget;

  const currentFiscalYear =
    selectedFiscalYear ||
    defaultFiscalYear ||
    (new Date().getMonth() >= 9
      ? new Date().getFullYear() + 543 + 1
      : new Date().getFullYear() + 543);

  // ==========================================
  // 1. Filter & Search States
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("ALL");
  const [selectedBudgetSource, setSelectedBudgetSource] = useState("ALL");
  const [onlyMyProjects, setOnlyMyProjects] = useState(false);

  const { showToast } = useToast();

  // เริ่มต้นพับแถวโครงการทั้งหมดเพื่อลด Cognitive Load (ผู้ใช้สามารถกด "กางทั้งหมด" หรือคลิกดูทีละโครงการได้)
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set()
  );

  // State สำหรับควบคุมการเปิด Modals และ Drawers
  const [activeModal, setActiveModal] = useState<ActivePlanningModalState>(null);

  // State สำหรับควบคุม Accessible Confirm Dialog (ลบโครงการ / กิจกรรมย่อย)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: "PROJECT" | "ACTIVITY";
    id: string;
    title: string;
    description: string;
    isPending: boolean;
  }>({
    isOpen: false,
    type: "PROJECT",
    id: "",
    title: "",
    description: "",
    isPending: false,
  });

  // ==========================================
  // 2. Real-Time Filtering & Portfolio Calculation
  // ==========================================
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((prj) => {
      // กรองตามฝ่าย/กลุ่มสาระฯ
      if (selectedDepartmentId !== "ALL") {
        const prjDeptId = prj.department?.id || prj.departmentId;
        if (prjDeptId !== selectedDepartmentId) {
          return false;
        }
      }

      // กรองตามแหล่งงบประมาณ
      if (selectedBudgetSource !== "ALL") {
        const prjBudgetSource = prj.budgetSource || prj.budgetSourceType;
        if (prjBudgetSource !== selectedBudgetSource) {
          return false;
        }
      }

      // กรองเฉพาะโครงการ/กิจกรรมที่ฉันรับผิดชอบ
      if (onlyMyProjects) {
        const isLeader =
          prj.leader?.id === currentUserId || prj.leaderUserId === currentUserId;
        const isActivityResponsible = (prj.activities || []).some(
          (act) =>
            act.responsibleUser?.id === currentUserId ||
            act.responsibleUserId === currentUserId
        );
        if (!isLeader && !isActivityResponsible) {
          return false;
        }
      }

      // กรองตามคำค้นหา (รหัสโครงการ, ชื่อโครงการ, ชื่อหัวหน้า, ชื่อฝ่าย, ชื่อกิจกรรมย่อย, ชื่อผู้รับผิดชอบกิจกรรม)
      if (query.length > 0) {
        const leaderName = prj.leader?.name || prj.leaderUserName || "";
        const deptName = prj.department?.name || prj.departmentName || "";

        const matchProject =
          (prj.code && prj.code.toLowerCase().includes(query)) ||
          prj.name.toLowerCase().includes(query) ||
          leaderName.toLowerCase().includes(query) ||
          deptName.toLowerCase().includes(query);

        const matchActivity = (prj.activities || []).some((act) => {
          const respName =
            act.responsibleUser?.name || act.responsibleUserName || "";
          return (
            act.name.toLowerCase().includes(query) ||
            respName.toLowerCase().includes(query)
          );
        });

        if (!matchProject && !matchActivity) {
          return false;
        }
      }

      return true;
    });
  }, [
    projects,
    searchQuery,
    selectedDepartmentId,
    selectedBudgetSource,
    onlyMyProjects,
    currentUserId,
  ]);

  // คำนวณตัวเลขในกล่องสถิติ 4 กล่องด้านบนใหม่แบบ Real-time ตามรายการโครงการที่ผ่านตัวกรอง
  const dynamicSummary = useMemo(
    () => calculatePortfolioSummary(filteredProjects),
    [filteredProjects]
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedDepartmentId !== "ALL" ||
    selectedBudgetSource !== "ALL" ||
    onlyMyProjects;

  // ==========================================
  // 3. Event Handlers
  // ==========================================
  const handleFiscalYearChange = (newYear: number) => {
    startTransition(() => {
      router.push(`/planning?year=${newYear}`);
    });
  };

  const handleToggleExpand = (projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedProjectIds(new Set(filteredProjects.map((p) => p.id)));
  };

  const handleCollapseAll = () => {
    setExpandedProjectIds(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDepartmentId("ALL");
    setSelectedBudgetSource("ALL");
    setOnlyMyProjects(false);
  };

  const handleDeleteProject = (project: ProjectDTO) => {
    setDeleteConfirmState({
      isOpen: true,
      type: "PROJECT",
      id: project.id,
      title: "ยืนยันการลบโครงการ",
      description: `คุณต้องการลบ "${project.code}: ${project.name}" หรือไม่? ข้อมูลจะถูกเก็บในรูปแบบ Soft Delete เพื่อรักษาประวัติตรวจสอบ`,
      isPending: false,
    });
  };

  const handleDeleteActivity = (
    project: ProjectDTO,
    activity: ProjectActivityDTO
  ) => {
    setDeleteConfirmState({
      isOpen: true,
      type: "ACTIVITY",
      id: activity.id,
      title: "ยืนยันการลบกิจกรรมย่อย",
      description: `คุณต้องการลบกิจกรรมที่ ${activity.activityNo} "${activity.name}" ภายใต้โครงการ ${project.code} หรือไม่?`,
      isPending: false,
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmState((prev) => ({ ...prev, isPending: true }));
    try {
      if (deleteConfirmState.type === "PROJECT") {
        const res = await softDeleteProjectAction(deleteConfirmState.id);
        if (!res.success) {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการลบโครงการ");
          return;
        }
        showToast("success", "ลบโครงการเรียบร้อยแล้ว");
      } else {
        const res = await softDeleteActivityAction(deleteConfirmState.id);
        if (!res.success) {
          showToast("error", res.error || "เกิดข้อผิดพลาดในการลบกิจกรรมย่อย");
          return;
        }
        showToast("success", "ลบกิจกรรมย่อยเรียบร้อยแล้ว");
      }
      setDeleteConfirmState({
        isOpen: false,
        type: "PROJECT",
        id: "",
        title: "",
        description: "",
        isPending: false,
      });
      router.refresh();
    } catch (err: any) {
      showToast("error", err?.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setDeleteConfirmState((prev) => ({ ...prev, isPending: false }));
    }
  };

  const handleExportExcel = async () => {
    try {
      const { exportPlanningToExcel } = await import(
        "@/lib/planning/export-excel"
      );
      await exportPlanningToExcel(filteredProjects, currentFiscalYear);
      showToast("success", "ส่งออกไฟล์ Excel สำเร็จเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error("Failed to export planning to Excel:", err);
      showToast(
        "error",
        err?.message || "ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง"
      );
    }
  };

  // รายการตัวเลือกปีงบประมาณ
  const fiscalYearOptions = propAvailableFiscalYears || [
    currentFiscalYear - 2,
    currentFiscalYear - 1,
    currentFiscalYear,
    currentFiscalYear + 1,
    currentFiscalYear + 2,
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* ส่วนหัวหน้าจอ (Header & Fiscal Year Selector) */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-blue-600 p-3 text-white shadow-xs">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              ระบบแผนงานโครงการและติดตามงบประมาณ
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              บริหารแผนปฏิบัติการประจำปี ติดตามยอดใช้งบประมาณแบบ Real-time และจัดเก็บเอกสารประกันคุณภาพ (SAR)
            </p>
          </div>
        </div>

        {/* ส่วนตั้งค่าผู้รับผิดชอบ และตัวเลือกปีงบประมาณ */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {/* ปุ่มตั้งค่าผู้รับผิดชอบระบบ (สำหรับ Admin / Planning Officers) */}
          {canManageProjectsAndBudget && (
            <Link
              href="/settings?section=planning-settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
              title="ตั้งค่าผู้รับผิดชอบระบบแผนงาน ผู้แก้ไขวงเงิน และผู้ตัดยอดเบิกจ่าย"
            >
              <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>ตั้งค่าผู้รับผิดชอบ</span>
            </Link>
          )}

          {/* ตัวเลือกปีงบประมาณ */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <label
              htmlFor="fiscal-year-select"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              ปีงบประมาณ พ.ศ.
            </label>
            <select
              id="fiscal-year-select"
              value={currentFiscalYear}
              disabled={isPending}
              onChange={(e) => handleFiscalYearChange(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {fiscalYearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* กล่องสรุปสถานะการเงินรวม 4 กล่อง (Financial Metric Cards) */}
      <FinancialMetricCards summary={dynamicSummary} />

      {/* แถบเครื่องมือค้นหาและคัดกรอง (Filter Toolbar) */}
      <PlanningFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={setSelectedDepartmentId}
        selectedBudgetSource={selectedBudgetSource}
        onBudgetSourceChange={setSelectedBudgetSource}
        onlyMyProjects={onlyMyProjects}
        onOnlyMyProjectsChange={setOnlyMyProjects}
        departments={departments}
        canManageProjects={canManageProjectsAndBudget}
        onOpenCreateProject={() => setActiveModal({ type: "CREATE_PROJECT" })}
        onExportExcel={handleExportExcel}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* ตารางแผนงานและกิจกรรมย่อย (Hierarchical Ledger Table) */}
      <ProjectLedgerTable
        projects={filteredProjects}
        expandedProjectIds={expandedProjectIds}
        onToggleExpand={handleToggleExpand}
        onEditProject={(project) =>
          setActiveModal({ type: "EDIT_PROJECT", project })
        }
        onDeleteProject={handleDeleteProject}
        onAddActivity={(project) =>
          setActiveModal({ type: "CREATE_ACTIVITY", project })
        }
        onEditActivity={(project, activity) =>
          setActiveModal({ type: "EDIT_ACTIVITY", project, activity })
        }
        onDeleteActivity={handleDeleteActivity}
        onOpenAttachments={(project) =>
          setActiveModal({ type: "ATTACHMENTS", project })
        }
        onRecordExpense={(project, activity) =>
          setActiveModal({ type: "RECORD_EXPENSE", project, activity })
        }
        onOpenExpenseHistory={(project, activity) =>
          setActiveModal({ type: "EXPENSE_HISTORY", project, activity })
        }
      />

      {/* Modals & Drawers */}
      {activeModal?.type === "CREATE_PROJECT" && (
        <ProjectFormModal
          mode="CREATE"
          fiscalYear={currentFiscalYear}
          departments={departments}
          teachers={teachers}
          currentUserId={currentUserId}
          canAdjustBudget={canAdjustBudget}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            showToast("success", "สร้างโครงการใหม่สำเร็จ");
            router.refresh();
          }}
        />
      )}

      {activeModal?.type === "EDIT_PROJECT" && (
        <ProjectFormModal
          mode="EDIT"
          fiscalYear={currentFiscalYear}
          project={activeModal.project}
          departments={departments}
          teachers={teachers}
          currentUserId={currentUserId}
          canAdjustBudget={canAdjustBudget}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            showToast("success", "บันทึกการแก้ไขโครงการสำเร็จ");
            router.refresh();
          }}
        />
      )}

      {activeModal?.type === "CREATE_ACTIVITY" && (
        <ActivityFormModal
          mode="CREATE"
          project={activeModal.project}
          teachers={teachers}
          canAdjustBudget={canAdjustBudget}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            showToast("success", "สร้างกิจกรรมย่อยสำเร็จ");
            router.refresh();
          }}
        />
      )}

      {activeModal?.type === "EDIT_ACTIVITY" && (
        <ActivityFormModal
          mode="EDIT"
          project={activeModal.project}
          activity={activeModal.activity}
          teachers={teachers}
          canAdjustBudget={canAdjustBudget}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            showToast("success", "บันทึกการแก้ไขกิจกรรมย่อยสำเร็จ");
            router.refresh();
          }}
        />
      )}

      {activeModal?.type === "ATTACHMENTS" && (
        <AttachmentManagerModal
          project={activeModal.project}
          onClose={() => setActiveModal(null)}
          onUpdated={() => router.refresh()}
        />
      )}

      {activeModal?.type === "RECORD_EXPENSE" && (
        <ExpenseFormModal
          mode="RECORD"
          project={activeModal.project}
          activity={activeModal.activity}
          teachers={teachers}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            showToast("success", "บันทึกตัดยอดงบประมาณสำเร็จ");
            router.refresh();
          }}
        />
      )}

      {activeModal?.type === "SETTLE_EXPENSE" && (
        <ExpenseFormModal
          mode="SETTLE"
          project={activeModal.project}
          activity={activeModal.activity}
          settlingExpense={activeModal.expense}
          teachers={teachers}
          onClose={() =>
            setActiveModal({
              type: "EXPENSE_HISTORY",
              project: activeModal.project,
              activity: activeModal.activity,
            })
          }
          onSuccess={() => {
            setActiveModal(null);
            showToast("success", "ยืนยันการเบิกจ่ายจริงสำเร็จ");
            router.refresh();
          }}
        />
      )}

      {activeModal?.type === "EXPENSE_HISTORY" && (
        <ExpenseHistoryDrawer
          project={activeModal.project}
          activity={activeModal.activity}
          onClose={() => setActiveModal(null)}
          onOpenRecordNew={() =>
            setActiveModal({
              type: "RECORD_EXPENSE",
              project: activeModal.project,
              activity: activeModal.activity,
            })
          }
          onOpenSettleReserved={(expense) =>
            setActiveModal({
              type: "SETTLE_EXPENSE",
              project: activeModal.project,
              activity: activeModal.activity,
              expense,
            })
          }
          onUpdated={() => router.refresh()}
        />
      )}

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmState.isOpen}
        title={deleteConfirmState.title}
        description={deleteConfirmState.description}
        isPending={deleteConfirmState.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteConfirmState({
            isOpen: false,
            type: "PROJECT",
            id: "",
            title: "",
            description: "",
            isPending: false,
          })
        }
      />
    </div>
  );
}
