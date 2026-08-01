"use server";

import { prisma } from "@/lib/db";

/**
 * ค้นหาอีเมลจริงในระบบจาก ID เข้าใช้งาน (Username) หรืออีเมลที่ผู้ใช้ป้อนเข้ามา
 * เพื่อเตรียมนำไปล็อกอินกับ Better Auth
 */
export async function resolveEmailForLogin(usernameOrEmail: string): Promise<string> {
  const identifier = usernameOrEmail.trim();

  // 1. ถ้ามีเครื่องหมาย @ แสดงว่าเป็นรูปแบบอีเมล ให้ส่งกลับไปเลย
  if (identifier.includes("@")) {
    return identifier;
  }

  // 2. ถ้าเป็น ID เข้าใช้งาน (ไม่มี @) ให้ค้นหาจากฟิลด์ username
  try {
    const user = await prisma.user.findUnique({
      where: { username: identifier },
      select: { email: true }
    });

    if (user && user.email) {
      return user.email;
    }
  } catch (error) {
    console.error("Error in resolveEmailForLogin:", error);
  }

  // 3. ถ้าหาไม่เจอในฐานข้อมูล ให้ส่งค่าเดิมกลับไปเพื่อให้ Better Auth จัดการ error ตามปกติ
  return identifier;
}
