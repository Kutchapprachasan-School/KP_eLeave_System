/**
 * Storage Provider Factory
 *
 * Returns the correct provider based on STORAGE_PROVIDER env var.
 *   "neon"     → NeonStorageProvider    (production — Neon Object Storage, S3-compatible)
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

export function getStorageProvider(): StorageProvider {
  if (_instance) return _instance;

  const provider = process.env.STORAGE_PROVIDER ?? "local";

  if (provider === "neon") {
    const { NeonStorageProvider } = require("./neon.provider");
    _instance = new NeonStorageProvider();
  } else if (provider === "supabase") {
    const { SupabaseStorageProvider } = require("./supabase.provider");
    _instance = new SupabaseStorageProvider();
  } else {
    const { LocalStorageProvider } = require("./local.provider");
    _instance = new LocalStorageProvider();
  }

  return _instance!;
}

export type { StorageProvider } from "./provider.interface";
