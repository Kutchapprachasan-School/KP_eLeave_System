import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ลงเวลาปฏิบัติราชการ",
  description: "ระบบลงเวลาปฏิบัติราชการ สแกนใบหน้า และลงเวลาออนไลน์",
};

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
