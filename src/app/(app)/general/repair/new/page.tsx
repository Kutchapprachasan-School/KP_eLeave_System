import { Metadata } from "next";
import RepairNewPage from "@/app/(app)/repair/_components/RepairNewPage";

export const metadata: Metadata = {
  title: "แจ้งซ่อมใหม่ | งานบริหารทั่วไป",
  description: "กรอกรายละเอียดแจ้งซ่อม",
};

export default function GeneralNewRepairPage() {
  return <RepairNewPage />;
}
