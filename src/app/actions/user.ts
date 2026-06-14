"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// For updating profile details like name, subjectGroup, image, signatureUrl
export async function updateProfile(data: {
  name: string;
  email?: string;
  subjectGroup: string;
  lineUserId?: string;
  image?: string;
  signatureUrl?: string;
  address?: string;
  phoneNumber?: string;
  level?: string;
}) {
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
      email: data.email !== undefined ? data.email : undefined,
      subjectGroup: data.subjectGroup,
      lineUserId: data.lineUserId,
      image: data.image !== undefined ? data.image : undefined,
      signatureUrl: data.signatureUrl !== undefined ? data.signatureUrl : undefined,
      address: data.address !== undefined ? data.address : undefined,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
      level: data.level !== undefined ? data.level : undefined,
    }
  });

  revalidatePath("/profile");
  return { success: true };
}
