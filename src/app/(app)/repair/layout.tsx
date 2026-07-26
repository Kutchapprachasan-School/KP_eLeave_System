import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ระบบแจ้งซ่อมแซม",
  description: "ระบบแจ้งซ่อมแซมอาคารสถานที่และอุปกรณ์คอมพิวเตอร์",
};

export default function RepairLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
