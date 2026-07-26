import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ข้อมูลส่วนตัว (Profile)",
  description: "จัดการข้อมูลส่วนตัว ประวัติการทำงาน และการตั้งค่าบัญชี",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
