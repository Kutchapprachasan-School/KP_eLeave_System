import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import dotenv from 'dotenv';

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
    'prisma/migrations/20260914160000_add_academic_omr_engine/migration.sql',
    'utf-8'
  );

  console.log('Applying migration 20260914160000_add_academic_omr_engine...');
  await client.query('BEGIN');
  try {
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('✅ Migration 20260914160000_add_academic_omr_engine successfully committed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction rolled back:', err);
    throw err;
  }

  // Verification checks for all 8 tables
  const tables = [
    'ExamTemplate',
    'ExamPaper',
    'ExamPrintedSheet',
    'ExamAnswerKey',
    'ExamAnswerKeyItem',
    'ExamSubmission',
    'ExamItemSubmission',
    'ExamAuditLog'
  ];

  console.log('\n--- Verifying Table Existence ---');
  for (const table of tables) {
    const res = await client.query(`SELECT count(*) FROM "${table}"`);
    console.log(`Verified table "${table}": exists (row count: ${res.rows[0].count})`);
  }

  // Verify Partial Unique Index
  console.log('\n--- Verifying Partial Unique Index ---');
  const indexCheck = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'ExamSubmission' AND indexname = 'uk_latest_submission_per_student'
  `);
  if (indexCheck.rows.length > 0) {
    console.log('Verified: Partial Unique Index "uk_latest_submission_per_student" exists:');
    console.log('  ', indexCheck.rows[0].indexdef);
  } else {
    throw new Error('Missing index "uk_latest_submission_per_student"');
  }

  // Verify Triggers
  console.log('\n--- Verifying Database Triggers ---');
  const triggerCheck = await client.query(`
    SELECT trigger_name, event_manipulation, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE event_object_table IN ('ExamAnswerKeyItem', 'ExamAuditLog')
  `);
  console.log(`Verified ${triggerCheck.rows.length} triggers:`);
  for (const row of triggerCheck.rows) {
    console.log(`  - ${row.trigger_name} on ${row.event_object_table} (${row.event_manipulation})`);
  }

  await client.end();
  console.log('\n🚀 Phase 1 Database Migration & Verification Completed Successfully!\n');
}

run().catch(e => {
  console.error('Fatal error during migration:', e);
  process.exit(1);
});
