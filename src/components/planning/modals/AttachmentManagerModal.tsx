"use client";

import React, { useRef, useState, useTransition } from "react";
import {
  addProjectAttachmentAction,
  deleteProjectAttachmentAction,
} from "@/actions/planning/attachment-actions";
import {
  ATTACHMENT_TYPE_LABELS,
  AttachmentCategoryType,
  AttachmentTypeValue,
  ProjectAttachmentDTO,
  ProjectDTO,
  StorageTypeValue,
} from "@/lib/planning/types";
import {
  X,
  Paperclip,
  UploadCloud,
  Link2,
  ExternalLink,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface AttachmentManagerModalProps {
  project?: ProjectDTO;
  onClose: () => void;
  onUpdated?: () => void;
  // Legacy / alternate prop support
  isOpen?: boolean;
  onSaved?: () => void;
  projectId?: string;
  projectName?: string;
  attachments?: ProjectAttachmentDTO[];
  canManageAttachments?: boolean;
}

export function AttachmentManagerModal({
  project,
  onClose,
  onUpdated,
  isOpen = true,
  onSaved,
  projectId: propProjectId,
  projectName: propProjectName,
  attachments: propAttachments,
  canManageAttachments: propCanManageAttachments,
}: AttachmentManagerModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdated = onUpdated || onSaved || onClose;
  const resolvedProjectId = project?.id || propProjectId || "";
  const resolvedProjectName = project ? `${project.code}: ${project.name}` : (propProjectName || "โครงการ");
  const attachmentList = project?.attachments || propAttachments || [];
  const canManage =
    propCanManageAttachments ??
    project?.permissions?.canManageAttachments ??
    false;

  const [title, setTitle] = useState("");
  const [attachmentType, setAttachmentType] =
    useState<AttachmentCategoryType>("PROPOSAL");
  const [storageType, setStorageType] =
    useState<StorageTypeValue>("R2_UPLOAD");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("projectId", resolvedProjectId);
    formData.set("title", title.trim());
    formData.set("attachmentType", attachmentType);
    formData.set("storageType", storageType);

    if (storageType === "EXTERNAL_LINK") {
      formData.set("externalUrl", externalUrl.trim());
    } else {
      if (!selectedFile) {
        setErrorMsg("กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด");
        return;
      }
      formData.set("file", selectedFile);
    }

    startTransition(async () => {
      const res = await addProjectAttachmentAction(formData);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }

      // Reset form
      setTitle("");
      setExternalUrl("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      handleUpdated();
    });
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    attachmentId: string;
    docTitle: string;
    isPending: boolean;
  }>({
    isOpen: false,
    attachmentId: "",
    docTitle: "",
    isPending: false,
  });

  const handleDelete = (attachmentId: string, docTitle: string) => {
    setDeleteConfirm({
      isOpen: true,
      attachmentId,
      docTitle,
      isPending: false,
    });
  };

  const handleConfirmDeleteAttachment = () => {
    setDeleteConfirm((prev) => ({ ...prev, isPending: true }));
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await deleteProjectAttachmentAction(
          deleteConfirm.attachmentId
        );
        if (!res.success) {
          setErrorMsg(res.error);
          return;
        }
        setDeleteConfirm({
          isOpen: false,
          attachmentId: "",
          docTitle: "",
          isPending: false,
        });
        handleUpdated();
      } finally {
        setDeleteConfirm((prev) => ({ ...prev, isPending: false }));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                เอกสารแนบโครงการ & รายงานประกันคุณภาพ (SAR)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {resolvedProjectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* รายการเอกสารที่แนบไว้แล้ว */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              รายการเอกสารในระบบ ({attachmentList.length} รายการ)
            </h3>

            {attachmentList.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-gray-800/40 dark:text-slate-400">
                ยังไม่มีเอกสารแนบในโครงการนี้
              </div>
            ) : (
              <div className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-gray-800/40">
                {attachmentList.map((att) => {
                  const uName = att.uploadedBy?.name || att.uploadedByName || "ไม่ระบุ";
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          {att.storageType === "R2_UPLOAD" ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {ATTACHMENT_TYPE_LABELS[att.attachmentType] || att.attachmentType}
                            </span>
                            {att.fileUrl ? (
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                              >
                                <span>{att.title}</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {att.title}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {att.storageType === "R2_UPLOAD"
                              ? "Cloudflare R2 Storage"
                              : "ลิงก์ภายนอก (Drive / Canva)"}{" "}
                            • อัปโหลดโดย {uName} เมื่อ{" "}
                            {new Date(att.createdAt).toLocaleDateString("th-TH")}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(att.id, att.title)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                          title="ลบเอกสาร"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ฟอร์มเพิ่มเอกสารใหม่ */}
          {canManage && (
            <form
              onSubmit={handleUploadSubmit}
              className="space-y-4 rounded-xl border border-blue-200/80 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  + เพิ่มเอกสารโครงการใหม่
                </h3>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setStorageType("R2_UPLOAD")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
                      storageType === "R2_UPLOAD"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    อัปโหลดไฟล์ (R2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageType("EXTERNAL_LINK")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
                      storageType === "EXTERNAL_LINK"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    ลิงก์ภายนอก (Drive/Canva)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    หมวดหมู่เอกสาร <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={attachmentType}
                    onChange={(e) =>
                      setAttachmentType(e.target.value as AttachmentCategoryType)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.entries(ATTACHMENT_TYPE_LABELS).map(
                      ([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ชื่อเอกสารที่แสดงผล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น เล่มโครงการฉบับอนุมัติ ปี 2569"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {storageType === "R2_UPLOAD" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    เลือกไฟล์ (PDF, Word, Excel, รูปภาพ ไม่เกิน 25 MB){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:file:bg-blue-900/50 dark:file:text-blue-200"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    URL ลิงก์ภายนอก (Google Drive, OneDrive, Canva){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isPending ? "กำลังบันทึกเอกสาร..." : "บันทึกเอกสารแนบ"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="ยืนยันการลบเอกสาร"
        description={`คุณต้องการลบเอกสาร "${deleteConfirm.docTitle}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        isPending={deleteConfirm.isPending}
        onConfirm={handleConfirmDeleteAttachment}
        onCancel={() =>
          setDeleteConfirm({
            isOpen: false,
            attachmentId: "",
            docTitle: "",
            isPending: false,
          })
        }
      />
    </div>
  );
}
