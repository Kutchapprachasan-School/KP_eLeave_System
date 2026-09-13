import sys
sys.stdout.reconfigure(encoding='utf-8')

import pg8000.native
import ssl
import socket

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

pooler_host = "aws-0-ap-southeast-1.pooler.supabase.com"
pooler_user = "postgres.ngzflajpifmsvhldhviu"
pooler_pass = "YQSmSuCwZ9_iR_!"
pooler_port = 6543
pooler_db = "postgres"

try:
    resolved_ip = socket.gethostbyname(pooler_host)
    print(f"[*] Resolved {pooler_host} -> {resolved_ip}")
except Exception:
    resolved_ip = pooler_host

print("=================================================")
print("♻️ MIGRATING RECYCLE BIN & SOFT-DELETE SCHEMA")
print("=================================================")
print("[*] Connecting to Supabase PostgreSQL DB...")

conn = pg8000.native.Connection(
    user=pooler_user,
    password=pooler_pass,
    host=resolved_ip,
    port=pooler_port,
    database=pooler_db,
    ssl_context=ssl_ctx
)
print("[+] Connected to PostgreSQL successfully!\n")

try:
    # 1. DocumentRecord Soft-Delete columns & indexes
    print("1. Adding soft-delete columns to 'DocumentRecord'...")
    conn.run("""
        ALTER TABLE "DocumentRecord" 
            ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
            ADD COLUMN IF NOT EXISTS "deletedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS "purgeAt" TIMESTAMP(3),
            ADD COLUMN IF NOT EXISTS "deleteReason" TEXT;
    """)
    conn.run("""
        CREATE INDEX IF NOT EXISTS "idx_doc_record_is_deleted_deleted_at" 
        ON "DocumentRecord"("isDeleted", "deletedAt");
    """)
    conn.run("""
        CREATE INDEX IF NOT EXISTS "idx_doc_record_is_deleted_purge_at" 
        ON "DocumentRecord"("isDeleted", "purgeAt");
    """)
    print("   ✅ 'DocumentRecord' columns and indexes ready.")

    # 2. LeaveRequest Soft-Delete columns & indexes
    print("2. Adding soft-delete columns to 'LeaveRequest'...")
    conn.run("""
        ALTER TABLE "LeaveRequest" 
            ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
            ADD COLUMN IF NOT EXISTS "deletedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS "purgeAt" TIMESTAMP(3),
            ADD COLUMN IF NOT EXISTS "deleteReason" TEXT;
    """)
    conn.run("""
        CREATE INDEX IF NOT EXISTS "idx_leave_request_is_deleted_deleted_at" 
        ON "LeaveRequest"("isDeleted", "deletedAt");
    """)
    conn.run("""
        CREATE INDEX IF NOT EXISTS "idx_leave_request_is_deleted_purge_at" 
        ON "LeaveRequest"("isDeleted", "purgeAt");
    """)
    print("   ✅ 'LeaveRequest' columns and indexes ready.")

    # 3. SystemSettings recycleBinRetentionDays column
    print("3. Adding 'recycleBinRetentionDays' to 'SystemSettings'...")
    conn.run("""
        ALTER TABLE "SystemSettings" 
            ADD COLUMN IF NOT EXISTS "recycleBinRetentionDays" INTEGER NOT NULL DEFAULT 30;
    """)
    print("   ✅ 'SystemSettings.recycleBinRetentionDays' ready.")

    print("\n🚀 RECYCLE BIN MIGRATION COMPLETED SUCCESSFULLY!\n")
except Exception as e:
    print(f"❌ Migration error: {e}")
    sys.exit(1)
finally:
    conn.close()
