import prisma from "../src/lib/prisma";

async function main() {
  console.log("Creating DocumentAuditLog table if missing...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DocumentAuditLog" (
      "id" TEXT NOT NULL,
      "documentId" TEXT NOT NULL,
      "actionType" TEXT NOT NULL,
      "changedById" TEXT NOT NULL,
      "changes" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAuditLog_documentId_fkey') THEN
        ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAuditLog_changedById_fkey') THEN
        ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log("SUCCESS: DocumentAuditLog table verified!");
}

main().catch(err => {
  console.error("Migration Error:", err);
  process.exit(1);
});
