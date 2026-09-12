import { prisma } from "@/lib/db";
import { getStorageProviderByType } from "@/services/storage";
import {
  lockAttachmentsInOrder,
  acquireAttachmentReference,
  releaseAttachmentReference,
  cleanupOrphanedAttachments,
} from "@/services/storage/attachment-lifecycle.service";
import {
  CertificateTemplateV1Schema,
  extractCustomFontAttachmentIds,
} from "@/app/(app)/document/_components/designer/cert-schema";
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

export interface CertificateTemplateViewModel {
  id: string;
  name: string;
  schemaVersion: number;
  templateVersion: number;
  orientation: TemplateOrientation;
  backgroundAttachmentId: string;
  backgroundUrl: string;
  layoutConfig: any;
  scope: TemplateScope;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  attachment: {
    id: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
  } | null;
}

function isAdmin(user: UserContext): boolean {
  return user.userRole === "ADMIN" || user.userRole === "SUPERADMIN";
}

export function extractSignatureAttachmentIds(layoutConfig: any): string[] {
  if (!layoutConfig || !Array.isArray(layoutConfig.elements)) return [];
  const ids: string[] = [];
  for (const el of layoutConfig.elements) {
    if (el && el.type === "signature" && typeof el.signatureAttachmentId === "string" && el.signatureAttachmentId.trim() !== "") {
      ids.push(el.signatureAttachmentId.trim());
    }
  }
  return Array.from(new Set(ids));
}

/**
 * Hydrates a raw CertificateTemplate record into a fully enriched ViewModel.
 * Dynamically resolves signed/public URLs for background, signatures, and custom fonts
 * using each attachment's exact storage provider (deterministic, no cross-provider fallback).
 */
