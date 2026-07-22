"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export async function getAssignableTechniciansAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

    let caregiverIds: string[] = [];
    try {
      const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
      if (settings?.rolePermissions) {
        const parsed = JSON.parse(settings.rolePermissions);
        if (Array.isArray(parsed.repairCaregivers)) {
          caregiverIds = parsed.repairCaregivers;
        }
      }
    } catch (e) {
      console.error("Failed to parse repairCaregivers settings:", e);
    }

    const technicians = await prisma.user.findMany({
      where: {
        OR: [
          { id: { in: caregiverIds.length > 0 ? caregiverIds : ["__dummy__"] } },
          { role: "ADMIN" },
          { position: { in: ["ช่าง", "ผู้จัดการเรื่องระบบซ่อม", "แอดมิน"] } },
        ],
      },
      select: {
        id: true,
        name: true,
        position: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      technicians: JSON.parse(JSON.stringify(technicians)),
    };
  } catch (err: any) {
    console.error("getAssignableTechniciansAction error:", err);
    return { success: false, error: err?.message || "ดึงรายชื่อช่างไม่สำเร็จ", technicians: [] };
  }
}
