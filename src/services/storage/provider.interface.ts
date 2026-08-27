/**
 * Storage Provider Interface (v7.2)
 *
 * All concrete providers must implement this interface.
 * storageKey is the source of truth — URLs are generated at runtime via getUrl().
 *
 * Available providers:
 *   local    → public/uploads/repair/ (dev only)
 *   supabase → Supabase Storage (production)
 *
 * Switch provider via STORAGE_PROVIDER env var.
 */

export interface UploadOptions {
  bucket?: string;
  isPublic?: boolean;
  cacheControl?: string;
  upsert?: boolean;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  storageKey: string;
  publicUrl?: string;
  providerId?: string;
}

export interface StorageProvider {
  /**
   * Upload a file buffer and return a StorageUploadResult.
   */
  upload(
    params: {
      buffer: Buffer;
      mimeType: string;
      storageKey: string;
    },
    options?: UploadOptions
  ): Promise<StorageUploadResult | void>;

  /**
   * Generate a URL for a given storageKey.
   */
  getUrl(
    storageKey: string,
    options?: { bucket?: string; expiresIn?: number; isPublic?: boolean }
  ): Promise<string>;

  /** Permanently delete a file by storageKey */
  delete(storageKey: string, options?: { bucket?: string }): Promise<void>;
}

