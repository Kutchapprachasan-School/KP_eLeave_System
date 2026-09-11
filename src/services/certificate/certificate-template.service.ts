import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/services/storage";
import {
  lockAttachmentsInOrder,
  acquireAttachmentReference,
  releaseAttachmentReference,
  cleanupOrphanedAttachments,
} from "@/services/storage/attachment-lifecycle.service";
import type { TemplateOrientation, TemplateScope } from "@prisma/client";

export interface SaveTemplateInput {
  id?: string;
  name: string;
  orientation: TemplateOrientation;
  backgroundAttachmentId: string;
  layoutConfig: any;
  scope: TemplateScope;
  expectedVersion?: number;
}

export interface UserContext {
  userId: string;
  userRole: string;
  canShareCertTemplates?: boolean;
}

function isAdmin(user: UserContext): boolean {
  return user.userRole === "ADMIN" || user.userRole === "SUPERADMIN";
}

/**
 * Service Layer: Saves a certificate template (Create or Atomic CAS Update).
 * Enforces Invariants AA, AC, AD, Q, S, 4.
 */
export async function saveTemplateService(
  input: SaveTemplateInput,
  user: UserContext
): Promise<
  | { success: true; data: any }
  | { success: false; error: string; code: string }
> {
  // If creating new template:
  if (!input.id) {
    if (input.scope === "SYSTEM_PRESET") {
      return {
        success: false,
        error: "Cannot create SYSTEM_PRESET templates directly. Presets are provisioned via system seeds.",
        code: "PRESET_IMMUTABLE",
      };
    }

    if (input.scope === "SCHOOL_SHARED" && !isAdmin(user) && !user.canShareCertTemplates) {
      return {
        success: false,
        error: "Sharing templates school-wide requires administrator approval.",
        code: "FORBIDDEN",
      };
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1. Lock and verify attachment is ACTIVE
      const acquireResult = await acquireAttachmentReference(tx, input.backgroundAttachmentId);
      if (!acquireResult.ok) {
        throw new Error(acquireResult.error);
      }

      // 2. Insert CertificateTemplate
      return tx.certificateTemplate.create({
        data: {
          name: input.name,
          orientation: input.orientation,
          backgroundAttachmentId: input.backgroundAttachmentId,
          layoutConfig: input.layoutConfig,
          scope: input.scope,
          createdById: user.userId,
        },
      });
    });

    return { success: true, data: created };
  }

  // Update path: Single-transaction CAS update
  const templateId = input.id;
  const expectedVersion = input.expectedVersion;

  if (typeof expectedVersion !== "number") {
    return {
      success: false,
      error: "expectedVersion is required for template updates (Optimistic Concurrency Control)",
      code: "VERSION_REQUIRED",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock template row
      const existing = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
      });

      if (!existing) {
        throw new Error("NOT_FOUND:Template not found");
      }

      // 2. Invariant 4: Strict Immutability & Scope Policy
      if (existing.scope === "SYSTEM_PRESET") {
        throw new Error("PRESET_IMMUTABLE:System presets cannot be modified directly. Use Fork.");
      }

      if (input.scope === "SYSTEM_PRESET") {
        throw new Error("PRESET_IMMUTABLE:Cannot promote templates to SYSTEM_PRESET.");
      }

      if (existing.scope === "PRIVATE") {
        if (existing.createdById !== user.userId && !isAdmin(user)) {
          throw new Error("FORBIDDEN:You can only edit your own private templates.");
        }
      }

      if (existing.scope === "PRIVATE" && input.scope === "SCHOOL_SHARED") {
        if (!isAdmin(user) && !user.canShareCertTemplates) {
          throw new Error("FORBIDDEN:Sharing templates school-wide requires administrator approval.");
        }
      }

      if (existing.scope === "SCHOOL_SHARED") {
        if (existing.createdById !== user.userId && !isAdmin(user)) {
          throw new Error("FORBIDDEN:School-shared templates can only be edited by the creator or an administrator.");
        }
      }

      // 3. Invariant AA: Deterministic lock ordering on attachments
      const oldAttId = existing.backgroundAttachmentId;
      const newAttId = input.backgroundAttachmentId;
      await lockAttachmentsInOrder(tx, [oldAttId, newAttId]);

      // If background attachment changed, verify new attachment is ACTIVE
      if (oldAttId !== newAttId) {
        const acquire = await acquireAttachmentReference(tx, newAttId);
        if (!acquire.ok) {
          throw new Error(`ATTACHMENT_UNAVAILABLE:${acquire.error}`);
        }
      }

      // 4. Invariant B & Q & S: Atomic CAS UPDATE covering all mutable fields
      const updateResult = await tx.certificateTemplate.updateMany({
        where: {
          id: templateId,
          templateVersion: expectedVersion,
          scope: { not: "SYSTEM_PRESET" },
        },
        data: {
          name: input.name,
          orientation: input.orientation,
          backgroundAttachmentId: newAttId,
          layoutConfig: input.layoutConfig,
          scope: input.scope,
          templateVersion: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new Error("CONFLICT:Template was modified by another session. Please reload.");
      }

      // 5. If background changed, release reference on old attachment
      let markedForDeletion = false;
      if (oldAttId !== newAttId) {
        const release = await releaseAttachmentReference(tx, oldAttId);
        markedForDeletion = release.markedForDeletion;
      }

      const updatedTemplate = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
      });

      return { updatedTemplate, markedForDeletion };
    });

    // Post-commit: trigger async cleanup worker if old attachment became orphan
    if (result.markedForDeletion) {
      cleanupOrphanedAttachments().catch((err) => {
        console.warn("[saveTemplateService] Background cleanup notice:", err?.message);
      });
    }

    return { success: true, data: result.updatedTemplate };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.startsWith("PRESET_IMMUTABLE:")) {
      return { success: false, error: msg.replace("PRESET_IMMUTABLE:", ""), code: "PRESET_IMMUTABLE" };
    }
    if (msg.startsWith("FORBIDDEN:")) {
      return { success: false, error: msg.replace("FORBIDDEN:", ""), code: "FORBIDDEN" };
    }
    if (msg.startsWith("CONFLICT:")) {
      return { success: false, error: msg.replace("CONFLICT:", ""), code: "CONFLICT" };
    }
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.replace("NOT_FOUND:", ""), code: "NOT_FOUND" };
    }
    if (msg.startsWith("ATTACHMENT_UNAVAILABLE:")) {
      return { success: false, error: msg.replace("ATTACHMENT_UNAVAILABLE:", ""), code: "ATTACHMENT_UNAVAILABLE" };
    }

    return { success: false, error: msg, code: "INTERNAL_ERROR" };
  }
}

