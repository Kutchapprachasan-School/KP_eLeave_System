import { Pool } from 'pg';

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Data Migration & Constraint Enforcement...');
    await client.query('BEGIN');

    // 1. Migrate executive subjectGroup
    const updateDirRes = await client.query(`
      UPDATE "User" 
      SET "subjectGroup" = 'ผู้อำนวยการโรงเรียน' 
      WHERE "position" = 'ผู้อำนวยการ' 
         OR "subjectGroup" = 'แอดมิน / ผู้บริหาร'
         OR "subjectGroup" LIKE 'แอดมิน%ผู้บริหาร%';
    `);
    console.log(`✅ Updated Director subjectGroup: ${updateDirRes.rowCount} rows`);

    const updateDepRes = await client.query(`
      UPDATE "User" 
      SET "subjectGroup" = 'รองผู้อำนวยการโรงเรียน' 
      WHERE "position" = 'รองผู้อำนวยการ' 
         OR "subjectGroup" = 'แอดมิน / ผู้อำนวยการ'
         OR "subjectGroup" LIKE 'แอดมิน%ผู้อำนวยการ%';
    `);
    console.log(`✅ Updated Deputy Director subjectGroup: ${updateDepRes.rowCount} rows`);

    // 2. Migrate level to pure academic standing (NULL or ชำนาญการ / ชำนาญการพิเศษ / เชี่ยวชาญ / เชี่ยวชาญพิเศษ)
    const clearPosLevelRes = await client.query(`
      UPDATE "User"
      SET "level" = NULL
      WHERE "level" = 'ครูผู้ช่วย' 
         OR "level" = 'ครู' 
         OR "level" = '';
    `);
    console.log(`✅ Cleared position values from level: ${clearPosLevelRes.rowCount} rows`);

    const normChamRes = await client.query(`
      UPDATE "User"
      SET "level" = 'ชำนาญการ'
      WHERE "level" IN ('ครูชำนาญการ', 'ผู้อำนวยการชำนาญการ', 'รองผู้อำนวยการชำนาญการ');
    `);
    console.log(`✅ Normalized ชำนาญการ: ${normChamRes.rowCount} rows`);

    const normChamPisetRes = await client.query(`
      UPDATE "User"
      SET "level" = 'ชำนาญการพิเศษ'
      WHERE "level" IN ('ครูชำนาญการพิเศษ', 'ผู้อำนวยการชำนาญการพิเศษ', 'รองผู้อำนวยการชำนาญการพิเศษ');
    `);
    console.log(`✅ Normalized ชำนาญการพิเศษ: ${normChamPisetRes.rowCount} rows`);

    const normChiewRes = await client.query(`
      UPDATE "User"
      SET "level" = 'เชี่ยวชาญ'
      WHERE "level" IN ('ครูเชี่ยวชาญ', 'ผู้อำนวยการเชี่ยวชาญ', 'รองผู้อำนวยการเชี่ยวชาญ');
    `);
    console.log(`✅ Normalized เชี่ยวชาญ: ${normChiewRes.rowCount} rows`);

    const normChiewPisetRes = await client.query(`
      UPDATE "User"
      SET "level" = 'เชี่ยวชาญพิเศษ'
      WHERE "level" IN ('ครูเชี่ยวชาญพิเศษ', 'ผู้อำนวยการเชี่ยวชาญพิเศษ');
    `);
    console.log(`✅ Normalized เชี่ยวชาญพิเศษ: ${normChiewPisetRes.rowCount} rows`);

    // Verify all levels now satisfy pure academic standing
    const invalidLevels = await client.query(`
      SELECT DISTINCT "level" FROM "User" 
      WHERE "level" IS NOT NULL 
        AND "level" != '' 
        AND "level" NOT IN ('ชำนาญการ', 'ชำนาญการพิเศษ', 'เชี่ยวชาญ', 'เชี่ยวชาญพิเศษ');
    `);
    if (invalidLevels.rows.length > 0) {
      console.warn('⚠️ Remaining non-standard levels found:', invalidLevels.rows);
      await client.query(`
        UPDATE "User"
        SET "level" = NULL
        WHERE "level" IS NOT NULL 
          AND "level" != '' 
          AND "level" NOT IN ('ชำนาญการ', 'ชำนาญการพิเศษ', 'เชี่ยวชาญ', 'เชี่ยวชาญพิเศษ');
      `);
      console.log('✅ Cleaned remaining non-standard levels to NULL');
    }

    // 3. Add PostgreSQL CHECK Constraints
    console.log('🔒 Applying PostgreSQL CHECK constraints...');
    await client.query(`
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "chk_user_level_academic_standing";
      ALTER TABLE "User" ADD CONSTRAINT "chk_user_level_academic_standing"
      CHECK (
        "level" IS NULL 
        OR "level" = '' 
        OR "level" IN ('ชำนาญการ', 'ชำนาญการพิเศษ', 'เชี่ยวชาญ', 'เชี่ยวชาญพิเศษ')
      );
    `);
    console.log('✅ Applied chk_user_level_academic_standing constraint');

    await client.query(`
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "chk_user_subject_group_no_admin_exec";
      ALTER TABLE "User" ADD CONSTRAINT "chk_user_subject_group_no_admin_exec"
      CHECK (
        "subjectGroup" IS NULL 
        OR "subjectGroup" = '' 
        OR (
          "subjectGroup" NOT IN ('แอดมิน / ผู้บริหาร', 'แอดมิน / ผู้อำนวยการ')
          AND "subjectGroup" NOT LIKE '%แอดมิน / %'
        )
      );
    `);
    console.log('✅ Applied chk_user_subject_group_no_admin_exec constraint');

    await client.query('COMMIT');
    console.log('🎉 Migration & Constraint setup completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
