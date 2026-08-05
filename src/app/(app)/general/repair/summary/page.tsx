import { Metadata } from "next";
import RepairSummaryReportPage from "@/app/(app)/repair/_components/RepairSummaryReportPage";

export const metadata: Metadata = {
  title: "สรุปการดำเนินงานระบบแจ้งซ่อม | งานบริหารทั่วไป",
  description: "รายงานสรุปผลการดำเนินงานแจ้งซ่อม รายเดือน รอบประเมิน และรายปี",
};

export default function GeneralRepairSummaryPage() {
  return <RepairSummaryReportPage />;
}
