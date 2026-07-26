import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ประวัติการลา",
  description: "ตรวจสอบประวัติการยื่นใบลาและสถานะคำขอลาทั้งหมด",
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
