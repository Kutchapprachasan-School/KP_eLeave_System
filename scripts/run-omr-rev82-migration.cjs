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
    'prisma/migrations/20260915180000_omr_rev8_2_hardening/migration.sql',
    'utf-8'
  );

  console.log('Applying migration 20260915180000_omr_rev8_2_hardening...');
  await client.query('BEGIN');
  try {
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('✅ Migration 20260915180000_omr_rev8_2_hardening successfully committed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction rolled back:', err);
    throw err;
  }

  // Verification checks for all new/modified tables
  const tables = [
    'ExamPaper',
    'ExamSubjectiveItem',
    'ExamAnswerKeyVersion',
    'ExamSubmission'
  ];

  console.log('\n--- Verifying Table Existence & Columns ---');
  for (const table of tables) {
    const res = await client.query(`SELECT count(*) FROM "${table}"`);
    console.log(`Verified table "${table}": exists (row count: ${res.rows[0].count})`);
  }

  // Verify CHECK constraints
  console.log('\n--- Verifying CHECK Constraints ---');
  const checkConstraints = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conname IN ('chk_exam_paper_scores', 'chk_subjective_item_score', 'chk_exam_submission_score_invariants')
  `);
  console.log(`Verified ${checkConstraints.rows.length} CHECK constraints:`);
  for (const row of checkConstraints.rows) {
    console.log(`  - ${row.conname}: ${row.def}`);
  }

  await client.end();
  console.log('\n🚀 Phase 1 Database Migration & Verification Completed Successfully!\n');
}

run().catch(e => {
  console.error('Fatal error during migration:', e);
  process.exit(1);
});
