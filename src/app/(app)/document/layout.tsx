import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ระบบงานสารบรรณ",
  description: "ขอออกเลขทะเบียนหนังสือส่ง บันทึกข้อความ คำสั่ง และตรวจสอบประวัติทะเบียนคุมหนังสือรับ-ส่ง",
};

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
