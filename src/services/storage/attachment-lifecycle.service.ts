import { prisma } from "@/lib/db";
import { getStorageProvider } from "./index";
import crypto from "crypto";

export type DeleteObjectResult =
  | { status: "DELETED" }
  | { status: "ALREADY_MISSING" }
  | { status: "RETRYABLE_ERROR"; error: Error }
  | { status: "PERMANENT_ERROR"; error: Error };

/**
 * Storage-agnostic cloud delete with explicit result contract (AF).
 * Maps S3/R2/Supabase responses to a uniform domain status.
 */
export async function deleteObjectSafe(objectKey: string): Promise<DeleteObjectResult> {
  try {
    const storage = getStorageProvider();
    await storage.delete(objectKey);
    return { status: "DELETED" };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const code = err?.name || err?.code || "";

    // S3/R2 standard missing object errors
    if (
      code === "NoSuchKey" ||
      code === "NotFound" ||
      msg.includes("404") ||
      msg.toLowerCase().includes("not found")
    ) {
      return { status: "ALREADY_MISSING" };
    }

    // Permanent authorization or configuration errors
    if (
      code === "AccessDenied" ||
      code === "InvalidAccessKeyId" ||
      msg.includes("403") ||
      msg.includes("401")
    ) {
      return { status: "PERMANENT_ERROR", error: err instanceof Error ? err : new Error(msg) };
    }

    // Network timeouts, 5xx server issues are retryable
    return { status: "RETRYABLE_ERROR", error: err instanceof Error ? err : new Error(msg) };
  }
}

/**
 * Invariant AA: Deterministic Lexicographical Row-Level Locking
 * Eliminates cross-transaction deadlocks when swapping or re-assigning attachments.
 */
export async function lockAttachmentsInOrder(
  tx: any,
  attachmentIds: (string | null | undefined)[]
): Promise<void> {
  const validIds = attachmentIds.filter((id): id is string => Boolean(id));
  const uniqueSortedIds = Array.from(new Set(validIds)).sort();

  for (const id of uniqueSortedIds) {
    await tx.$queryRaw`
      SELECT id FROM "FileAttachment"
      WHERE id = ${id}
      FOR UPDATE;
    `;
  }
}

/**
 * Invariant C & T: Deterministic sequential check across all subsystem references.
 * Must be executed within a transaction that holds row-level locks on the attachment.
 *
 * SUBSYSTEM REGISTRY:
 * If a new domain links to FileAttachment, register its reference check here.
 */
export async function countAttachmentReferences(
  tx: any,
  attachmentId: string
): Promise<number> {
  // 1. CertificateTemplate (Inverted FK)
  const certRefs = await tx.certificateTemplate.count({
    where: { backgroundAttachmentId: attachmentId },
  });

  // 2. Direct FKs on FileAttachment (Leave, DocumentRecord, IncomingDoc, SystemSettings)
  const att = await tx.fileAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      leaveRequestId: true,
      documentRecordId: true,
      incomingDocumentId: true,
      systemSettingsId: true,
    },
  });

  const directRefs = [
    att?.leaveRequestId,
    att?.documentRecordId,
    att?.incomingDocumentId,
    att?.systemSettingsId,
  ].filter(Boolean).length;

  return certRefs + directRefs;
}

/**
 * Invariant N & AB: Centralized reference acquisition.
 * Locks the attachment and verifies ACTIVE status before caller inserts domain FK.
 */
export async function acquireAttachmentReference(
  tx: any,
  attachmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await lockAttachmentsInOrder(tx, [attachmentId]);

  const att = await tx.fileAttachment.findUnique({
    where: { id: attachmentId },
    select: { attachmentStatus: true },
  });

  if (!att) {
    return { ok: false, error: "FileAttachment not found" };
  }

  if (att.attachmentStatus !== "ACTIVE") {
    return {
      ok: false,
      error: `Attachment is unavailable (status: ${att.attachmentStatus})`,
    };
  }

  return { ok: true };
}

/**
 * Invariant N & AB: Centralized reference release.
 * Locks row, checks global references, and marks PENDING_DELETE if 0 references remain.
 */
export async function releaseAttachmentReference(
  tx: any,
  attachmentId: string
): Promise<{ markedForDeletion: boolean }> {
  await lockAttachmentsInOrder(tx, [attachmentId]);

  const totalRefs = await countAttachmentReferences(tx, attachmentId);
  if (totalRefs === 0) {
    await tx.fileAttachment.update({
      where: { id: attachmentId },
      data: {
        attachmentStatus: "PENDING_DELETE",
        orphanedAt: new Date(),
      },
    });
    return { markedForDeletion: true };
  }

  return { markedForDeletion: false };
}

/**
 * Invariant O, Y, 1, 2, 3: Durable Orphan Attachment Cleanup Worker.
 * Reclaims PENDING_DELETE and expired DELETING leases.
 * Revives to ACTIVE if references exist (resetting all counters).
 * Uses deletionLeaseId claim token to prevent split-brain collisions.
 */
