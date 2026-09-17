import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL is not defined in environment.");
  process.exit(1);
}

async function main() {
  console.log("Connecting to PostgreSQL to create partial unique index...");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    console.log("Applying: CREATE UNIQUE INDEX IF NOT EXISTS \"idx_leave_request_fiscal_approved_seq\"...");
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_leave_request_fiscal_approved_seq" 
      ON "LeaveRequest" ("fiscalYear", "approvedSeq") 
      WHERE "fiscalYear" IS NOT NULL AND "approvedSeq" IS NOT NULL;
    `);
    console.log("✅ Partial unique index applied successfully.");

    const res = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'LeaveRequest' AND indexname = 'idx_leave_request_fiscal_approved_seq';
    `);
    console.log("Verified index in pg_indexes:", res.rows);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("❌ Error applying index:", err);
  process.exit(1);
});
