import sys
import pg8000.dbapi
import ssl
import json

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

TABLE_ORDER = [
    "User",
    "Account",
    "Session",
    "Verification",
    "SystemSettings",
    "SigneePreset",
    "AMSSCredentials",
    "RunningNumber",
    "Holiday",
    "MemoSection",
    "DocumentTemplate",
    "LeaveConfig",
    "LeaveRequest",
    "LeaveArchive",
    "IncomingDocument",
    "DocumentConfig",
    "DocumentRecord",
    "DocumentRouting",
    "DocumentRelation",
    "DocumentAuditLog",
    "WorkShift",
    "Attendance",
    "AttendanceNonce",
    "AttendanceLog",
    "AttendancePhoto",
    "RepairRequest",
    "RepairPhoto",
    "RepairRequestArchive",
    "RepairPhotoArchive",
    "Notification",
    "SystemLog",
    "SystemLogArchive",
    "SystemSequence",
    "SystemBackup"
]

def log(msg):
    print(msg, flush=True)

def restore(neon_url):
    clean = neon_url.replace("postgresql://", "").replace("postgres://", "")
    auth, rest = clean.split("@")
    user, password = auth.split(":", 1)
    host_port, db_params = rest.split("/", 1)
    if ":" in host_port:
        host, port = host_port.split(":")
        port = int(port)
    else:
        host = host_port
        port = 5432
    db = db_params.split("?")[0]

    log(f"[*] Connecting to Neon ({host}:{port}/{db})...")
    conn = pg8000.dbapi.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database=db,
        ssl_context=ssl_ctx
    )
    cursor = conn.cursor()
    log("[+] Connected to Neon successfully!")

    with open("supabase_backup.json", "r", encoding="utf-8") as f:
        backup_data = json.load(f)

    # 1. Truncate all tables in reverse dependency order
    log("\n[*] Truncating existing tables on Neon...")
    for table in reversed(TABLE_ORDER):
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s", (table,))
        if len(cursor.fetchall()) > 0:
            try:
                cursor.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
                conn.commit()
            except Exception:
                conn.rollback()

    total_restored = 0

    # 2. Insert tables in forward dependency order
    for table in TABLE_ORDER:
        if table not in backup_data:
            continue

        content = backup_data[table]
        rows = content["rows"]
        if len(rows) == 0:
            continue

        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s", (table,))
        if len(cursor.fetchall()) == 0:
            log(f"  [!] Table '{table}' does not exist in Neon, skipping.")
            continue

        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table,))
        neon_cols = set([c[0] for c in cursor.fetchall()])
        common_cols = [c for c in content["columns"] if c in neon_cols]
        if len(common_cols) == 0:
            continue

        col_str = ', '.join([f'"{c}"' for c in common_cols])
        placeholders = ', '.join(['%s'] * len(common_cols))
        insert_sql = f'INSERT INTO "{table}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

        for r in rows:
            values = tuple(r.get(c) for c in common_cols)
            cursor.execute(insert_sql, values)
        
        conn.commit()
        log(f"  [+] Restored '{table}': {len(rows)} rows")
        total_restored += len(rows)

    # Remaining extra tables
    for table, content in backup_data.items():
        if table in TABLE_ORDER:
            continue
        rows = content["rows"]
        if len(rows) == 0:
            continue

        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s", (table,))
        if len(cursor.fetchall()) == 0:
            continue

        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table,))
        neon_cols = set([c[0] for c in cursor.fetchall()])
        common_cols = [c for c in content["columns"] if c in neon_cols]
        if len(common_cols) == 0:
            continue

        col_str = ', '.join([f'"{c}"' for c in common_cols])
        placeholders = ', '.join(['%s'] * len(common_cols))
        insert_sql = f'INSERT INTO "{table}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

        inserted_count = 0
        for r in rows:
            values = tuple(r.get(c) for c in common_cols)
            try:
                cursor.execute(insert_sql, values)
                inserted_count += 1
            except Exception:
                conn.rollback()
        conn.commit()
        log(f"  [+] Restored extra table '{table}': {inserted_count} rows")
        total_restored += inserted_count

    cursor.close()
    conn.close()

    log(f"\n======================================================")
    log(f"🎉 [SUCCESS] Successfully migrated {total_restored} records from Supabase to Neon!")
    log(f"======================================================\n")

if __name__ == "__main__":
    neon_url = sys.argv[1] if len(sys.argv) > 1 else "postgresql://neondb_owner:npg_RDH4QBd7wChY@ep-fancy-pine-aom5dqmg.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require&channel_binding=require"
    restore(neon_url)
