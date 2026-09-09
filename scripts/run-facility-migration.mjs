import { Client } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('Connecting to Supabase production DB...');
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL.');
  const sql = fs.readFileSync('prisma/migrations/20260909000000_add_facility_reservation_system/migration.sql', 'utf-8');
  console.log('Applying migration 20260909000000_add_facility_reservation_system...');
  await client.query(sql);
  console.log('Migration successfully applied to Supabase database!');

  // Verify tables
  const resCheck = await client.query('SELECT count(*) FROM "FacilityResource"');
  console.log('Verified: FacilityResource table exists. Current count:', resCheck.rows[0].count);

  const resvCheck = await client.query('SELECT count(*) FROM "FacilityReservation"');
  console.log('Verified: FacilityReservation table exists. Current count:', resvCheck.rows[0].count);

  const assignCheck = await client.query('SELECT count(*) FROM "ReservationResourceAssignment"');
  console.log('Verified: ReservationResourceAssignment table exists. Current count:', assignCheck.rows[0].count);

  await client.end();
}

run().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
