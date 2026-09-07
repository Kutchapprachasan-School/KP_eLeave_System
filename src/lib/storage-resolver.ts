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

export function normalizeStorageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("/storage/v1/object/sign/")) {
    const withoutToken = trimmed.split("?")[0];
    return withoutToken.replace("/storage/v1/object/sign/", "/storage/v1/object/public/");
  }
  return trimmed;
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
  const trimmed = normalizeStorageUrl(input);

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

/**
 * Normalizes signature value so it is ALWAYS valid for <img src="...">
 * Handles:
 * 1. Raw SVG XML string `<svg...>` -> `data:image/svg+xml;utf8,...`
 * 2. Data URL `data:...` -> as is
 * 3. Remote URL `http(s)://...` -> as is (and normalizes signed URL to public)
 */
export function resolveSignatureSrc(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = normalizeStorageUrl(value);
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(trimmed);
  }
  return trimmed;
}

