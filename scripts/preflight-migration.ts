/**
 * Migration Preflight Verification Script
 * Validates database connection, required extensions (btree_gist), 
 * and existing data sanity before executing production migrations.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function runPreflight() {
  console.log('🚀 [Preflight] Starting Database Migration Preflight Check...');
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ [Preflight] FATAL: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ [Preflight] Successfully connected to PostgreSQL database.');

    // 1. PostgreSQL Version Check
    const versionRes = await client.query('SELECT version();');
    console.log(`ℹ️ [Preflight] DB Engine: ${versionRes.rows[0].version}`);

    // 2. Extension Check: btree_gist
    console.log('🔍 [Preflight] Verifying btree_gist extension availability...');
    const extRes = await client.query(`
      SELECT extname FROM pg_extension WHERE extname = 'btree_gist';
    `);
    if (extRes.rows.length === 0) {
      console.log('⚠️ [Preflight] btree_gist extension not yet installed. Attempting installation...');
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');
        console.log('✅ [Preflight] btree_gist successfully installed.');
      } catch (err: any) {
        console.error('❌ [Preflight] Failed to install btree_gist extension. Superuser or elevated privilege required:', err.message);
        process.exit(1);
      }
    } else {
      console.log('✅ [Preflight] btree_gist extension is installed and active.');
    }

    // 3. Data Sanity Check: startAt < endAt on existing reservations
    const checkTable = await client.query(`
      SELECT to_regclass('public."FacilityReservation"') as table_exists;
    `);
    if (checkTable.rows[0]?.table_exists) {
      console.log('🔍 [Preflight] Checking existing FacilityReservation data sanity (startAt < endAt)...');
      const invalidRes = await client.query(`
        SELECT count(*) as count FROM "FacilityReservation" WHERE "startAt" >= "endAt";
      `);
      const invalidCount = parseInt(invalidRes.rows[0]?.count || '0', 10);
      if (invalidCount > 0) {
        console.error(`❌ [Preflight] Data Sanity Error: Found ${invalidCount} rows in FacilityReservation where startAt >= endAt. Must be corrected before constraint deployment.`);
        process.exit(1);
      }
      console.log('✅ [Preflight] FacilityReservation timestamps are consistent.');
    }

    console.log('🎉 [Preflight] All Preflight Checks PASSED. Ready for prisma migrate deploy.');
  } catch (error: any) {
    console.error('❌ [Preflight] Unexpected error during preflight:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPreflight();
