import { getStorageProvider } from "@/services/storage";

export function isBase64DataUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.trim().startsWith("data:");
}

export function isRemoteHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("//");
}

/**
 * Resolves a storage target (Base64, full CDN URL, or Supabase Storage Key)
 * to an accessible URL string.
 */
export async function resolveFileUrl(
  input: string | null | undefined,
  options?: { bucket?: string; isPublic?: boolean; expiresIn?: number }
): Promise<string | null> {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Existing Base64 Data URL (Historical data)
  if (isBase64DataUrl(trimmed)) {
    return trimmed;
  }

  // 2. Full CDN / Public URL
  if (isRemoteHttpUrl(trimmed)) {
    return trimmed;
  }

  // 3. Storage Key / Encoded Key
  try {
    const storage = getStorageProvider();
    return await storage.getUrl(trimmed, options);
  } catch (err) {
    console.error("[StorageResolver] Failed to resolve key:", trimmed, err);
    return trimmed;
  }
}
