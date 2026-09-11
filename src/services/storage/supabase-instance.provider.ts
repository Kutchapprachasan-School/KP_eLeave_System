/**
 * Supabase Storage Provider (Multi-instance version)
 *
 * เหมือน supabase.provider.ts แต่รับ credentials ผ่าน constructor
 * เพื่อรองรับหลาย Supabase project ใน FailoverStorageProvider
 */

import type { StorageProvider, UploadOptions, StorageUploadResult } from "./provider.interface";

const SIGNED_URL_EXPIRY_SECONDS = 3600;

export class SupabaseInstanceProvider implements StorageProvider {
  private url: string;
  private key: string;
  private bucket: string;

  constructor(url: string, key: string, bucket: string) {
    this.url    = url.replace(/\/$/, "");
    this.key    = key;
    this.bucket = bucket;
  }

  async upload(
    { buffer, mimeType, storageKey }: {
      buffer: Buffer;
      mimeType: string;
      storageKey: string;
    },
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    const targetBucket = options?.bucket || this.bucket;
    const cleanKey = storageKey.replace(/^\/+/, "");

    const res = await fetch(`${this.url}/storage/v1/object/${targetBucket}/${cleanKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        "Content-Type": mimeType,
        "x-upsert": String(options?.upsert ?? true),
      },
      body: buffer,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Supabase REST upload failed (${res.status}): ${errBody}`);
    }

    const publicUrl = options?.isPublic
      ? `${this.url}/storage/v1/object/public/${targetBucket}/${cleanKey}`
      : undefined;

    return {
      storageKey: cleanKey,
      publicUrl,
      providerId: "supabase-instance",
    };
  }

  async getUrl(
    storageKey: string,
    options?: { bucket?: string; expiresIn?: number; isPublic?: boolean }
  ): Promise<string> {
    const targetBucket = options?.bucket || this.bucket;
    const cleanKey = storageKey.replace(/^\/+/, "");

    if (options?.isPublic) {
      return `${this.url}/storage/v1/object/public/${targetBucket}/${cleanKey}`;
    }

    // Signed URL via Supabase REST API
    const res = await fetch(`${this.url}/storage/v1/object/sign/${targetBucket}/${cleanKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: options?.expiresIn || SIGNED_URL_EXPIRY_SECONDS }),
    });

    if (!res.ok) {
      // If signed URL fails or bucket is public, fallback to public object URL
      return `${this.url}/storage/v1/object/public/${targetBucket}/${cleanKey}`;
    }

    const data = await res.json();
    if (data?.signedURL) {
      return `${this.url}/storage/v1${data.signedURL}`;
    }

    return `${this.url}/storage/v1/object/public/${targetBucket}/${cleanKey}`;
  }

  async delete(storageKey: string, options?: { bucket?: string }): Promise<void> {
    const targetBucket = options?.bucket || this.bucket;
    const cleanKey = storageKey.replace(/^\/+/, "");

    const res = await fetch(`${this.url}/storage/v1/object/${targetBucket}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [cleanKey] }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Supabase REST delete failed (${res.status}): ${errBody}`);
    }
  }
}


