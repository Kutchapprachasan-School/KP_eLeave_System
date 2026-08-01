import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รายงานสรุปสถิติ",
  description: "สรุปรายงานสถิติการลา สถิติการแจ้งซ่อม และภาพรวมโรงเรียน",
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