/**
 * Service Layer: Forks an existing template to create an independent PRIVATE copy.
 * Enforces Invariants A, N, W (Lock-then-reread).
 */
export async function forkTemplateService(
  templateId: string,
  user: UserContext
): Promise<
  | { success: true; data: any }
  | { success: false; error: string; code: string }
> {
  try {
    const forked = await prisma.$transaction(async (tx) => {
      // 1. Initial read to find target attachment
      const initial = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
        select: { backgroundAttachmentId: true },
      });

      if (!initial) {
        throw new Error("NOT_FOUND:Template not found");
      }

      // 2. Lock attachment & verify ACTIVE
      const acquire = await acquireAttachmentReference(tx, initial.backgroundAttachmentId);
      if (!acquire.ok) {
        throw new Error(`ATTACHMENT_UNAVAILABLE:${acquire.error}`);
      }

      // 3. Invariant W: Re-read source template after acquiring lock
      const source = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
      });

      if (!source) {
        throw new Error("NOT_FOUND:Source template was deleted");
      }

      // 4. Create new PRIVATE template
      return tx.certificateTemplate.create({
        data: {
          name: `${source.name} (คัดลอก)`,
          orientation: source.orientation,
          backgroundAttachmentId: source.backgroundAttachmentId,
          layoutConfig: source.layoutConfig,
          scope: "PRIVATE",
          createdById: user.userId,
        },
      });
    });

    return { success: true, data: forked };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.replace("NOT_FOUND:", ""), code: "NOT_FOUND" };
    }
    if (msg.startsWith("ATTACHMENT_UNAVAILABLE:")) {
      return { success: false, error: msg.replace("ATTACHMENT_UNAVAILABLE:", ""), code: "ATTACHMENT_UNAVAILABLE" };
    }
    return { success: false, error: msg, code: "INTERNAL_ERROR" };
  }
}

