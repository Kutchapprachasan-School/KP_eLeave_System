import { prisma } from "@/lib/db";
import { PlatformEventType } from "@/events/eventCatalog";
import * as crypto from "crypto";
import * as zlib from "zlib";

export interface PublishCurriculumInput {
  curriculumVersionId: string;
  academicYear: number;
  term: number;
  publishedBy: string;
  totalSubjects?: number;
  payload: Record<string, unknown>;
}

export interface PublishReceipt {
  outboxEventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  hash: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  status: string;
  publishedAt: string;
}

export class CurriculumPublishingService {
  /**
   * Calculates deterministic SHA-256 hash of a JSON payload.
   */
  public calculateSha256Hash(payload: unknown): string {
    const jsonStr = JSON.stringify(payload, Object.keys(payload as object).sort());
    return crypto.createHash("sha256").update(jsonStr, "utf8").digest("hex");
  }

  /**
   * Compresses a JSON object using gzip and returns a Base64 string along with size statistics.
   */
  public compressPayload(payload: unknown): {
    compressedBase64: string;
    originalSizeBytes: number;
    compressedSizeBytes: number;
    compressionRatioPercent: number;
  } {
    const jsonStr = JSON.stringify(payload);
    const inputBuffer = Buffer.from(jsonStr, "utf8");
    const compressedBuffer = zlib.gzipSync(inputBuffer);

    const originalSizeBytes = inputBuffer.length;
    const compressedSizeBytes = compressedBuffer.length;
    const compressionRatioPercent =
      originalSizeBytes > 0
        ? Math.round((1 - compressedSizeBytes / originalSizeBytes) * 10000) / 100
        : 0;

    return {
      compressedBase64: compressedBuffer.toString("base64"),
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatioPercent,
    };
  }

  /**
   * Decompresses a Base64 gzipped string back into a JSON object.
   */
  public decompressPayload<T = unknown>(compressedBase64: string): T {
    const compressedBuffer = Buffer.from(compressedBase64, "base64");
    const decompressedBuffer = zlib.gunzipSync(compressedBuffer);
    const jsonStr = decompressedBuffer.toString("utf8");
    return JSON.parse(jsonStr) as T;
  }

  /**
   * Verifies if a given payload matches an expected SHA-256 hash.
   */
  public verifyPayloadHash(payload: unknown, expectedHash: string): boolean {
    const computedHash = this.calculateSha256Hash(payload);
    return computedHash.toLowerCase() === expectedHash.toLowerCase();
  }

  /**
   * ACID Transactional Outbox Atomic Publishing Service:
   * Calculates SHA-256 hash, compresses payload, and writes to OutboxEvent in transaction.
   */
  public async publishCurriculum(input: PublishCurriculumInput): Promise<PublishReceipt> {
    const { curriculumVersionId, academicYear, term, publishedBy, totalSubjects = 0, payload } = input;

    // 1. Calculate Hash & Compress Payload
    const hash = this.calculateSha256Hash(payload);
    const { compressedBase64, originalSizeBytes, compressedSizeBytes, compressionRatioPercent } =
      this.compressPayload(payload);

    const publishedAt = new Date().toISOString();

    const outboxPayload = {
      curriculumVersionId,
      academicYear,
      term,
      totalSubjects,
      publishedBy,
      hash,
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatioPercent,
      compressedData: compressedBase64,
      publishedAt,
    };

    // 2. Execute ACID Prisma Transaction
    const [outboxEvent] = await prisma.$transaction([
      // Write to OutboxEvent table
      prisma.outboxEvent.create({
        data: {
          aggregateType: "CURRICULUM",
          aggregateId: curriculumVersionId,
          eventType: PlatformEventType.CURRICULUM_PUBLISHED,
          payload: outboxPayload,
          status: "PENDING",
          retryCount: 0,
        },
      }),
      // Update PlanningSession if matching session exists
      prisma.planningSession.updateMany({
        where: { academicYear, term },
        data: {
          status: "PUBLISHED",
          curriculumVersionId,
        },
      }),
    ]);

    return {
      outboxEventId: outboxEvent.id,
      aggregateType: outboxEvent.aggregateType,
      aggregateId: outboxEvent.aggregateId,
      eventType: outboxEvent.eventType,
      hash,
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatioPercent,
      status: outboxEvent.status,
      publishedAt,
    };
  }
}

export const curriculumPublishingService = new CurriculumPublishingService();
