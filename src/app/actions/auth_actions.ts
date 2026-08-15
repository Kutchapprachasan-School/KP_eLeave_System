"use server";

import { prisma } from "@/lib/db";

/**
 * ค้นหาอีเมลจริงในระบบจาก ID เข้าใช้งาน (Username) หรืออีเมลที่ผู้ใช้ป้อนเข้ามา
 * เพื่อเตรียมนำไปล็อกอินกับ Better Auth
 */
export async function resolveEmailForLogin(usernameOrEmail: string): Promise<string> {
  const identifier = usernameOrEmail.trim();

  // 1. ถ้ามีเครื่องหมาย @ แสดงว่าเป็นรูปแบบอีเมล ให้ค้นหาหรือส่งกลับ
  if (identifier.includes("@")) {
    return identifier;
  }

  // 2. ถ้าเป็น ID เข้าใช้งาน (ไม่มี @) ให้ค้นหาจาก username (case-insensitive) หรือ email
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: "insensitive" } },
          { email: { equals: `${identifier.toLowerCase()}@eleave.local`, mode: "insensitive" } },
          { email: { equals: identifier, mode: "insensitive" } },
        ],
      },
      select: { email: true },
    });

    if (user?.email) {
      return user.email;
    }
  } catch (error) {
    console.error("Error in resolveEmailForLogin:", error);
  }

  // 3. ถ้าหาไม่เจอในฐานข้อมูล ให้ fallback เป็นอีเมลจำลองเพื่อให้ Better Auth ได้รับรูปแบบอีเมลที่ถูกต้อง
  return `${identifier.toLowerCase()}@eleave.local`;
}
