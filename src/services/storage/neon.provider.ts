/**
 * Neon Object Storage Provider — S3-compatible, branch-aware storage
 *
 * FOR PRODUCTION USE (ใช้กับ Neon PostgreSQL เดิมที่มีอยู่แล้ว)
 *
 * ข้อดี:
 *  - ไม่ต้องมี AWS account แยก — ใช้ Neon credential เดิม
 *  - Branch-aware: storage แยกตาม branch เหมือน database
 *  - S3-compatible ใช้ @aws-sdk/client-s3 ได้เลย
 *
 * ต้องการ env vars ดังนี้:
 *   NEON_STORAGE_ENDPOINT   = https://<branch-id>.storage.c-<N>.<region>.aws.neon.tech
 *   NEON_STORAGE_ACCESS_KEY = (จาก Neon Console → Object Storage → Credentials)
 *   NEON_STORAGE_SECRET_KEY = (จาก Neon Console → Object Storage → Credentials)
 *   NEON_STORAGE_BUCKET     = repair-photos  (ชื่อ bucket ที่สร้างใน Neon Console)
 *   NEON_STORAGE_REGION     = us-east-2      (default — ตรวจจาก Neon Console)
 *
 * Set STORAGE_PROVIDER=neon in .env to activate.
 *
 * วิธีสร้าง Credential:
 *   Neon Console → Project → Object Storage → Create Credential
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "./provider.interface";

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 ชั่วโมง

function getClient(): { client: S3Client; bucket: string } {
  const endpoint  = process.env.NEON_STORAGE_ENDPOINT;
  const accessKey = process.env.NEON_STORAGE_ACCESS_KEY;
  const secretKey = process.env.NEON_STORAGE_SECRET_KEY;
  const bucket    = process.env.NEON_STORAGE_BUCKET ?? "repair-photos";
  const region    = process.env.NEON_STORAGE_REGION ?? "us-east-2";

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      "Neon Object Storage ยังไม่ได้ตั้งค่า\n" +
      "ต้องการ: NEON_STORAGE_ENDPOINT, NEON_STORAGE_ACCESS_KEY, NEON_STORAGE_SECRET_KEY\n" +
      "สร้าง Credential ได้ที่ Neon Console → Object Storage → Credentials"
    );
  }

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId:     accessKey,
      secretAccessKey: secretKey,
    },
    // จำเป็นสำหรับ non-AWS S3-compatible endpoints
    forcePathStyle: true,
  });

  return { client, bucket };
}

export class NeonStorageProvider implements StorageProvider {
  async upload({
    buffer,
    mimeType,
    storageKey,
  }: {
    buffer: Buffer;
    mimeType: string;
    storageKey: string;
  }): Promise<void> {
    const { client, bucket } = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket:      bucket,
        Key:         storageKey,
        Body:        buffer,
        ContentType: mimeType,
      })
    );
  }

  async getUrl(storageKey: string): Promise<string> {
    const { client, bucket } = getClient();
    const command = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
    return getSignedUrl(client, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });
  }

  async delete(storageKey: string): Promise<void> {
    const { client, bucket } = getClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })
    );
  }
}
