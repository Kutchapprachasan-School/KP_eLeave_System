import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ยื่นใบลาออนไลน์",
  description: "ยื่นใบลาออนไลน์ ลาป่วย ลากิจ ลาพักผ่อน",
};

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