/**
 * Service Layer: Deletes a certificate template.
 * Enforces Invariants A, N, S.
 */
export async function deleteTemplateService(
  templateId: string,
  user: UserContext
): Promise<
  | { success: true }
  | { success: false; error: string; code: string }
> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error("NOT_FOUND:Template not found");
      }

      if (template.scope === "SYSTEM_PRESET") {
        throw new Error("PRESET_IMMUTABLE:System presets cannot be deleted.");
      }

      if (template.createdById !== user.userId && !isAdmin(user)) {
        throw new Error("FORBIDDEN:You can only delete your own templates.");
      }

      // Lock attachment row before deleting template
      await lockAttachmentsInOrder(tx, [template.backgroundAttachmentId]);

      // Delete template row
      await tx.certificateTemplate.delete({
        where: { id: templateId },
      });

      // Release attachment reference
      const release = await releaseAttachmentReference(tx, template.backgroundAttachmentId);

      return { markedForDeletion: release.markedForDeletion };
    });

    // Post-commit: trigger async cleanup worker if attachment became orphan
    if (result.markedForDeletion) {
      cleanupOrphanedAttachments().catch((err) => {
        console.warn("[deleteTemplateService] Background cleanup notice:", err?.message);
      });
    }

    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.startsWith("PRESET_IMMUTABLE:")) {
      return { success: false, error: msg.replace("PRESET_IMMUTABLE:", ""), code: "PRESET_IMMUTABLE" };
    }
    if (msg.startsWith("FORBIDDEN:")) {
      return { success: false, error: msg.replace("FORBIDDEN:", ""), code: "FORBIDDEN" };
    }
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.replace("NOT_FOUND:", ""), code: "NOT_FOUND" };
    }
    return { success: false, error: msg, code: "INTERNAL_ERROR" };
  }
}

/**
 * Service Layer: Fetches accessible templates (SYSTEM_PRESET, SCHOOL_SHARED, or own PRIVATE).
 * Resolves storage URLs dynamically and serializes BigInt safely.
 */
export async function getTemplatesService(user: UserContext): Promise<any[]> {
  const templates = await prisma.certificateTemplate.findMany({
    where: {
      OR: [
        { scope: "SYSTEM_PRESET" },
        { scope: "SCHOOL_SHARED" },
        { createdById: user.userId },
      ],
    },
    include: {
      backgroundAttachment: {
        select: {
          id: true,
          objectKey: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          storageProvider: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { scope: "asc" },
      { updatedAt: "desc" },
    ],
  });

  const storage = getStorageProvider();

  return Promise.all(
    templates.map(async (tmpl) => {
      let backgroundUrl = "";
      if (tmpl.backgroundAttachment?.objectKey) {
        try {
          backgroundUrl = await storage.getUrl(tmpl.backgroundAttachment.objectKey);
        } catch (err) {
          console.warn(`[getTemplatesService] Could not resolve URL for ${tmpl.backgroundAttachment.objectKey}:`, err);
        }
      }

      return {
        id: tmpl.id,
        name: tmpl.name,
        schemaVersion: tmpl.schemaVersion,
        templateVersion: tmpl.templateVersion,
        orientation: tmpl.orientation,
        backgroundAttachmentId: tmpl.backgroundAttachmentId,
        backgroundUrl,
        layoutConfig: tmpl.layoutConfig,
        scope: tmpl.scope,
        createdById: tmpl.createdById,
        createdByName: tmpl.createdBy?.name ?? "ระบบ",
        createdAt: tmpl.createdAt.toISOString(),
        updatedAt: tmpl.updatedAt.toISOString(),
        attachment: tmpl.backgroundAttachment
          ? {
              id: tmpl.backgroundAttachment.id,
              originalFileName: tmpl.backgroundAttachment.originalFileName,
              mimeType: tmpl.backgroundAttachment.mimeType,
              // Convert BigInt to Number for safe JSON boundary
              fileSize: Number(tmpl.backgroundAttachment.fileSize),
            }
          : null,
      };
    })
  );
}
