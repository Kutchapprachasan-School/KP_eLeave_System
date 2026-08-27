/**
 * Emergency Migration Script: Supabase → Neon
 * 
 * ดึงข้อมูลทั้งหมดจาก Supabase (Source) เข้าสู่ Neon (Target)
 * ปิดการตรวจ Foreign Keys ชั่วคราว (session_replication_role = 'replica') เพื่อให้เขียนได้ไวและไม่ติด Constraint
 *
 * วิธีรัน:
 *   $env:SOURCE_DB_URL="postgresql://postgres:[PASSWORD]@db.ngzflajpifmsvhldhviu.supabase.co:5432/postgres"
 *   $env:TARGET_DB_URL="postgresql://neondb_owner:npg_aCPs2mGWTdZ6@ep-fancy-pine-aom5dqmg.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require&channel_binding=require"
 *   npx tsx scripts/migrate-from-supabase.ts
 */

import { Client } from "pg";

async function main() {
  const sourceUrl = process.env.SOURCE_DB_URL;
  const targetUrl = process.env.TARGET_DB_URL || "postgresql://neondb_owner:npg_aCPs2mGWTdZ6@ep-fancy-pine-aom5dqmg.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require&channel_binding=require";

  if (!sourceUrl) {
    console.error("❌ ไม่พบ SOURCE_DB_URL (Supabase Connection String)");
    console.log("ตัวอย่าง: $env:SOURCE_DB_URL='postgresql://postgres:PASSWORD@db.ngzflajpifmsvhldhviu.supabase.co:5432/postgres'");
    process.exit(1);
  }

  console.log("🔌 กำลังเชื่อมต่อ Supabase (ต้นทาง)...");
  const sourceClient = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  await sourceClient.connect();

  console.log("🔌 กำลังเชื่อมต่อ Neon (ปลายทาง)...");
  const targetClient = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });
  await targetClient.connect();

  try {
    // 1. ดึงรายชื่อตารางทั้งหมดใน public schema
    const tablesRes = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);

    console.log(`📋 พบตารางใน Supabase ทั้งหมด ${tables.length} ตาราง: ${tables.join(", ")}`);

    // 2. ปิด FK & Triggers บน Neon เพื่อให้ Insert ได้รวดเร็ว
    await targetClient.query("SET session_replication_role = 'replica';");

    let totalMigrated = 0;

    for (const table of tables) {
      console.log(`\n⏳ กำลังคัดลอกตาราง: "${table}"...`);

      const dataRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      const rows = dataRes.rows;

      if (rows.length === 0) {
        console.log(`   └ ℹ️ ไม่มีข้อมูลในตารางนี้`);
        continue;
      }

      // Truncate target table first
      await targetClient.query(`TRUNCATE TABLE "${table}" CASCADE;`);

      // Bulk insert in chunks of 50
      const columns = Object.keys(rows[0]).map((c) => `"${c}"`).join(", ");
      const chunkSize = 50;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valuesPlaceholders: string[] = [];
        const flatValues: any[] = [];
        let paramIndex = 1;

        for (const row of chunk) {
          const rowParams: string[] = [];
          for (const col of Object.keys(rows[0])) {
            rowParams.push(`$${paramIndex++}`);
            flatValues.push(row[col]);
          }
          valuesPlaceholders.push(`(${rowParams.join(", ")})`);
        }

        const insertQuery = `INSERT INTO "${table}" (${columns}) VALUES ${valuesPlaceholders.join(", ")} ON CONFLICT DO NOTHING;`;
        await targetClient.query(insertQuery, flatValues);
      }

      console.log(`   └ ✅ คัดลอกสำเร็จ ${rows.length} แถว`);
      totalMigrated += rows.length;
    }

    // 3. เปิด FK กลับคืน
    await targetClient.query("SET session_replication_role = 'origin';");

    console.log(`\n🎉 ย้ายข้อมูลเสร็จสมบูรณ์ทั้งหมด ${totalMigrated} แถว จาก Supabase ไป Neon!`);
  } catch (err: any) {
    console.error("❌ เกิดข้อผิดพลาดระหว่างย้ายข้อมูล:", err);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main();
