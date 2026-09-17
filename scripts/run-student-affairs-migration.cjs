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
    'prisma/migrations/20260917120000_student_affairs_forensic_core/migration.sql',
    'utf-8'
  );

  console.log('Applying migration 20260917120000_student_affairs_forensic_core...');
  try {
    await client.query(migrationSql);
    console.log('✅ Migration 20260917120000_student_affairs_forensic_core executed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }

  // Verification checks for created tables
  console.log('\n--- Verifying Created Tables in Database ---');
  const expectedTables = [
    'Student',
    'StudentStatusHistory',
    'StudentEnrollment',
    'BehaviorRecord',
    'StudentYearlyBehaviorProjection',
    'ScheduledClassSession',
    'StudentMedicalCertificate',
    'StudentMorningAttendance',
    'StudentPeriodAttendance',
    'StudentHomeVisit',
    'SdqNormsRegistry',
    'StudentSdqEvaluation',
    'StudentRiskAssessment',
    'StudentInterventionCase',
    'InterventionActivity',
    'StudentAffairsAttachment',
    'StudentAffairsAuditLog',
    'CctExportManifest',
    'StudentMeritNomination'
  ];

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
    ORDER BY table_name;
  `, [expectedTables]);

  const existing = res.rows.map(r => r.table_name);
  console.log(`Found ${existing.length}/${expectedTables.length} tables:`, existing);

  if (existing.length !== expectedTables.length) {
    const missing = expectedTables.filter(t => !existing.includes(t));
    console.error('❌ Missing tables:', missing);
    process.exit(1);
  }

  // Verification checks for functions/procedures
  console.log('\n--- Verifying Stored Procedures ---');
  const procRes = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('record_student_behavior_ledger', 'change_student_status');
  `);
  console.log('Found procedures:', procRes.rows.map(r => r.routine_name));

  await client.end();
  console.log('\n🚀 Student Affairs Forensic Core Migration Applied & Verified Successfully!\n');
}

run().catch(e => {
  console.error('Fatal error during migration:', e);
  process.exit(1);
});
