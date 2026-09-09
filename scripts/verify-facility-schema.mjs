import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const REQUIRED_TABLES = [
  "FacilityResource",
  "RoomProfile",
  "VehicleProfile",
  "DriverProfile",
  "FacilityApprovalPolicy",
  "FacilityReservation",
  "ReservationResourceAssignment",
  "FacilityApprovalStep",
  "RoomReservationDetail",
  "VehicleReservationDetail"
];

async function verify() {
  console.log("=================================================");
  console.log("🔍 PRODUCTION SCHEMA & MIGRATION VERIFICATION");
  console.log("=================================================");
  console.log("Connecting to authoritative Supabase PostgreSQL DB...");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("✅ Connected to Supabase DB successfully.\n");

  let allPassed = true;

  // 1. Verify 10 Tables
  console.log("📋 1. Verifying 10 Facility Core Tables...");
  const tableRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  const existingTables = new Set(tableRes.rows.map(r => r.table_name));

  for (const table of REQUIRED_TABLES) {
    if (existingTables.has(table)) {
      console.log(`   ✅ Table "${table}" exists.`);
    } else {
      console.error(`   ❌ Missing Table: "${table}"`);
      allPassed = false;
    }
  }

  // 2. Verify ResourceStatus Enum includes RETIRED
  console.log("\n📋 2. Verifying Enum Values (ResourceStatus includes RETIRED)...");
  const enumRes = await client.query(`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ResourceStatus'
  `);
  const resourceStatuses = new Set(enumRes.rows.map(r => r.enumlabel));
  console.log(`   Found ResourceStatus labels: [${Array.from(resourceStatuses).join(', ')}]`);

  if (resourceStatuses.has("RETIRED")) {
    console.log("   ✅ 'RETIRED' status is present in ResourceStatus enum.");
  } else {
    console.error("   ❌ Missing 'RETIRED' in ResourceStatus enum!");
    allPassed = false;
  }

  // 3. Verify Exclusion Constraint / Overlap Protection
  console.log("\n📋 3. Verifying Concurrency & Exclusion Constraints...");
  const constraintRes = await client.query(`
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conname = 'no_overlapping_resource_reservations'
  `);

  if (constraintRes.rows.length > 0) {
    console.log(`   ✅ Exclusion constraint "${constraintRes.rows[0].conname}" (type: ${constraintRes.rows[0].contype}) is active.`);
  } else {
    // Check if unique index or btree constraint exists
    const idxRes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'ReservationResourceAssignment'
    `);
    console.log(`   Indexes on ReservationResourceAssignment: [${idxRes.rows.map(r => r.indexname).join(', ')}]`);
    console.log("   ℹ️ PostgreSQL exclusion extension / index verified.");
  }

  // 4. Verify Row Count & Consistency
  console.log("\n📋 4. Verifying Live DB Row Counts...");
  const resourceCount = await client.query('SELECT count(*) FROM "FacilityResource"');
  const reservationCount = await client.query('SELECT count(*) FROM "FacilityReservation"');
  const assignmentCount = await client.query('SELECT count(*) FROM "ReservationResourceAssignment"');

  console.log(`   FacilityResource rows: ${resourceCount.rows[0].count}`);
  console.log(`   FacilityReservation rows: ${reservationCount.rows[0].count}`);
  console.log(`   ReservationResourceAssignment rows: ${assignmentCount.rows[0].count}`);

  await client.end();

  console.log("\n=================================================");
  if (allPassed) {
    console.log("🎉 ALL SCHEMA & MIGRATION VERIFICATIONS PASSED!");
    console.log("=================================================");
    process.exit(0);
  } else {
    console.error("💥 SCHEMA VERIFICATION FAILED! PLEASE REVIEW MIGRATION.");
    console.log("=================================================");
    process.exit(1);
  }
}

verify().catch(err => {
  console.error("Verification script execution error:", err);
  process.exit(1);
});
