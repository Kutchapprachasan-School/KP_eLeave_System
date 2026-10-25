"use client";

import React, { useState, useTransition } from "react";
import { 
  X, 
  FileText, 
  UploadCloud, 
  ExternalLink, 
  Trash2, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  FileCheck, 
  FileSpreadsheet, 
  Cloud 
} from "lucide-react";
import { addProjectAttachmentAction, deleteProjectAttachmentAction } from "@/app/actions/planning-attachment";
import type { ProjectAttachmentDTO, AttachmentType } from "@/lib/planning/types";

interface AttachmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  projectId: string;
  projectName: string;
  attachments: ProjectAttachmentDTO[];
  canManageAttachments: boolean;
}

const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, { label: string; icon: any; color: string }> = {
  PROPOSAL: { label: "เล่มโครงการที่จัดทำแล้ว", icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200" },
  APPROVAL: { label: "แบบขออนุมัติโครงการ", icon: FileCheck, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200" },
  SUMMARY: { label: "รายงานสรุปผลการดำเนินงาน (SAR)", icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200" },
  OTHER: { label: "เอกสารประกอบอื่น ๆ", icon: FileText, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200" },
};

export function AttachmentManagerModal({
  isOpen,
  onClose,
  onSaved,
  projectId,
  projectName,
  attachments,
  canManageAttachments,
}: AttachmentManagerModalProps) {
  const [showAddForm, setShowAddForm] = useState(attachments.length === 0);
  const [attachmentType, setAttachmentType] = useState<AttachmentType>("PROPOSAL");
  const [storageMode, setStorageMode] = useState<"UPLOAD" | "LINK">("UPLOAD");
  const [title, setTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("attachmentType", attachmentType);
    formData.append("storageType", storageMode === "UPLOAD" ? "R2_UPLOAD" : "EXTERNAL_LINK");
    if (title.trim()) formData.append("title", title.trim());

    if (storageMode === "UPLOAD") {
      if (!selectedFile) {
        setErrorMessage("กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด");
        return;
      }
      formData.append("file", selectedFile);
    } else {
      if (!externalUrl.trim()) {
        setErrorMessage("กรุณากรอกลิงก์เอกสารภายนอก (Google Drive, Canva, etc.)");
        return;
      }
      try {
        new URL(externalUrl.trim());
      } catch {
        setErrorMessage("ลิงก์ URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)");
        return;
      }
      formData.append("externalUrl", externalUrl.trim());
    }

    startTransition(async () => {
      const res = await addProjectAttachmentAction(formData);
      if (res.success) {
        setTitle("");
        setExternalUrl("");
        setSelectedFile(null);
        setShowAddForm(false);
        onSaved();
      } else {
        setErrorMessage(res.error || "เกิดข้อผิดพลาดในการแนบเอกสาร");
      }
    });
  };

  const handleDelete = (attachmentId: string) => {
    if (!confirm("คุณต้องการลบเอกสารแนบนี้ใช่หรือไม่?")) return;
    startTransition(async () => {
      const res = await deleteProjectAttachmentAction(attachmentId);
      if (res.success) {
        onSaved();
      } else {
        setErrorMessage(res.error || "ไม่สามารถลบเอกสารได้");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                จัดการเอกสารโครงการ & เล่ม SAR
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[320px]">
                {projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-800 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Current Attachments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                เอกสารที่แนบไว้ ({attachments.length} รายการ)
              </h3>
              {canManageAttachments && !showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>แนบเอกสารเพิ่ม</span>
                </button>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 text-sm">
                ยังไม่มีการแนบเอกสารโครงการหรือเล่มรายงาน SAR
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                {attachments.map((att) => {
                  const typeMeta = ATTACHMENT_TYPE_LABELS[att.attachmentType] || ATTACHMENT_TYPE_LABELS.OTHER;
                  const Icon = typeMeta.icon;
                  return (
                    <div
                      key={att.id}
                      className="p-4 bg-white dark:bg-gray-900 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeMeta.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {att.title || typeMeta.label}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                              {att.storageType === "R2" ? "Cloudflare R2" : "External Link"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {typeMeta.label}
                            {att.uploadedByUser?.name && ` • โดย ${att.uploadedByUser.name}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>เปิดดู</span>
                        </a>

                        {canManageAttachments && (
                          <button
                            type="button"
                            onClick={() => handleDelete(att.id)}
                            disabled={isPending}
                            className="h-9 w-9 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Attachment Form */}
          {canManageAttachments && showAddForm && (
            <form
              onSubmit={handleAddAttachment}
              className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/60 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-purple-950 dark:text-purple-300">
                  แนบเอกสารโครงการใหม่
                </h4>
                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ปิดฟอร์ม
                  </button>
                )}
              </div>

              {/* Attachment Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ประเภทเอกสาร <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(ATTACHMENT_TYPE_LABELS) as AttachmentType[]).map((t) => {
                    const active = attachmentType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAttachmentType(t)}
                        className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                          active
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            active ? "bg-white" : "bg-purple-500"
                          }`}
                        />
                        <span>{ATTACHMENT_TYPE_LABELS[t].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Storage Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  วิธีจัดเก็บไฟล์ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStorageMode("UPLOAD")}
                    className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      storageMode === "UPLOAD"
                        ? "bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border-purple-300"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>อัปโหลดไฟล์ตรง (R2 Cloud)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageMode("LINK")}
                    className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      storageMode === "LINK"
                        ? "bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border-purple-300"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>แนบลิงก์ (Drive / Canva)</span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ชื่อกำกับเอกสาร (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น เล่มโครงการฉบับสมบูรณ์ (หรือเว้นว่างเพื่อใช้ชื่อมาตรฐาน)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Mode Specific Input */}
              {storageMode === "UPLOAD" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    เลือกไฟล์เอกสาร (PDF, Word, Excel, รูปภาพ ไม่เกิน 20MB)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    URL ลิงก์เอกสารภายนอก
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/... หรือ https://www.canva.com/..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกและอัปโหลด...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>บันทึกเอกสาร</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