export async function hydrateTemplateViewModel(tmpl: any): Promise<CertificateTemplateViewModel> {
  let backgroundUrl = "";
  if (tmpl.backgroundAttachment?.objectKey) {
    try {
      const provider = getStorageProviderByType(tmpl.backgroundAttachment.storageProvider);
      backgroundUrl = await provider.getUrl(tmpl.backgroundAttachment.objectKey);
    } catch (err) {
      console.warn(`[hydrateTemplateViewModel] Could not resolve background URL for ${tmpl.backgroundAttachment.objectKey}:`, err);
    }
  }

  let layoutConfig = tmpl.layoutConfig as any;
  if (layoutConfig) {
    // 1. Hydrate signatures with runtime preview URLs
    if (Array.isArray(layoutConfig.elements)) {
      const sigAttIds = extractSignatureAttachmentIds(layoutConfig);
      if (sigAttIds.length > 0) {
        try {
          const sigAttachments = await prisma.fileAttachment.findMany({
            where: { id: { in: sigAttIds } },
            select: { id: true, objectKey: true, storageProvider: true },
          });
          const sigUrlMap = new Map<string, string>();
          for (const att of sigAttachments) {
            try {
              const provider = getStorageProviderByType(att.storageProvider);
              const u = await provider.getUrl(att.objectKey);
              sigUrlMap.set(att.id, u);
            } catch (err) {
              console.warn(`[hydrateTemplateViewModel] Could not resolve signature URL for ${att.objectKey}:`, err);
            }
          }
          layoutConfig = {
            ...layoutConfig,
            elements: layoutConfig.elements.map((el: any) => {
              if (el.type === "signature" && el.signatureAttachmentId && sigUrlMap.has(el.signatureAttachmentId)) {
                return { ...el, previewUrl: sigUrlMap.get(el.signatureAttachmentId) };
              }
              return el;
            }),
          };
        } catch (err) {
          console.warn(`[hydrateTemplateViewModel] Error fetching signature attachments:`, err);
        }
      }
    }

    // 2. Hydrate custom fonts with runtime URLs (without persisting to DB)
    if (Array.isArray(layoutConfig.customFonts)) {
      const fontAttIds = extractCustomFontAttachmentIds(layoutConfig);
      if (fontAttIds.length > 0) {
        try {
          const fontAttachments = await prisma.fileAttachment.findMany({
            where: { id: { in: fontAttIds } },
            select: { id: true, objectKey: true, storageProvider: true },
          });
          const fontUrlMap = new Map<string, string>();
          for (const att of fontAttachments) {
            try {
              const provider = getStorageProviderByType(att.storageProvider);
              const u = await provider.getUrl(att.objectKey);
              fontUrlMap.set(att.id, u);
            } catch (err) {
              console.warn(`[hydrateTemplateViewModel] Could not resolve font URL for ${att.objectKey}:`, err);
            }
          }
          layoutConfig = {
            ...layoutConfig,
            customFonts: layoutConfig.customFonts.map((cf: any) => ({
              ...cf,
              runtimeUrl: fontUrlMap.get(cf.attachmentId) || "",
            })),
          };
        } catch (err) {
          console.warn(`[hydrateTemplateViewModel] Error fetching font attachments:`, err);
        }
      }
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
    layoutConfig,
    scope: tmpl.scope,
    createdById: tmpl.createdById,
    createdByName: tmpl.createdBy?.name ?? "ระบบ",
    createdAt: tmpl.createdAt instanceof Date ? tmpl.createdAt.toISOString() : tmpl.createdAt,
    updatedAt: tmpl.updatedAt instanceof Date ? tmpl.updatedAt.toISOString() : tmpl.updatedAt,
    attachment: tmpl.backgroundAttachment
      ? {
          id: tmpl.backgroundAttachment.id,
          originalFileName: tmpl.backgroundAttachment.originalFileName,
          mimeType: tmpl.backgroundAttachment.mimeType,
          fileSize: Number(tmpl.backgroundAttachment.fileSize),
        }
      : null,
  };
}

/**
 * Service Layer: Saves a certificate template (Create or Atomic CAS Update).
 * Enforces Invariants AA, AC, AD, Q, S, 4.
 * Returns fully hydrated CertificateTemplateViewModel on success.
 */
export async function saveTemplateService(
  input: SaveTemplateInput,
  user: UserContext
): Promise<
  | { success: true; data: CertificateTemplateViewModel }
  | { success: false; error: string; code: string }
> {
  // Validate layoutConfig at schema/service boundary (Item 1: rejects transient url in customFonts)
  const parsedLayout = CertificateTemplateV1Schema.safeParse(input.layoutConfig);
  if (!parsedLayout.success) {
    return {
      success: false,
      error: `INVALID_LAYOUT:${parsedLayout.error.errors[0]?.message || "Invalid template layout structure"}`,
      code: "INVALID_LAYOUT",
    };
  }

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

    const sigIds = extractSignatureAttachmentIds(input.layoutConfig);
    const fontIds = extractCustomFontAttachmentIds(input.layoutConfig);
    const allAttIds = Array.from(new Set([input.backgroundAttachmentId, ...sigIds, ...fontIds].filter(Boolean)));

    try {
      const created = await prisma.$transaction(async (tx) => {
        // 1. Lock and verify all attachments are ACTIVE
        await lockAttachmentsInOrder(tx, allAttIds);
        for (const attId of allAttIds) {
          const acquireResult = await acquireAttachmentReference(tx, attId);
          if (!acquireResult.ok) {
            throw new Error(`ATTACHMENT_UNAVAILABLE:${acquireResult.error}`);
          }
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
          include: {
            backgroundAttachment: true,
            createdBy: { select: { id: true, name: true } },
          },
        });
      });

      const hydrated = await hydrateTemplateViewModel(created);
      return { success: true, data: hydrated };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.startsWith("ATTACHMENT_UNAVAILABLE:")) {
        return { success: false, error: msg.replace("ATTACHMENT_UNAVAILABLE:", ""), code: "ATTACHMENT_UNAVAILABLE" };
      }
      return { success: false, error: msg, code: "INTERNAL_ERROR" };
    }
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

      // 3. Invariant AA: Deterministic lock ordering on attachments (background + signatures + fonts)
      const oldAttId = existing.backgroundAttachmentId;
      const newAttId = input.backgroundAttachmentId;
      const oldSigIds = extractSignatureAttachmentIds(existing.layoutConfig);
      const newSigIds = extractSignatureAttachmentIds(input.layoutConfig);
      const oldFontIds = extractCustomFontAttachmentIds(existing.layoutConfig);
      const newFontIds = extractCustomFontAttachmentIds(input.layoutConfig);

      const allAttIdsToLock = Array.from(
        new Set([oldAttId, newAttId, ...oldSigIds, ...newSigIds, ...oldFontIds, ...newFontIds].filter(Boolean))
      );

      await lockAttachmentsInOrder(tx, allAttIdsToLock);

      // If background attachment changed, verify new attachment is ACTIVE
      if (oldAttId !== newAttId) {
        const acquire = await acquireAttachmentReference(tx, newAttId);
        if (!acquire.ok) {
          throw new Error(`ATTACHMENT_UNAVAILABLE:${acquire.error}`);
        }
      }

      // Acquire newly added signatures
      for (const sId of newSigIds) {
        if (!oldSigIds.includes(sId)) {
          const acquire = await acquireAttachmentReference(tx, sId);
          if (!acquire.ok) {
            throw new Error(`ATTACHMENT_UNAVAILABLE:${acquire.error}`);
          }
        }
      }

      // Acquire newly added custom fonts
      for (const fId of newFontIds) {
        if (!oldFontIds.includes(fId)) {
          const acquire = await acquireAttachmentReference(tx, fId);
          if (!acquire.ok) {
            throw new Error(`ATTACHMENT_UNAVAILABLE:${acquire.error}`);
          }
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

      // 5. Release references for removed background, signatures, or fonts
      let markedForDeletion = false;
      if (oldAttId !== newAttId) {
        const release = await releaseAttachmentReference(tx, oldAttId);
        if (release.markedForDeletion) markedForDeletion = true;
      }
      for (const sId of oldSigIds) {
        if (!newSigIds.includes(sId)) {
          const release = await releaseAttachmentReference(tx, sId);
          if (release.markedForDeletion) markedForDeletion = true;
        }
      }
      for (const fId of oldFontIds) {
        if (!newFontIds.includes(fId)) {
          const release = await releaseAttachmentReference(tx, fId);
          if (release.markedForDeletion) markedForDeletion = true;
        }
      }

      const updatedTemplate = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
        include: {
          backgroundAttachment: true,
          createdBy: { select: { id: true, name: true } },
        },
      });

      return { updatedTemplate, markedForDeletion };
    });

    // Post-commit: trigger async cleanup worker if old attachment became orphan
    if (result.markedForDeletion) {
      cleanupOrphanedAttachments().catch((err) => {
        console.warn("[saveTemplateService] Background cleanup notice:", err?.message);
      });
    }

    const hydrated = await hydrateTemplateViewModel(result.updatedTemplate);
    return { success: true, data: hydrated };
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
 * Enforces Invariants A, N, W (Lock-then-reread, ordered attachment locking).
 * Returns fully hydrated CertificateTemplateViewModel on success.
 */
