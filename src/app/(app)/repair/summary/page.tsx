import { Metadata } from "next";
import RepairSummaryReportPage from "../_components/RepairSummaryReportPage";

export const metadata: Metadata = {
  title: "สรุปการดำเนินงานระบบแจ้งซ่อม",
  description: "รายงานสรุปผลการดำเนินงานแจ้งซ่อม รายเดือน รอบประเมิน และรายปี",
};

export default function RepairSummaryPage() {
  return <RepairSummaryReportPage />;
}
