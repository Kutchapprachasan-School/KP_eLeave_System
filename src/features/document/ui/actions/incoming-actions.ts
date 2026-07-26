"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { eventPublisher } from "@/core/infrastructure/event-bus";
import { AcknowledgeAndReportUseCase } from "../../application/use-cases/acknowledge-and-report.use-case";
import { CreateExecutiveDirectiveUseCase } from "../../application/use-cases/create-executive-directive.use-case";
import { getSession } from "@/lib/auth-session";

export async function submitDocumentAction(formData: {
  routingId: string;
  userId: string;
  documentId: string;
  actionReport?: string;
  actionAttachmentUrl?: string;
}) {
  try {
    const session = await getSession().catch(() => null);
    if (!session?.user && process.env.BYPASS_AUTH !== "true") {
      throw new Error("Unauthorized");
    }

    const useCase = new AcknowledgeAndReportUseCase(prisma, eventPublisher);
    
    await useCase.execute({
      routingId: formData.routingId,
      userId: formData.userId,
      actionReport: formData.actionReport,
      actionAttachmentUrl: formData.actionAttachmentUrl,
    });

    revalidatePath(`/document/incoming/${formData.documentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitExecutiveDirectiveAction(formData: {
  incomingDocId: string;
  assigneeId: string;
  assigneeName: string;
  standardDirective?: string;
  directiveText?: string;
  signatureUrl?: string;
  dueDate?: string;
}) {
  try {
    const session = await getSession().catch(() => null);
    const userId = session?.user?.id || "admin";

    const useCase = new CreateExecutiveDirectiveUseCase(prisma, eventPublisher);

    await useCase.execute({
      incomingDocId: formData.incomingDocId,
      assignedById: userId,
      assigneeId: formData.assigneeId,
      assigneeName: formData.assigneeName,
      standardDirective: formData.standardDirective,
      directiveText: formData.directiveText,
      signatureUrl: formData.signatureUrl,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });

    revalidatePath(`/document/incoming/${formData.incomingDocId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
