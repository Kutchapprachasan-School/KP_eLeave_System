import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_aCPs2mGWTdZ6@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting Database Seed...");

  // 1. Seed/Upsert Default WorkShift
  const shiftName = "Standard Shift";
  let standardShift = await prisma.workShift.findFirst({
    where: { name: shiftName },
  });

  if (!standardShift) {
    standardShift = await prisma.workShift.create({
      data: {
        name: shiftName,
        startTime: "08:30",
        endTime: "16:30",
        lateThreshold: 15,       // 15-min late threshold
        earlyOutThreshold: 15,   // 15-min early-out threshold
        isOvernight: false,
      },
    });
    console.log(`✅ Created standard shift: "${shiftName}" (ID: ${standardShift.id})`);
  } else {
    // Update it to make sure it matches required thresholds
    standardShift = await prisma.workShift.update({
      where: { id: standardShift.id },
      data: {
        startTime: "08:30",
        endTime: "16:30",
        lateThreshold: 15,
        earlyOutThreshold: 15,
        isOvernight: false,
      },
    });
    console.log(`✅ Updated existing standard shift: "${shiftName}" (ID: ${standardShift.id})`);
  }

  // 2. Seed/Upsert SystemSettings "default" record
  const settings = await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {
      enableAttendance: false, // Default to inactive until set up
      attendanceLatitude: 13.7563, // Example latitude (Bangkok)
      attendanceLongitude: 100.5018, // Example longitude (Bangkok)
      attendanceRadius: 100.0, // 100 meters
      requireFaceScan: true,
      requireGeofence: true,
      requireLivenessCheck: true,
      photoRetentionDays: 90,
      faceMatchThreshold: 0.65,
      enableAdvancedKPI: true,
    },
    create: {
      id: "default",
      schoolName: "ชื่อโรงเรียน",
      subheader: "ระบบจัดการการลา",
      footerText: "© 2026 ระบบการลา",
      developerSecret: "admin1234",
      enableAttendance: false,
      attendanceLatitude: 13.7563,
      attendanceLongitude: 100.5018,
      attendanceRadius: 100.0,
      requireFaceScan: true,
      requireGeofence: true,
      requireLivenessCheck: true,
      photoRetentionDays: 90,
      faceMatchThreshold: 0.65,
      enableAdvancedKPI: true,
    },
  });

  console.log("✅ Seeded SystemSettings default attendance parameters.");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
