import crypto from "crypto";
import { prisma } from "../db.ts";
import { PolicyType } from "@prisma/client";

export function computeCanonicalHash(markdown: string): string {
  const normalized = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

export async function publishPolicyDocument(params: {
  type: PolicyType;
  version: string;
  title: string;
  contentMarkdown: string;
  effectiveAt: Date;
}) {
  const contentHash = computeCanonicalHash(params.contentMarkdown);
  return await prisma.$transaction(async (tx) => {
    await tx.policyDocument.updateMany({
      where: { type: params.type, isCurrent: true },
      data: { isCurrent: false },
    });
    return await tx.policyDocument.create({
      data: {
        type: params.type,
        version: params.version,
        title: params.title,
        contentMarkdown: params.contentMarkdown,
        contentHash,
        effectiveAt: params.effectiveAt,
        isCurrent: true,
        publishedAt: new Date(),
      },
    });
  });
}

export async function getCurrentPolicy(type: PolicyType) {
  return await prisma.policyDocument.findFirst({
    where: { type, isCurrent: true },
  });
}

export async function acknowledgePolicy(params: {
  userId: string;
  policyDocumentId: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const policy = await prisma.policyDocument.findUniqueOrThrow({
    where: { id: params.policyDocumentId },
  });
  return await prisma.policyAcknowledgment.upsert({
    where: {
      userId_policyDocumentId: {
        userId: params.userId,
        policyDocumentId: params.policyDocumentId,
      },
    },
    create: {
      userId: params.userId,
      policyDocumentId: params.policyDocumentId,
      policyVersionSnapshot: policy.version,
      contentHashSnapshot: policy.contentHash,
      source: params.source || "WEB_APP",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    update: {
      acknowledgedAt: new Date(),
      source: params.source || "WEB_APP",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function hasUserAcknowledgedCurrentPolicy(userId: string, type: PolicyType) {
  const current = await getCurrentPolicy(type);
  if (!current) return { hasAcknowledged: true };
  const ack = await prisma.policyAcknowledgment.findUnique({
    where: {
      userId_policyDocumentId: {
        userId,
        policyDocumentId: current.id,
      },
    },
  });
  return { hasAcknowledged: !!ack, currentPolicy: current };
}
