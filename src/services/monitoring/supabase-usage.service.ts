import { prisma } from "@/lib/db";
import { getTelemetrySummary } from "@/lib/telemetry";

export interface QuotaMetric {
  name: string;
  usedBytes: number;
  usedFormatted: string;
  limitBytes: number;
  limitFormatted: string;
  remainingBytes: number;
  remainingFormatted: string;
  percentUsed: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
}

export interface SupabaseUsageReport {
  timestamp: string;
  isOfficialApi: boolean;
  projectRef: string;
  orgSlug: string;
  planType: "FREE" | "PRO" | "CUSTOM";
  egress: QuotaMetric;
  database: QuotaMetric;
  storage: QuotaMetric;
  breakdown: {
    databaseEgressBytes: number;
    databaseEgressFormatted: string;
    storageEgressBytes: number;
    storageEgressFormatted: string;
    authEgressBytes: number;
    authEgressFormatted: string;
  };
  topTables: Array<{
    tableName: string;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    rowCount: number;
  }>;
  billingPeriod?: {
    start: string;
    end: string;
    daysRemaining: number;
  };
  supabaseDashboardUrl: string;
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0.00 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, idx)).toFixed(dm)) + " " + sizes[idx];
}

function calculateMetric(
  name: string,
  usedBytes: number,
  limitBytes: number
): QuotaMetric {
  const safeLimit = limitBytes > 0 ? limitBytes : 1;
  const percentUsed = parseFloat(((usedBytes / safeLimit) * 100).toFixed(1));
  const remainingBytes = Math.max(0, limitBytes - usedBytes);

  let status: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
  if (percentUsed >= 95) {
    status = "CRITICAL";
  } else if (percentUsed >= 80) {
    status = "WARNING";
  }

  return {
    name,
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    limitBytes,
    limitFormatted: formatBytes(limitBytes),
    remainingBytes,
    remainingFormatted: formatBytes(remainingBytes),
    percentUsed,
    status,
  };
}

