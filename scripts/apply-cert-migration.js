const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing process.env.DATABASE_URL. Please set DATABASE_URL in your environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  console.log("Connected to PostgreSQL...");

  try {
    console.log("Creating enums...");
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "TemplateOrientation" AS ENUM ('LANDSCAPE', 'PORTRAIT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "TemplateScope" AS ENUM ('PRIVATE', 'SCHOOL_SHARED', 'SYSTEM_PRESET');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "AttachmentStatus" AS ENUM ('UPLOAD_PENDING', 'UPLOAD_CLEANUP', 'ACTIVE', 'PENDING_DELETE', 'DELETING');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log("Altering FileAttachment table (additive)...");
    await client.query(`
      ALTER TABLE "FileAttachment"
      ADD COLUMN IF NOT EXISTS "attachmentStatus" "AttachmentStatus" NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "orphanedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deletingAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deletionLeaseId" TEXT,
      ADD COLUMN IF NOT EXISTS "uploadExpiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "uploadSessionId" TEXT,
      ADD COLUMN IF NOT EXISTS "cleanupAttempts" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lastCleanupError" TEXT;
    `);

    console.log("Creating indexes on FileAttachment...");
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "FileAttachment_uploadSessionId_key" ON "FileAttachment"("uploadSessionId");
      CREATE INDEX IF NOT EXISTS "FileAttachment_attachmentStatus_orphanedAt_idx" ON "FileAttachment"("attachmentStatus", "orphanedAt");
      CREATE INDEX IF NOT EXISTS "FileAttachment_attachmentStatus_deletingAt_idx" ON "FileAttachment"("attachmentStatus", "deletingAt");
      CREATE INDEX IF NOT EXISTS "FileAttachment_attachmentStatus_uploadExpiresAt_idx" ON "FileAttachment"("attachmentStatus", "uploadExpiresAt");
    `);

    console.log("Creating CertificateTemplate table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CertificateTemplate" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "schemaVersion" INTEGER NOT NULL DEFAULT 1,
        "templateVersion" INTEGER NOT NULL DEFAULT 1,
        "orientation" "TemplateOrientation" NOT NULL DEFAULT 'LANDSCAPE',
        "backgroundAttachmentId" TEXT NOT NULL,
        "layoutConfig" JSONB NOT NULL,
        "scope" "TemplateScope" NOT NULL DEFAULT 'PRIVATE',
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CertificateTemplate_backgroundAttachmentId_fkey" FOREIGN KEY ("backgroundAttachmentId") REFERENCES "FileAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "CertificateTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    console.log("Creating indexes on CertificateTemplate...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS "CertificateTemplate_createdById_idx" ON "CertificateTemplate"("createdById");
      CREATE INDEX IF NOT EXISTS "CertificateTemplate_scope_createdById_idx" ON "CertificateTemplate"("scope", "createdById");
      CREATE INDEX IF NOT EXISTS "CertificateTemplate_backgroundAttachmentId_idx" ON "CertificateTemplate"("backgroundAttachmentId");
    `);

    console.log("Additive database migration successfully completed!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
