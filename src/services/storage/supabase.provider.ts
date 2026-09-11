/**
 * Supabase Storage Provider — stores files in a Supabase Storage bucket.
 *
 * FOR PRODUCTION USE.
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_STORAGE_BUCKET   (default: "repair-photos")
 *
 * Set STORAGE_PROVIDER=supabase in .env to activate.
 */

import type { StorageProvider, UploadOptions, StorageUploadResult } from "./provider.interface";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "repair-photos";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

export class SupabaseStorageProvider implements StorageProvider {
  private getCredentials() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase Storage ยังไม่ได้ตั้งค่า\n" +
        "ต้องการ: SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY\n" +
        "ดู Project Settings → API ใน Supabase Dashboard"
      );
    }
    return { url: url.replace(/\/$/, ""), key };
  }

  async upload(
    {
      buffer,
      mimeType,
      storageKey,
    }: {
      buffer: Buffer;
      mimeType: string;
      storageKey: string;
    },
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    const targetBucket = options?.bucket || BUCKET;
    const { url, key } = this.getCredentials();
    const cleanKey = storageKey.replace(/^\/+/, "");

    const res = await fetch(`${url}/storage/v1/object/${targetBucket}/${cleanKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": mimeType,
        "x-upsert": String(options?.upsert ?? true),
      },
      body: buffer,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Supabase upload failed (${res.status}): ${errBody}`);
    }

    const publicUrl = options?.isPublic
      ? `${url}/storage/v1/object/public/${targetBucket}/${cleanKey}`
      : undefined;

    return {
      storageKey: cleanKey,
      publicUrl,
      providerId: "supabase",
    };
  }

  async getUrl(
    storageKey: string,
    options?: { bucket?: string; expiresIn?: number; isPublic?: boolean }
  ): Promise<string> {
    const targetBucket = options?.bucket || BUCKET;
    const { url, key } = this.getCredentials();
    const cleanKey = storageKey.replace(/^\/+/, "");

    if (options?.isPublic) {
      return `${url}/storage/v1/object/public/${targetBucket}/${cleanKey}`;
    }

    const res = await fetch(`${url}/storage/v1/object/sign/${targetBucket}/${cleanKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: options?.expiresIn || SIGNED_URL_EXPIRY_SECONDS }),
    });

    if (!res.ok) {
      return `${url}/storage/v1/object/public/${targetBucket}/${cleanKey}`;
    }

    const data = await res.json();
    if (data?.signedURL) {
      return `${url}/storage/v1${data.signedURL}`;
    }

    return `${url}/storage/v1/object/public/${targetBucket}/${cleanKey}`;
  }

  async delete(storageKey: string, options?: { bucket?: string }): Promise<void> {
    const targetBucket = options?.bucket || BUCKET;
    const { url, key } = this.getCredentials();
    const cleanKey = storageKey.replace(/^\/+/, "");

    const res = await fetch(`${url}/storage/v1/object/${targetBucket}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [cleanKey] }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Supabase delete failed (${res.status}): ${errBody}`);
    }
  }
}


