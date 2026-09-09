import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres.ngzflajpifmsvhldhviu:YQSmSuCwZ9_iR_!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const samples = [
  {
    code: "ROOM-CONF-1",
    name: "ห้องประชุมกุญชร 1",
    type: "MEETING_ROOM",
    capacity: 80,
    location: "อาคาร 1 ชั้น 2",
    description: "ห้องประชุมใหญ่ส่วนกลาง พร้อมโปรเจคเตอร์และเครื่องเสียง",
    status: "AVAILABLE",
    roomProfile: {
      floor: "ชั้น 2",
      hasProjector: true,
      hasSoundSystem: true,
      hasVideoConference: true,
      airConditionerCount: 4
    }
  },
  {
    code: "BUS-01",
    name: "รถบัสปรับอากาศ 45 ที่นั่ง",
    type: "VEHICLE",
    capacity: 45,
    location: "โรงจอดรถยานพาหนะ",
    description: "รถบัสโรงเรียนปรับอากาศ สำหรับทัศนศึกษาและการแข่งขันวิชาการ",
    status: "AVAILABLE",
    vehicleProfile: {
      licensePlate: "นข-4501 อุดรธานี",
      brand: "Hino",
      model: "S'elega VIP",
      fuelType: "DIESEL",
      seatCapacity: 45,
      currentOdometer: 12500
    }
  },
  {
    code: "LAB-CHEM-1",
    name: "ห้องปฏิบัติการเคมี 1",
    type: "LABORATORY",
    capacity: 40,
    location: "อาคารวิทยาศาสตร์ ชั้น 3",
    description: "ห้องปฏิบัติการเคมีและอุปกรณ์ทดลองส่วนกลาง",
    status: "AVAILABLE",
    roomProfile: {
      floor: "ชั้น 3",
      hasProjector: true,
      hasSoundSystem: false,
      hasVideoConference: false,
      airConditionerCount: 2
    }
  }
];

async function main() {
  console.log("Seeding sample facility resources to Supabase...");
  for (const s of samples) {
    const isVehicle = s.type === "VEHICLE";
    const res = await prisma.facilityResource.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        type: s.type,
        capacity: s.capacity,
        location: s.location,
        description: s.description,
        status: s.status
      },
      create: {
        code: s.code,
        name: s.name,
        type: s.type,
        capacity: s.capacity,
        location: s.location,
        description: s.description,
        status: s.status,
        ...(isVehicle ? {
          vehicleProfile: {
            create: s.vehicleProfile
          }
        } : {
          roomProfile: {
            create: s.roomProfile
          }
        })
      }
    });
    console.log(`Upserted: [${res.code}] ${res.name} (Type: ${res.type}, Status: ${res.status})`);
  }

  const count = await prisma.facilityResource.count();
  console.log(`Total Facility Resources now in DB: ${count}`);
}

main()
  .catch(e => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
