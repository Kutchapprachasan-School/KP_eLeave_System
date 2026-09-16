let pg;
try {
  pg = require('C:/dev/eLeave/node_modules/pg');
} catch {
  pg = require('pg');
}
const { Client } = pg;
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("Missing database connection URL (DIRECT_URL or DATABASE_URL)");
  process.exit(1);
}

console.log('Connecting to PostgreSQL database...');
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database successfully.');

  const migrationSql = fs.readFileSync(
    'prisma/migrations/20260916090000_add_omr_sheet_75_items/migration.sql',
    'utf-8'
  );

  console.log('Applying migration 20260916090000_add_omr_sheet_75_items...');
  try {
    await client.query(migrationSql);
    console.log('✅ Migration 20260916090000_add_omr_sheet_75_items executed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }

  // Verification checks for ExamSheetType Enum
  console.log('\n--- Verifying ExamSheetType Enum Values ---');
  const res = await client.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'ExamSheetType'
    ORDER BY enumsortorder;
  `);
  console.log('Verified ExamSheetType values:', res.rows.map(r => r.enumlabel));

  await client.end();
  console.log('\n🚀 SHEET_75_ITEMS Database Migration & Verification Completed Successfully!\n');
}

run().catch(e => {
  console.error('Fatal error during migration:', e);
  process.exit(1);
});
