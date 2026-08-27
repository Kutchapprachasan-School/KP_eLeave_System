import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ตั้งค่าระบบ",
  description: "จัดการและตั้งค่าระบบบริหารจัดการโรงเรียน",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