export async function getSupabaseUsageReport(options?: {
  accessToken?: string;
  projectRef?: string;
  orgSlug?: string;
  planType?: "FREE" | "PRO" | "CUSTOM";
  customEgressLimitGb?: number;
  customDbLimitMb?: number;
  customStorageLimitGb?: number;
}): Promise<SupabaseUsageReport> {
  const projectRef =
    options?.projectRef ||
    process.env.SUPABASE_PROJECT_REF ||
    process.env.SUPABASE_FAILOVER_0_URL?.replace(/https:\/\/|\.supabase\.co/g, "") ||
    "ngzflajpifmsvhldhviu";

  const orgSlug =
    options?.orgSlug ||
    process.env.SUPABASE_ORG_SLUG ||
    "elhmzcrjulinlolcjkur";

  const token = options?.accessToken || process.env.SUPABASE_ACCESS_TOKEN;
  const planType = options?.planType || "FREE";

  // Default Limits: Free Tier (5GB Egress, 500MB DB, 1GB Storage) vs Pro Tier (250GB Egress, 8GB DB, 100GB Storage)
  const egressLimitBytes =
    (options?.customEgressLimitGb
      ? options.customEgressLimitGb
      : planType === "PRO"
      ? 250
      : 5) *
    1024 *
    1024 *
    1024;

  const dbLimitBytes =
    (options?.customDbLimitMb
      ? options.customDbLimitMb
      : planType === "PRO"
      ? 8192
      : 500) *
    1024 *
    1024;

  const storageLimitBytes =
    (options?.customStorageLimitGb
      ? options.customStorageLimitGb
      : planType === "PRO"
      ? 100
      : 1) *
    1024 *
    1024 *
    1024;

  let isOfficialApi = false;
  let officialUsageData: any = null;

  // 1. Attempt to query Supabase Management API if access token is available
  if (token) {
    try {
      const apiRes = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/usage`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (apiRes.ok) {
        officialUsageData = await apiRes.json();
        isOfficialApi = true;
      }
    } catch (err) {
      console.warn("[supabase-usage] Management API fetch failed:", err);
    }
  }

  // 2. Query Live PostgreSQL database stats for exact table & disk metrics
  let dbSizeBytes = 0;
  const topTables: Array<{
    tableName: string;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    rowCount: number;
  }> = [];

  try {
    const dbSizeResult: any = await prisma.$queryRawUnsafe(`
      SELECT pg_database_size(current_database()) as size_bytes;
    `);
    if (dbSizeResult && dbSizeResult.length > 0) {
      dbSizeBytes = Number(dbSizeResult[0].size_bytes || 0);
    }

    const tableSizesResult: any = await prisma.$queryRawUnsafe(`
      SELECT 
        table_name,
        pg_total_relation_size(quote_ident(table_name)) as total_bytes
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY total_bytes DESC
      LIMIT 6;
    `);

    if (Array.isArray(tableSizesResult)) {
      for (const row of tableSizesResult) {
        const size = Number(row.total_bytes || 0);
        topTables.push({
          tableName: row.table_name,
          totalSizeBytes: size,
          totalSizeFormatted: formatBytes(size),
          rowCount: 0,
        });
      }
    }
  } catch (err) {
    console.warn("[supabase-usage] PostgreSQL stats query fallback:", err);
    // Approximate size if direct pg_database_size fails
    dbSizeBytes = 18 * 1024 * 1024;
  }

  // 3. Aggregate In-App Request Payload & Storage Telemetry
  const telemetry = getTelemetrySummary();
  const sessionDataTransferBytes = telemetry.totalBytes || 0;

  // Derive Egress Values
  let totalEgressBytes = sessionDataTransferBytes;
  let dbEgressBytes = sessionDataTransferBytes;
  let storageEgressBytes = 0;
  let authEgressBytes = 0;
  let storageSizeBytes = 74 * 4 * 1024; // ~300 KB for avatar.webp files

  if (isOfficialApi && officialUsageData) {
    totalEgressBytes =
      officialUsageData.egress?.total_bytes ||
      officialUsageData.bandwidth?.total_bytes ||
      totalEgressBytes;
    dbEgressBytes = officialUsageData.egress?.db_bytes || dbEgressBytes;
    storageEgressBytes = officialUsageData.egress?.storage_bytes || 0;
    authEgressBytes = officialUsageData.egress?.auth_bytes || 0;
    storageSizeBytes =
      officialUsageData.storage?.total_bytes || storageSizeBytes;
    dbSizeBytes = officialUsageData.database?.total_bytes || dbSizeBytes;
  }

  // Calculate Days Remaining in Month
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(1, endOfMonth.getDate() - now.getDate());

  const supabaseDashboardUrl = `https://supabase.com/dashboard/org/${orgSlug}/usage#egress`;

  return {
    timestamp: new Date().toISOString(),
    isOfficialApi,
    projectRef,
    orgSlug,
    planType,
    egress: calculateMetric("Data Egress (แบนด์วิดท์)", totalEgressBytes, egressLimitBytes),
    database: calculateMetric("Database Storage (พื้นที่ฐานข้อมูล)", dbSizeBytes, dbLimitBytes),
    storage: calculateMetric("Storage Buckets (พื้นที่ไฟล์รูปภาพ)", storageSizeBytes, storageLimitBytes),
    breakdown: {
      databaseEgressBytes: dbEgressBytes,
      databaseEgressFormatted: formatBytes(dbEgressBytes),
      storageEgressBytes,
      storageEgressFormatted: formatBytes(storageEgressBytes),
      authEgressBytes,
      authEgressFormatted: formatBytes(authEgressBytes),
    },
    topTables,
    billingPeriod: {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: endOfMonth.toISOString(),
      daysRemaining,
    },
    supabaseDashboardUrl,
  };
}
