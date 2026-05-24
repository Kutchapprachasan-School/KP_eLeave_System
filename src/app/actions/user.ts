"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// For updating profile details like name, subjectGroup
export async function updateProfile(data: { name: string; subjectGroup: string; lineUserId?: string }) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      subjectGroup: data.subjectGroup,
      lineUserId: data.lineUserId,
    }
  });

  revalidatePath("/profile");
  return { success: true };
}
