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
    this.url    = url;
    this.key    = key;
    this.bucket = bucket;
  }

  private getClient() {
    const { createClient } = require("@supabase/supabase-js");
    return createClient(this.url, this.key);
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
    const { error } = await this.getClient().storage
      .from(targetBucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: options?.upsert ?? true,
        cacheControl: options?.cacheControl ?? (options?.isPublic ? "31536000" : undefined),
      });
    if (error) throw new Error(error.message);

    const publicUrl = options?.isPublic
      ? `${this.url.replace(/\/$/, "")}/storage/v1/object/public/${targetBucket}/${storageKey}`
      : undefined;

    return {
      storageKey,
      publicUrl,
      providerId: "supabase-instance",
    };
  }

  async getUrl(
    storageKey: string,
    options?: { bucket?: string; expiresIn?: number; isPublic?: boolean }
  ): Promise<string> {
    const targetBucket = options?.bucket || this.bucket;
    if (options?.isPublic) {
      return `${this.url.replace(/\/$/, "")}/storage/v1/object/public/${targetBucket}/${storageKey}`;
    }

    const { data, error } = await this.getClient().storage
      .from(targetBucket)
      .createSignedUrl(storageKey, options?.expiresIn || SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "Signed URL failed");
    return data.signedUrl;
  }

  async delete(storageKey: string, options?: { bucket?: string }): Promise<void> {
    const targetBucket = options?.bucket || this.bucket;
    const { error } = await this.getClient().storage
      .from(targetBucket)
      .remove([storageKey]);
    if (error) throw new Error(error.message);
  }
}