export async function cleanupOrphanedAttachments(): Promise<{
  processed: number;
  deleted: number;
  revived: number;
  retried: number;
}> {
  const leaseTimeout = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

  const candidates = await prisma.fileAttachment.findMany({
    where: {
      OR: [
        { attachmentStatus: "PENDING_DELETE", cleanupAttempts: { lt: 5 } },
        { attachmentStatus: "DELETING", deletingAt: { lt: leaseTimeout }, cleanupAttempts: { lt: 5 } },
      ],
    },
    orderBy: { orphanedAt: "asc" },
    take: 10,
    select: { id: true, objectKey: true },
  });

  let processed = 0;
  let deleted = 0;
  let revived = 0;
  let retried = 0;

  for (const candidate of candidates) {
    processed++;
    const leaseId = crypto.randomUUID();
    let shouldDeleteCloud = false;

    // Phase 1: DB Transaction - Lock, re-check references, claim or revive
    const claimResult = await prisma.$transaction(async (tx) => {
      await lockAttachmentsInOrder(tx, [candidate.id]);

      const refs = await countAttachmentReferences(tx, candidate.id);
      if (refs > 0) {
        // Invariant 1: Revive to ACTIVE and reset ALL tracking counters
        await tx.fileAttachment.update({
          where: { id: candidate.id },
          data: {
            attachmentStatus: "ACTIVE",
            orphanedAt: null,
            deletingAt: null,
            deletionLeaseId: null,
            cleanupAttempts: 0,
            lastCleanupError: null,
          },
        });
        return { action: "REVIVED" as const };
      }

      // Claim row with fenced lease token
      await tx.fileAttachment.update({
        where: { id: candidate.id },
        data: {
          attachmentStatus: "DELETING",
          deletingAt: new Date(),
          deletionLeaseId: leaseId,
        },
      });

      return { action: "CLAIMED" as const, leaseId };
    });

    if (claimResult.action === "REVIVED") {
      revived++;
      continue;
    }

    // Phase 2: Outside transaction - Perform Cloud Storage Deletion
    const cloudRes = await deleteObjectSafe(candidate.objectKey);

    // Phase 3: DB Finalize guarded by deletionLeaseId
    if (cloudRes.status === "DELETED" || cloudRes.status === "ALREADY_MISSING") {
      await prisma.$executeRaw`
        DELETE FROM "FileAttachment"
        WHERE id = ${candidate.id}
          AND "attachmentStatus" = 'DELETING'
          AND "deletionLeaseId" = ${leaseId};
      `;
      deleted++;
    } else {
      // Retryable or permanent error -> revert to PENDING_DELETE with exponential backoff metadata
      const errMsg = "error" in cloudRes ? cloudRes.error.message : "Unknown error";
      await prisma.$executeRaw`
        UPDATE "FileAttachment"
        SET "attachmentStatus" = 'PENDING_DELETE',
            "deletingAt" = NULL,
            "deletionLeaseId" = NULL,
            "cleanupAttempts" = "cleanupAttempts" + 1,
            "lastCleanupError" = ${errMsg}
        WHERE id = ${candidate.id}
          AND "attachmentStatus" = 'DELETING'
          AND "deletionLeaseId" = ${leaseId};
      `;
      retried++;
    }
  }

  return { processed, deleted, revived, retried };
}

/**
 * Invariant AE, Z, AF, 2: Stale Upload Cleanup Worker.
 * Two-phase locking (UPLOAD_PENDING -> UPLOAD_CLEANUP) prevents race with finalizeUpload().
 * Physically deletes R2 cloud bytes before removing metadata.
 */
export async function cleanupStaleUploads(): Promise<{
  processed: number;
  deleted: number;
  failed: number;
}> {
  const staleCandidates = await prisma.fileAttachment.findMany({
    where: {
      attachmentStatus: "UPLOAD_PENDING",
      uploadExpiresAt: { lt: new Date() },
      cleanupAttempts: { lt: 5 },
    },
    take: 10,
    select: { id: true, objectKey: true },
  });

  let processed = 0;
  let deleted = 0;
  let failed = 0;

  for (const item of staleCandidates) {
    processed++;

    // Phase 1: Lock and transition to UPLOAD_CLEANUP
    const transitionSuccess = await prisma.$transaction(async (tx) => {
      await lockAttachmentsInOrder(tx, [item.id]);

      const current = await tx.fileAttachment.findUnique({
        where: { id: item.id },
        select: { attachmentStatus: true, uploadExpiresAt: true },
      });

      if (
        !current ||
        current.attachmentStatus !== "UPLOAD_PENDING" ||
        !current.uploadExpiresAt ||
        current.uploadExpiresAt >= new Date()
      ) {
        return false;
      }

      await tx.fileAttachment.update({
        where: { id: item.id },
        data: { attachmentStatus: "UPLOAD_CLEANUP" },
      });

      return true;
    });

    if (!transitionSuccess) {
      continue;
    }

    // Phase 2: Delete Cloud Storage Object
    const cloudRes = await deleteObjectSafe(item.objectKey);

    // Phase 3: Finalize DB Deletion
    if (cloudRes.status === "DELETED" || cloudRes.status === "ALREADY_MISSING") {
      await prisma.$transaction(async (tx) => {
        await tx.fileAttachment.deleteMany({
          where: { id: item.id, attachmentStatus: "UPLOAD_CLEANUP" },
        });

        await tx.storageUploadLog.updateMany({
          where: { objectKey: item.objectKey, status: "PENDING" },
          data: { status: "FAILED", error: "Upload expired / abandoned" },
        });
      });
      deleted++;
    } else {
      const errMsg = "error" in cloudRes ? cloudRes.error.message : "Cloud deletion failed";
      await prisma.fileAttachment.updateMany({
        where: { id: item.id, attachmentStatus: "UPLOAD_CLEANUP" },
        data: {
          attachmentStatus: "UPLOAD_PENDING",
          cleanupAttempts: { increment: 1 },
          lastCleanupError: errMsg,
        },
      });
      failed++;
    }
  }

  return { processed, deleted, failed };
}