export async function forkTemplateService(
  templateId: string,
  user: UserContext
): Promise<
  | { success: true; data: CertificateTemplateViewModel }
  | { success: false; error: string; code: string }
> {
  try {
    const forked = await prisma.$transaction(async (tx) => {
      // 1. Invariant 3: Lock source template row first!
      await tx.$queryRaw`SELECT id FROM "CertificateTemplate" WHERE id = ${templateId} FOR UPDATE;`;

      // 2. Invariant W: Re-read source template after acquiring row lock
      const source = await tx.certificateTemplate.findUnique({
        where: { id: templateId },
      });

      if (!source) {
        throw new Error("NOT_FOUND:Source template was deleted");
      }

      // Check permissions: cannot fork another user's private template unless admin
      if (source.scope === "PRIVATE" && source.createdById !== user.userId && !isAdmin(user)) {
        throw new Error("FORBIDDEN:Cannot fork another user's private template");
      }

      // 3. Collect persistent attachments (background + signatures + custom fonts)
      const sigIds = extractSignatureAttachmentIds(source.layoutConfig);
      const fontIds = extractCustomFontAttachmentIds(source.layoutConfig);
      const allAttIds = Array.from(new Set([source.backgroundAttachmentId, ...sigIds, ...fontIds].filter(Boolean)));

      // Lock attachments in deterministic order & verify ACTIVE
      await lockAttachmentsInOrder(tx, allAttIds);
      for (const attId of allAttIds) {
        const acquire = await acquireAttachmentReference(tx, attId);
        if (!acquire.ok) {
          throw new Error(`ATTACHMENT_UNAVAILABLE:${acquire.error}`);
        }
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
        include: {
          backgroundAttachment: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    const hydrated = await hydrateTemplateViewModel(forked);
    return { success: true, data: hydrated };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.startsWith("NOT_FOUND:")) {
      return { success: false, error: msg.replace("NOT_FOUND:", ""), code: "NOT_FOUND" };
    }
    if (msg.startsWith("FORBIDDEN:")) {
      return { success: false, error: msg.replace("FORBIDDEN:", ""), code: "FORBIDDEN" };
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

      // Lock all attachment rows before deleting template
      const sigIds = extractSignatureAttachmentIds(template.layoutConfig);
      const fontIds = extractCustomFontAttachmentIds(template.layoutConfig);
      const allAttIds = Array.from(new Set([template.backgroundAttachmentId, ...sigIds, ...fontIds].filter(Boolean)));

      await lockAttachmentsInOrder(tx, allAttIds);

      // Delete template row
      await tx.certificateTemplate.delete({
        where: { id: templateId },
      });

      // Release attachment references
      let markedForDeletion = false;
      for (const attId of allAttIds) {
        const release = await releaseAttachmentReference(tx, attId);
        if (release.markedForDeletion) markedForDeletion = true;
      }

      return { markedForDeletion };
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
 * Resolves storage URLs dynamically and serializes BigInt safely into CertificateTemplateViewModel.
 */
export async function getTemplatesService(user: UserContext): Promise<CertificateTemplateViewModel[]> {
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

  return Promise.all(templates.map((tmpl) => hydrateTemplateViewModel(tmpl)));
}
