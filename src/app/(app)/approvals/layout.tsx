import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "พิจารณาและอนุมัติการลา",
  description: "พิจารณาอนุมัติคำขอลาของบุคลากรในสังกัด",
};

export default function ApprovalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
