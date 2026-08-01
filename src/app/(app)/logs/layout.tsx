import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "บันทึกประวัติระบบ",
  description: "บันทึกประวัติการใช้งานและกิจกรรมในระบบ",
};

export default function LogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
