import { prisma } from "../src/lib/db.ts";
try {
  const s = await prisma.systemSettings.findUnique({ where: { id: "default" } });
  console.log("defaultInspectorId:", s?.defaultInspectorId);
  console.log("finalApproverUserIds:", s?.finalApproverUserIds);
  console.log("documentAdminUserIds:", s?.documentAdminUserIds);
  console.log("rolePermissions:", s?.rolePermissions);

  const users = await prisma.user.findMany({ select: { id: true, name: true, position: true, level: true, role: true } });
  const positions = [...new Set(users.map(u => u.position))];
  const levels = [...new Set(users.map(u => u.level))];
  console.log("Distinct Positions:", positions);
  console.log("Distinct Levels:", levels);
  console.log("Sample Users by Position:");
  for (const p of positions) {
    const matched = users.filter(u => u.position === p);
    console.log(`- ${p}: ${matched.length} users (levels: ${[...new Set(matched.map(m => m.level))].join(", ")})`);
  }
} finally {
  await prisma.$disconnect();
}
