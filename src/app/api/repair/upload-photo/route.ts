import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { RepairPhotoType } from "@prisma/client";
import { uploadRepairPhoto } from "@/services/photo.service";
import { findRepairById } from "@/repositories/repair.repository";
import { hasRepairPermission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const actor = {
      id: session.user.id,
      role: (session.user as any).role ?? "TEACHER",
      position: (session.user as any).position ?? null,
    };

    const formData = await req.formData();
    const repairId = formData.get("repairId") as string;
    const photoType = formData.get("photoType") as RepairPhotoType;
    const file = formData.get("file") as File;
    const countStr = formData.get("currentCount") as string;

    if (!repairId || !photoType || !file) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    if (!hasRepairPermission(actor, "repair:create") && !hasRepairPermission(actor, "repair:update")) {
      return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์อัปโหลดรูปภาพ" }, { status: 403 });
    }

    const repair = await findRepairById(repairId);
    if (!repair) {
      return NextResponse.json({ success: false, error: "ไม่พบรายการแจ้งซ่อม" }, { status: 444 });
    }

    const isTechnicianOrAdmin =
      hasRepairPermission(actor, "repair:update") ||
      repair.assigneeId === actor.id ||
      actor.role === "ADMIN" ||
      actor.position === "ช่าง";

    if (!isTechnicianOrAdmin && repair.requesterId !== actor.id) {
      return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์อัปโหลดรูปภาพในรายการของผู้อื่น" }, { status: 403 });
    }

    if (photoType === "AFTER" && !isTechnicianOrAdmin) {
      return NextResponse.json({ success: false, error: "เฉพาะช่างหรือผู้ได้รับมอบหมายเท่านั้นที่สามารถอัปโหลดรูปภาพ AFTER ได้" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const rawPhoto = await uploadRepairPhoto({
      repairId,
      photoType,
      fileBuffer: buffer,
      originalMimeType: file.type || "image/jpeg",
      uploadedById: actor.id,
      currentPhotoCount: parseInt(countStr ?? "0", 10),
    });

    return NextResponse.json({
      success: true,
      photo: JSON.parse(JSON.stringify(rawPhoto)),
    });
  } catch (err: any) {
    console.error("POST /api/repair/upload-photo error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "อัปโหลดรูปภาพไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
