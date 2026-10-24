/**
 * School Planning & Budget Tracking - Excel Export Utility
 * Module: src/lib/planning/export-excel.ts
 */

import * as XLSX from "xlsx";
import type { ProjectDTO } from "./types";

const CATEGORY_NAMES: Record<string, string> = {
  OPERATING: "ค่าใช้สอย",
  MATERIAL: "ค่าวัสดุ",
  REMUNERATION: "ค่าตอบแทน",
  EQUIPMENT: "ค่าครุภัณฑ์",
  UTILITY: "ค่าสาธารณูปโภค",
  MISCELLANEOUS: "เบ็ดเตล็ด",
};

const BUDGET_SOURCE_NAMES: Record<string, string> = {
  SUBSIDY: "เงินอุดหนุน",
  GENERAL_BUDGET: "งบประมาณแผ่นดิน",
  REVENUE: "เงินรายได้สถานศึกษา",
  SPECIAL_PROJECT: "โครงการพิเศษ",
  DONATION: "เงินบริจาค/ระดมทรัพยากร",
};

export function exportPlanningToExcel(projects: ProjectDTO[], fiscalYear: number) {
  // 1. Sheet 1: Project & Activity Financial Summary
  const summaryRows: any[] = [];

  let projSeq = 1;
  for (const proj of projects) {
    // Project Row
    summaryRows.push({
      "ระดับ": "โครงการ",
      "ลำดับ": projSeq++,
      "รหัสโครงการ": proj.code || "-",
      "ชื่อโครงการ/กิจกรรม": proj.name,
      "แหล่งเงิน": BUDGET_SOURCE_NAMES[proj.budgetSourceType] || proj.budgetSourceType,
      "กลุ่มงาน/กลุ่มสาระ": proj.departmentName || "-",
      "ผู้รับผิดชอบ": proj.leaderUserName || "-",
      "งบตั้งต้น (บาท)": proj.financials.allocatedAmount,
      "งบหลังปรับปรุง (บาท)": proj.financials.effectiveBudget,
      "เบิกจ่ายจริง (บาท)": proj.financials.paidAmount,
      "กันเงินไว้ (บาท)": proj.financials.reservedAmount,
      "คงเหลือสุทธิ (บาท)": proj.financials.remainingBalance,
      "ร้อยละการใช้ (%)": proj.financials.usagePercentage,
      "เล่มโครงการ": proj.financials.sarReadiness.hasProposal ? "มีเอกสาร" : "ไม่มี",
      "แบบขออนุมัติ": proj.financials.sarReadiness.hasApproval ? "มีเอกสาร" : "ไม่มี",
      "สรุปผล SAR": proj.financials.sarReadiness.hasSummary ? "มีเอกสาร" : "ไม่มี",
    });

    // Sub-activity Rows
    if (proj.activities && proj.activities.length > 0) {
      for (const act of proj.activities) {
        summaryRows.push({
          "ระดับ": "กิจกรรมย่อย",
          "ลำดับ": `${projSeq - 1}.${act.activityNo}`,
          "รหัสโครงการ": proj.code || "-",
          "ชื่อโครงการ/กิจกรรม": `  └─ ${act.name}`,
          "แหล่งเงิน": BUDGET_SOURCE_NAMES[proj.budgetSourceType] || proj.budgetSourceType,
          "กลุ่มงาน/กลุ่มสาระ": proj.departmentName || "-",
          "ผู้รับผิดชอบ": act.responsibleUserName || "-",
          "งบตั้งต้น (บาท)": act.financials.allocatedAmount,
          "งบหลังปรับปรุง (บาท)": act.financials.effectiveBudget,
          "เบิกจ่ายจริง (บาท)": act.financials.paidAmount,
          "กันเงินไว้ (บาท)": act.financials.reservedAmount,
          "คงเหลือสุทธิ (บาท)": act.financials.remainingBalance,
          "ร้อยละการใช้ (%)": act.financials.usagePercentage,
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
        expenseRows.push({
          "ลำดับ": expSeq++,
          "รหัสโครงการ": proj.code || "-",
          "ชื่อโครงการ": proj.name,
          "กิจกรรมย่อย": act.name,
          "วันที่ทำรายการ": new Date(exp.expenseDate).toLocaleDateString("th-TH"),
          "สถานะรายการ": exp.status === "PAID" ? "เบิกจ่ายจริง (PAID)" : "กันเงินงบประมาณ (RESERVED)",
          "หมวดค่าใช้จ่าย": CATEGORY_NAMES[exp.expenseCategory] || exp.expenseCategory,
          "รายละเอียดรายการ": exp.title,
          "ผู้ขอเบิก/ผู้รับเงิน": exp.requesterName || "-",
          "เลขที่เอกสาร/ใบเสร็จ": exp.receiptNo || "-",
          "จำนวนเงิน (บาท)": exp.amount,
          "ผู้บันทึก": exp.recordedByName || "-",
        });
      }
    }
  }

  // Create Workbook and Sheets
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปโครงการและกิจกรรม");

  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(wb, wsExpenses, "ประวัติการเบิกจ่ายเงิน");

  // Format date for filename
  const now = new Date();
  const dateStr = `${now.getFullYear() + 543}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const filename = `รายงานแผนและงบประมาณ_ปี${fiscalYear}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}
