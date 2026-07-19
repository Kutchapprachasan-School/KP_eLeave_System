import { redirect } from "next/navigation";

export default function RepairDashboardRoute() {
  redirect("/dashboard?system=repair");
}
