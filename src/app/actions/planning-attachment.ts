"use server";

import {
  addProjectAttachmentAction as _addProjectAttachmentAction,
  deleteProjectAttachmentAction as _deleteProjectAttachmentAction,
} from "@/actions/planning/attachment-actions";

export async function addProjectAttachmentAction(formData: FormData) {
  return await _addProjectAttachmentAction(formData);
}

export async function deleteProjectAttachmentAction(attachmentId: string) {
  return await _deleteProjectAttachmentAction(attachmentId);
}
