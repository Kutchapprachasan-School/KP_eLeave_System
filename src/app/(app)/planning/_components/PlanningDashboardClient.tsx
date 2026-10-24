"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FinancialMetricCards } from "./FinancialMetricCards";
import { PlanningFilterToolbar } from "./PlanningFilterToolbar";
import { ProjectLedgerTable } from "./ProjectLedgerTable";
import { ProjectFormModal } from "./modals/ProjectFormModal";
import { ActivityFormModal } from "./modals/ActivityFormModal";
import { AttachmentManagerModal } from "./modals/AttachmentManagerModal";
import { ExpenseFormModal } from "./modals/ExpenseFormModal";
import { ExpenseHistoryDrawer } from "./modals/ExpenseHistoryDrawer";
import { softDeleteProjectAction, softDeleteActivityAction } from "@/app/actions/planning-project";
import { computePortfolioSummary } from "@/lib/planning/serializers";
import { exportPlanningToExcel } from "@/lib/planning/export-excel";
import type { 
  ProjectDTO, 
  ProjectActivityDTO, 
  PortfolioSummaryDTO 
} from "@/lib/planning/types";

interface PlanningDashboardClientProps {
  initialProjects: ProjectDTO[];
  initialSummary: PortfolioSummaryDTO;
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; position?: string | null }>;
  currentUserId: string;
  canManageBudget: boolean;
  defaultFiscalYear: number;
  availableFiscalYears: number[];
}

