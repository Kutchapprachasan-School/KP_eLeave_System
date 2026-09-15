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
    'prisma/migrations/20260915220000_omr_rev8_3_hardening/migration.sql',
    'utf-8'
  );

  console.log('Applying migration 20260915220000_omr_rev8_3_hardening...');
  await client.query('BEGIN');
  try {
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('✅ Migration 20260915220000_omr_rev8_3_hardening successfully committed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction rolled back:', err);
    throw err;
  }

  // Verification checks for ExamRegradeJob
  console.log('\n--- Verifying ExamRegradeJob Table & Columns ---');
  const res = await client.query(`SELECT count(*) FROM "ExamRegradeJob"`);
  console.log(`Verified table "ExamRegradeJob": exists (row count: ${res.rows[0].count})`);

  // Verify Triggers
  console.log('\n--- Verifying Triggers ---');
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, event_object_table
    FROM information_schema.triggers
    WHERE trigger_name IN ('trg_exam_submission_score_bounds', 'trg_exam_paper_score_bounds_update')
  `);
  console.log(`Verified ${triggers.rows.length} triggers:`);
  for (const row of triggers.rows) {
    console.log(`  - ${row.trigger_name} on ${row.event_object_table} (${row.event_manipulation})`);
  }

  // Verify Indexes
  console.log('\n--- Verifying Composite Cursor Index ---');
  const idx = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE indexname = 'ExamSubmission_paper_latest_created_id_idx'
  `);
  if (idx.rows.length > 0) {
    console.log(`  - ${idx.rows[0].indexname}: ${idx.rows[0].indexdef}`);
  }

  await client.end();
  console.log('\n🚀 Rev 8.3 Database Migration & Verification Completed Successfully!\n');
}

run().catch(e => {
  console.error('Fatal error during migration:', e);
  process.exit(1);
});
