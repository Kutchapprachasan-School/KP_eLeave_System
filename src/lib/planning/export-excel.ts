/**
 * School Planning & Budget Tracking - Excel Export Utility
 * Module: src/lib/planning/export-excel.ts
 */

import * as XLSX from "xlsx";
import type { ProjectDTO } from "./types";
import { BUDGET_SOURCE_LABELS, EXPENSE_CATEGORY_LABELS } from "./types";

export function exportPlanningToExcel(projects: ProjectDTO[], fiscalYear: number) {
  // 1. Sheet 1: Project & Activity Financial Summary
  const summaryRows: any[] = [];

  let projSeq = 1;
  for (const proj of projects) {
    const bSourceKey = (proj.budgetSource || proj.budgetSourceType || "SUBSIDY") as keyof typeof BUDGET_SOURCE_LABELS;
    const bSourceName = BUDGET_SOURCE_LABELS[bSourceKey] || proj.budgetSourceName || bSourceKey;
    const deptName = proj.department?.name || proj.departmentName || "-";
    const leaderName = proj.leader?.name || proj.leaderUserName || "-";
    const sar = proj.financials?.sarReadiness || { hasProposal: false, hasApproval: false, hasSummary: false };

    // Project Row (Level 1)
    summaryRows.push({
      "ระดับ": "โครงการ",
      "ลำดับ": projSeq++,
      "รหัสโครงการ": proj.code || "-",
      "ชื่อโครงการ/กิจกรรม": proj.name,
      "แหล่งเงิน": bSourceName,
      "กลุ่มงาน/กลุ่มสาระ": deptName,
      "ผู้รับผิดชอบ": leaderName,
      "งบตั้งต้น (บาท)": proj.financials?.allocatedAmount ?? proj.allocatedAmount ?? 0,
      "งบหลังปรับปรุง (บาท)": proj.financials?.effectiveBudget ?? proj.adjustedAmount ?? 0,
      "เบิกจ่ายจริง (บาท)": proj.financials?.paidAmount ?? 0,
      "กันเงินไว้ (บาท)": proj.financials?.reservedAmount ?? 0,
      "คงเหลือสุทธิ (บาท)": proj.financials?.remainingBalance ?? 0,
      "ร้อยละการใช้ (%)": proj.financials?.usagePercentage ?? 0,
      "เล่มโครงการ": sar.hasProposal ? "มีเอกสาร" : "ไม่มี",
      "แบบขออนุมัติ": sar.hasApproval ? "มีเอกสาร" : "ไม่มี",
      "สรุปผล SAR": sar.hasSummary ? "มีเอกสาร" : "ไม่มี",
    });

    // Sub-activity Rows (Level 2)
    if (proj.activities && proj.activities.length > 0) {
      for (const act of proj.activities) {
        const actResponsibleName = act.responsibleUser?.name || act.responsibleUserName || "-";
        summaryRows.push({
          "ระดับ": "กิจกรรมย่อย",
          "ลำดับ": `${projSeq - 1}.${act.activityNo}`,
          "รหัสโครงการ": proj.code || "-",
          "ชื่อโครงการ/กิจกรรม": `  └─ ${act.name}`,
          "แหล่งเงิน": bSourceName,
          "กลุ่มงาน/กลุ่มสาระ": deptName,
          "ผู้รับผิดชอบ": actResponsibleName,
          "งบตั้งต้น (บาท)": act.financials?.allocatedAmount ?? act.allocatedAmount ?? 0,
          "งบหลังปรับปรุง (บาท)": act.financials?.effectiveBudget ?? act.adjustedAmount ?? 0,
          "เบิกจ่ายจริง (บาท)": act.financials?.paidAmount ?? 0,
          "กันเงินไว้ (บาท)": act.financials?.reservedAmount ?? 0,
          "คงเหลือสุทธิ (บาท)": act.financials?.remainingBalance ?? 0,
          "ร้อยละการใช้ (%)": act.financials?.usagePercentage ?? 0,
          "เล่มโครงการ": "-",
          "แบบขออนุมัติ": "-",
          "สรุปผล SAR": "-",
        });
      }
    }
  }

  // 2. Sheet 2: Expense Transactions Ledger
  const expenseRows: any[] = [];
  let expSeq = 1;

  for (const proj of projects) {
    for (const act of proj.activities || []) {
      for (const exp of act.expenses || []) {
        const catKey = exp.expenseCategory as keyof typeof EXPENSE_CATEGORY_LABELS;
        const catName = EXPENSE_CATEGORY_LABELS[catKey] || exp.expenseCategory;
        const reqName = exp.requester?.name || exp.requesterName || "-";
        const recName = exp.recordedBy?.name || exp.recordedByName || "-";

        expenseRows.push({
          "ลำดับ": expSeq++,
          "รหัสโครงการ": proj.code || "-",
          "ชื่อโครงการ": proj.name,
          "กิจกรรมย่อย": act.name,
          "วันที่ทำรายการ": new Date(exp.expenseDate).toLocaleDateString("th-TH"),
          "สถานะรายการ": exp.status === "PAID" ? "เบิกจ่ายจริง (PAID)" : exp.status === "RESERVED" ? "กันเงินงบประมาณ (RESERVED)" : "ยกเลิก (CANCELLED)",
          "หมวดค่าใช้จ่าย": catName,
          "รายละเอียดรายการ": exp.title,
          "ผู้ขอเบิก/ผู้รับเงิน": reqName,
          "เลขที่เอกสาร/ใบเสร็จ": exp.receiptNo || "-",
          "จำนวนเงิน (บาท)": exp.amount,
          "ผู้บันทึก": recName,
          "หมายเหตุ": exp.remark || "-",
        });
      }
    }
  }

  // Create Workbook and Sheets
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  if (summaryRows.length > 0) {
    wsSummary["!cols"] = [
      { wch: 12 }, // ระดับ
      { wch: 8 },  // ลำดับ
      { wch: 14 }, // รหัสโครงการ
      { wch: 35 }, // ชื่อโครงการ/กิจกรรม
      { wch: 22 }, // แหล่งเงิน
      { wch: 20 }, // กลุ่มงาน/กลุ่มสาระ
      { wch: 20 }, // ผู้รับผิดชอบ
      { wch: 16 }, // งบตั้งต้น
      { wch: 18 }, // งบหลังปรับปรุง
      { wch: 16 }, // เบิกจ่ายจริง
      { wch: 14 }, // กันเงินไว้
      { wch: 16 }, // คงเหลือสุทธิ
      { wch: 14 }, // ร้อยละการใช้
      { wch: 12 }, // เล่มโครงการ
      { wch: 12 }, // แบบขออนุมัติ
      { wch: 12 }, // สรุปผล SAR
    ];
  }
  XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปโครงการและกิจกรรม");

  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  if (expenseRows.length > 0) {
    wsExpenses["!cols"] = [
      { wch: 8 },  // ลำดับ
      { wch: 14 }, // รหัสโครงการ
      { wch: 28 }, // ชื่อโครงการ
      { wch: 28 }, // กิจกรรมย่อย
      { wch: 14 }, // วันที่ทำรายการ
      { wch: 24 }, // สถานะรายการ
      { wch: 16 }, // หมวดค่าใช้จ่าย
      { wch: 32 }, // รายละเอียดรายการ
      { wch: 20 }, // ผู้ขอเบิก/ผู้รับเงิน
      { wch: 20 }, // เลขที่เอกสาร/ใบเสร็จ
      { wch: 16 }, // จำนวนเงิน (บาท)
      { wch: 20 }, // ผู้บันทึก
      { wch: 25 }, // หมายเหตุ
    ];
  }
  XLSX.utils.book_append_sheet(wb, wsExpenses, "ประวัติการเบิกจ่ายเงิน");

  // Format date for filename
  const now = new Date();
  const dateStr = `${now.getFullYear() + 543}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const filename = `รายงานแผนและงบประมาณ_ปี${fiscalYear}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}