export function PlanningDashboardClient({
  initialProjects,
  initialSummary,
  departments,
  users,
  currentUserId,
  canManageBudget,
  defaultFiscalYear,
  availableFiscalYears,
}: PlanningDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [fiscalYear, setFiscalYear] = useState<number>(defaultFiscalYear);
  const [departmentId, setDepartmentId] = useState<string>("ALL");
  const [budgetSource, setBudgetSource] = useState<string>("ALL");
  const [onlyMyResponsibilities, setOnlyMyResponsibilities] = useState(false);

  // Modals & Drawers State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectDTO | null>(null);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityParentProject, setActivityParentProject] = useState<ProjectDTO | null>(null);
  const [activityToEdit, setActivityToEdit] = useState<ProjectActivityDTO | null>(null);

  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentProject, setAttachmentProject] = useState<ProjectDTO | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseProject, setExpenseProject] = useState<ProjectDTO | null>(null);
  const [expenseActivity, setExpenseActivity] = useState<ProjectActivityDTO | null>(null);

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyProject, setHistoryProject] = useState<ProjectDTO | null>(null);
  const [historyActivity, setHistoryActivity] = useState<ProjectActivityDTO | null>(null);

  // Filtered Projects computation
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((p) => {
      // Fiscal Year filter
      if (p.fiscalYear !== fiscalYear) return false;

      // Department filter
      if (departmentId !== "ALL" && p.departmentId !== departmentId) return false;

      // Budget Source filter
      if (budgetSource !== "ALL" && p.budgetSourceType !== budgetSource) return false;

      // My Responsibilities filter
      if (onlyMyResponsibilities) {
        const isLeader = p.leaderUserId === currentUserId;
        const isActivityResponsible = (p.activities || []).some(
          (act) => act.responsibleUserId === currentUserId
        );
        if (!isLeader && !isActivityResponsible) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = p.code?.toLowerCase().includes(q);
        const nameMatch = p.name.toLowerCase().includes(q);
        const leaderMatch = p.leaderUserName?.toLowerCase().includes(q);
        const deptMatch = p.departmentName?.toLowerCase().includes(q);
        const actMatch = (p.activities || []).some(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.responsibleUserName?.toLowerCase().includes(q)
        );
        if (!codeMatch && !nameMatch && !leaderMatch && !deptMatch && !actMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialProjects,
    fiscalYear,
    departmentId,
    budgetSource,
    onlyMyResponsibilities,
    searchQuery,
    currentUserId,
  ]);

  // Dynamic Portfolio Summary based on filtered projects
  const activeSummary = useMemo(() => {
    return computePortfolioSummary(filteredProjects);
  }, [filteredProjects]);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Handlers for Project actions
  const handleOpenCreateProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: ProjectDTO) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (project: ProjectDTO) => {
    if (!confirm(`คุณต้องการลบโครงการ "${project.name}" ใช่หรือไม่?`)) return;
    startTransition(async () => {
      const res = await softDeleteProjectAction(project.id);
      if (res.success) {
        handleRefresh();
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการลบโครงการ");
      }
    });
  };

  // Handlers for Activity actions
  const handleOpenAddActivity = (project: ProjectDTO) => {
    setActivityParentProject(project);
    setActivityToEdit(null);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (project: ProjectDTO, activity: ProjectActivityDTO) => {
    setActivityParentProject(project);
    setActivityToEdit(activity);
    setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = (project: ProjectDTO, activity: ProjectActivityDTO) => {
    if (!confirm(`คุณต้องการลบกิจกรรม "${activity.name}" ใช่หรือไม่?`)) return;
    startTransition(async () => {
      const res = await softDeleteActivityAction(activity.id);
      if (res.success) {
        handleRefresh();
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการลบกิจกรรม");
      }
    });
  };

  // Handlers for Attachments
  const handleOpenAttachments = (project: ProjectDTO) => {
    setAttachmentProject(project);
    setIsAttachmentModalOpen(true);
  };

  // Handlers for Expenses
  const handleOpenRecordExpense = (project: ProjectDTO, activity: ProjectActivityDTO) => {
    setExpenseProject(project);
    setExpenseActivity(activity);
    setIsExpenseModalOpen(true);
  };

  const handleOpenExpenseHistory = (project: ProjectDTO, activity: ProjectActivityDTO) => {
    setHistoryProject(project);
    setHistoryActivity(activity);
    setIsHistoryDrawerOpen(true);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    exportPlanningToExcel(filteredProjects, fiscalYear);
  };

  return (
    <div className="space-y-6">
      {/* 4 Financial Metric Cards */}
      <FinancialMetricCards summary={activeSummary} />

      {/* Filter and Action Toolbar */}
      <PlanningFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        fiscalYear={fiscalYear}
        onFiscalYearChange={setFiscalYear}
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
        budgetSource={budgetSource}
        onBudgetSourceChange={setBudgetSource}
        onlyMyResponsibilities={onlyMyResponsibilities}
        onToggleMyResponsibilities={() => setOnlyMyResponsibilities(!onlyMyResponsibilities)}
        onExportExcel={handleExportExcel}
        onCreateProject={handleOpenCreateProject}
        canManageBudget={canManageBudget}
        departments={departments}
        availableFiscalYears={availableFiscalYears}
      />

      {/* Hierarchical Project Ledger Table */}
      <ProjectLedgerTable
        projects={filteredProjects}
        canManageBudget={canManageBudget}
        currentUserId={currentUserId}
        onEditProject={handleOpenEditProject}
        onDeleteProject={handleDeleteProject}
        onManageAttachments={handleOpenAttachments}
        onAddActivity={handleOpenAddActivity}
        onEditActivity={handleOpenEditActivity}
        onDeleteActivity={handleDeleteActivity}
        onRecordExpense={handleOpenRecordExpense}
        onViewHistory={handleOpenExpenseHistory}
      />

      {/* Project Form Modal (Create / Edit) */}
      {isProjectModalOpen && (
        <ProjectFormModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSaved={handleRefresh}
          projectToEdit={projectToEdit}
          departments={departments}
          users={users}
          currentFiscalYear={fiscalYear}
        />
      )}

      {/* Activity Form Modal (Create / Edit) */}
      {isActivityModalOpen && activityParentProject && (
        <ActivityFormModal
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false);
            setActivityParentProject(null);
          }}
          onSaved={handleRefresh}
          projectId={activityParentProject.id}
          projectName={activityParentProject.name}
          activityToEdit={activityToEdit}
          users={users}
        />
      )}

      {/* Attachment Manager Modal */}
      {isAttachmentModalOpen && attachmentProject && (
        <AttachmentManagerModal
          isOpen={isAttachmentModalOpen}
          onClose={() => {
            setIsAttachmentModalOpen(false);
            setAttachmentProject(null);
          }}
          onSaved={handleRefresh}
          projectId={attachmentProject.id}
          projectName={attachmentProject.name}
          attachments={attachmentProject.attachments || []}
          canManageAttachments={
            canManageBudget || attachmentProject.leaderUserId === currentUserId
          }
        />
      )}

      {/* Record Expense Modal */}
      {isExpenseModalOpen && expenseProject && expenseActivity && (
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setExpenseProject(null);
            setExpenseActivity(null);
          }}
          onSaved={handleRefresh}
          projectName={expenseProject.name}
          activity={expenseActivity}
        />
      )}

      {/* Expense History Drawer */}
      {isHistoryDrawerOpen && historyProject && historyActivity && (
        <ExpenseHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => {
            setIsHistoryDrawerOpen(false);
            setHistoryProject(null);
            setHistoryActivity(null);
          }}
          onSaved={handleRefresh}
          projectName={historyProject.name}
          activity={historyActivity}
          canManageBudget={canManageBudget}
        />
      )}
    </div>
  );
}
