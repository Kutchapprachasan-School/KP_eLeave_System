import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL is not defined in environment.");
  process.exit(1);
}

async function migrate() {
  console.log("=================================================");
  console.log("📜 MIGRATING CERTIFICATE REGISTER SUBSYSTEM SCHEMA");
  console.log("=================================================");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("✅ Connected to PostgreSQL DB successfully.\n");

  try {
    await client.query("BEGIN");

    // 1. Add idempotencyKey to DocumentRecord if not exists
    console.log("1. Checking 'idempotencyKey' on DocumentRecord...");
    await client.query(`
      ALTER TABLE "DocumentRecord" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uk_doc_record_idempotency" 
      ON "DocumentRecord"("idempotencyKey") 
      WHERE "idempotencyKey" IS NOT NULL;
    `);
    console.log("   ✅ 'idempotencyKey' and unique index ready.");

    // 2. Create CertificateIssuedItem table if not exists
    console.log("2. Checking 'CertificateIssuedItem' table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CertificateIssuedItem" (
        id TEXT PRIMARY KEY,
        "batchRecordId" TEXT NOT NULL REFERENCES "DocumentRecord"(id) ON DELETE CASCADE,
        "seqNo" INTEGER NOT NULL,
        year INTEGER NOT NULL,
        "certificateNumber" TEXT NOT NULL,
        "roleTitle" TEXT NOT NULL,
        "recipientName" TEXT,
        "verifyToken" TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ISSUED',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uk_cert_item_year_seq" UNIQUE(year, "seqNo"),
        CONSTRAINT "uk_cert_item_number" UNIQUE("certificateNumber"),
        CONSTRAINT "uk_cert_item_verify_token" UNIQUE("verifyToken")
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_cert_item_batch" ON "CertificateIssuedItem"("batchRecordId");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_cert_item_verify_token" ON "CertificateIssuedItem"("verifyToken");
    `);
    console.log("   ✅ 'CertificateIssuedItem' table and constraints ready.");

    // 3. Ensure DocumentConfig for docType = 'CERTIFICATE' exists
    console.log("3. Ensuring DocumentConfig for CERTIFICATE exists...");
    const configCheck = await client.query(`
      SELECT id, "currentSeq" FROM "DocumentConfig" WHERE "docType" = 'CERTIFICATE' LIMIT 1;
    `);
    if (configCheck.rows.length === 0) {
      const crypto = await import('crypto');
      const newId = 'cfg_' + crypto.randomBytes(12).toString('hex');
      await client.query(`
        INSERT INTO "DocumentConfig" (id, "docType", prefix, "useThaiNumerals", "paddingDigits", "yearFormat", "currentSeq", "createdAt", "updatedAt")
        VALUES ($1, 'CERTIFICATE', '', false, 1, 'TH_BE', 0, NOW(), NOW());
      `, [newId]);
      console.log("   ✅ Initialized DocumentConfig for CERTIFICATE with currentSeq = 0.");
    } else {
      console.log(`   ✅ DocumentConfig exists (currentSeq: ${configCheck.rows[0].currentSeq}).`);
    }

    await client.query("COMMIT");
    console.log("\n🎉 CERTIFICATE SCHEMA MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("=================================================");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("💥 Migration error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
