import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการข้อมูลบุคลากร",
  description: "จัดการทะเบียนข้อมูลครูและบุคลากรในโรงเรียน",
};

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
