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

export interface StorageProvider {
  /**
   * Upload a file buffer and return a storageKey.
   * storageKey is provider-agnostic (e.g. "repair/2026/REP-2026-000001-BEFORE-0.webp").
   */
  upload(params: {
    buffer: Buffer;
    mimeType: string;
    storageKey: string;
  }): Promise<void>;

  /**
   * Generate a URL for a given storageKey.
   * For local: returns /uploads/repair/<key>
   * For supabase: returns a signed URL valid for 1 hour
   */
  getUrl(storageKey: string): Promise<string>;

  /** Permanently delete a file by storageKey */
  delete(storageKey: string): Promise<void>;
}
