import sys
sys.stdout.reconfigure(encoding='utf-8')

import pg8000.native
import ssl
import json
from datetime import datetime, date

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, bytes):
            return o.hex()
        return super().default(o)

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

pooler_host = "aws-0-ap-southeast-1.pooler.supabase.com"
pooler_user = "postgres.ngzflajpifmsvhldhviu"
pooler_pass = "YQSmSuCwZ9_iR_!"
pooler_port = 6543
pooler_db = "postgres"

print("[*] Connecting to Supabase...")
conn = pg8000.native.Connection(
    user=pooler_user,
    password=pooler_pass,
    host=pooler_host,
    port=pooler_port,
    database=pooler_db,
    ssl_context=ssl_ctx
)
print("[+] Supabase Connected successfully!")

tables_res = conn.run("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name")
tables = [r[0] for r in tables_res if not r[0].startswith('_prisma')]

backup_data = {}
total_records = 0

for table in tables:
    cols_res = conn.run(f"SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '{table}' ORDER BY ordinal_position")
    cols = [c[0] for c in cols_res]
    
    rows = conn.run(f'SELECT * FROM "{table}"')
    table_rows = []
    for r in rows:
        row_dict = {}
        for idx, val in enumerate(r):
            row_dict[cols[idx]] = val
        table_rows.append(row_dict)
    
    backup_data[table] = {
        "columns": cols,
        "rows": table_rows
    }
    total_records += len(table_rows)
    print(f"  [+] Extracted '{table}': {len(table_rows)} rows")

conn.close()

with open("supabase_backup.json", "w", encoding="utf-8") as f:
    json.dump(backup_data, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)

print(f"\n[SUCCESS] Backup saved to 'supabase_backup.json' ({total_records} total records across {len(tables)} tables)!")
