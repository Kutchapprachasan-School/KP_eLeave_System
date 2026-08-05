import { Metadata } from "next";
import RepairListPage from "@/app/(app)/repair/_components/RepairListPage";

export const metadata: Metadata = {
  title: "ระบบแจ้งซ่อม | งานบริหารทั่วไป",
  description: "จัดการคำขอแจ้งซ่อมในโรงเรียน",
};

export default function GeneralRepairPage() {
  return <RepairListPage />;
}
