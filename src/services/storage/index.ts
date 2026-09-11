/**
 * Storage Provider Factory
 *
 * Returns the correct provider based on STORAGE_PROVIDER env var.
 *   "r2"       → R2StorageProvider       (production — Cloudflare R2, zero egress, free 10GB)
 *   "neon"     → NeonStorageProvider    (production — Neon Object Storage, branch-aware)
 *   "supabase" → SupabaseStorageProvider
 *   "local"    → LocalStorageProvider   (dev fallback)
 *
 * Usage:
 *   import { getStorageProvider } from "@/services/storage";
 *   const storage = getStorageProvider();
 *   await storage.upload({ buffer, mimeType, storageKey });
 *   const url = await storage.getUrl(storageKey);
 */

import type { StorageProvider } from "./provider.interface";

let _instance: StorageProvider | null = null;

let _providerCache: Partial<Record<string, StorageProvider>> = {};

export function getStorageProvider(): StorageProvider {
  return getStorageProviderByType();
}

export function getStorageProviderByType(type?: string): StorageProvider {
  const normalizedType = (type || process.env.STORAGE_PROVIDER || "local").toLowerCase();

  if (_providerCache[normalizedType]) {
    return _providerCache[normalizedType]!;
  }

  let provider: StorageProvider;
  if (normalizedType === "r2") {
    const { R2StorageProvider } = require("./r2.provider");
    provider = new R2StorageProvider();
  } else if (normalizedType === "supabase") {
    // Check if indexed failover 0 is configured or standard SUPABASE_URL
    const failover0Url = process.env.SUPABASE_FAILOVER_0_URL;
    const failover0Key = process.env.SUPABASE_FAILOVER_0_KEY;
    const failover0Bucket = process.env.SUPABASE_FAILOVER_0_BUCKET || "data1";

    if (failover0Url && failover0Key) {
      const { SupabaseInstanceProvider } = require("./supabase-instance.provider");
      provider = new SupabaseInstanceProvider(failover0Url, failover0Key, failover0Bucket);
    } else {
      const { SupabaseStorageProvider } = require("./supabase.provider");
      provider = new SupabaseStorageProvider();
    }
  } else if (normalizedType === "neon") {
    const { NeonStorageProvider } = require("./neon.provider");
    provider = new NeonStorageProvider();
  } else if (normalizedType === "failover") {
    const { FailoverStorageProvider } = require("./failover.provider");
    const { SupabaseInstanceProvider } = require("./supabase-instance.provider");
    const providers: StorageProvider[] = [];

    let index = 0;
    while (true) {
      const url = process.env[`SUPABASE_FAILOVER_${index}_URL`];
      const key = process.env[`SUPABASE_FAILOVER_${index}_KEY`];
      const bucket = process.env[`SUPABASE_FAILOVER_${index}_BUCKET`] ?? "data1";
      if (!url || !key) break;
      providers.push(new SupabaseInstanceProvider(url, key, bucket));
      index++;
    }

    if (providers.length === 0) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "data1";
      if (url && key) {
        providers.push(new SupabaseInstanceProvider(url, key, bucket));
      }
    }

    provider = new FailoverStorageProvider(providers);
  } else {
    // Only allow LocalStorageProvider if strictly not in production Vercel
    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    if (isVercel) {
      // In Vercel serverless environment, local filesystem is read-only (EROFS)
      // Default to Supabase if configured, otherwise throw STORAGE_UNAVAILABLE
      const hasSupabase = Boolean(process.env.SUPABASE_URL || process.env.SUPABASE_FAILOVER_0_URL);
      if (hasSupabase) {
        return getStorageProviderByType("supabase");
      }
      throw new Error("STORAGE_UNAVAILABLE: Local filesystem is not writable on Vercel and no cloud storage provider is configured.");
    }

    const { LocalStorageProvider } = require("./local.provider");
    provider = new LocalStorageProvider();
  }

  _providerCache[normalizedType] = provider;
  return provider;
}

export interface ResilientUploadResult {
  storageKey: string;
  publicUrl?: string;
  provider: "R2" | "SUPABASE";
}

/**
 * Resilient upload helper: Primary R2 -> Secondary Supabase -> Error STORAGE_UNAVAILABLE.
 * Strictly avoids local filesystem on Vercel production.
 */
export async function uploadWithResilientFallback(params: {
  buffer: Buffer;
  mimeType: string;
  storageKey: string;
}): Promise<ResilientUploadResult> {
  const isR2Configured = Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY &&
    process.env.R2_SECRET_KEY
  );

  // 1. Try Primary: R2
  if (isR2Configured) {
    try {
      const r2 = getStorageProviderByType("r2");
      const res = await r2.upload(params, { isPublic: true });
      const publicUrl = res.publicUrl || (await r2.getUrl(params.storageKey, { isPublic: true }));
      return {
        storageKey: params.storageKey,
        publicUrl,
        provider: "R2",
      };
    } catch (r2Err) {
      console.warn("[Storage Fallback] R2 upload failed, failing over to Supabase:", r2Err);
    }
  }

  // 2. Try Secondary Fallback: Supabase Storage
  const isSupabaseConfigured = Boolean(
    (process.env.SUPABASE_FAILOVER_0_URL && process.env.SUPABASE_FAILOVER_0_KEY) ||
    (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = getStorageProviderByType("supabase");
      const res = await supabase.upload(params, { isPublic: true });
      const publicUrl = res.publicUrl || (await supabase.getUrl(params.storageKey, { isPublic: true }));
      return {
        storageKey: params.storageKey,
        publicUrl,
        provider: "SUPABASE",
      };
    } catch (sbErr) {
      console.error("[Storage Fallback] Supabase upload failed:", sbErr);
      throw new Error(`STORAGE_UNAVAILABLE: ทั้ง Cloudflare R2 และ Supabase Storage ล้มเหลว (${sbErr instanceof Error ? sbErr.message : sbErr})`);
    }
  }

  throw new Error("STORAGE_UNAVAILABLE: ไม่พบการตั้งค่า Cloudflare R2 หรือ Supabase Storage");
}

export type { StorageProvider } from "./provider.interface";

