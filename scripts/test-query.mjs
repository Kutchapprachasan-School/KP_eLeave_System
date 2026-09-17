import { prisma } from "../src/lib/db.ts";
try {
  const u = await prisma.user.findFirst({ select: { id: true, isApproved: true } });
  console.log("User valid fields:", u);
} catch (e) {
  console.log("Error caught:", e.message);
} finally {
  await prisma.$disconnect();
}
