"use client";

import React, { useRef, useState, useTransition, useEffect } from "react";
import {
  addProjectAttachmentAction,
  deleteProjectAttachmentAction,
} from "@/actions/planning/attachment-actions";
import {
  ProjectActivityDTO,
  ProjectDTO,
  StorageTypeValue,
} from "@/lib/planning/types";
import {
  X,
  FileCheck2,
  UploadCloud,
  Link2,
  ExternalLink,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Layers,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

export type ActivityFileTab = "DOCUMENT" | "REPORT";

export interface ActivityReportModalProps {
  project: ProjectDTO;
  activity: ProjectActivityDTO;
  initialTab?: ActivityFileTab;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ActivityReportModal({
  project,
  activity,
  initialTab = "DOCUMENT",
  onClose,
  onUpdated,
}: ActivityReportModalProps) {
  const [activeTab, setActiveTab] = useState<ActivityFileTab>(initialTab);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canUpload = Boolean(
    activity.permissions?.canUploadReport ??
    activity.permissions?.canManageFiles ??
    project.permissions?.canManageProjectsAndBudget
  );

  const existingDoc = activity.documentAttachment;
  const existingReport = activity.reportAttachment;

  const currentExisting = activeTab === "DOCUMENT" ? existingDoc : existingReport;
  const defaultTitle =
    activeTab === "DOCUMENT"
      ? (existingDoc?.title || `ไฟล์กิจกรรม ${activity.activityNo}: ${activity.name}`)
      : (existingReport?.title || `รายงานสรุปกิจกรรม ${activity.activityNo}: ${activity.name}`);

  const [title, setTitle] = useState(defaultTitle);
  const [storageType, setStorageType] = useState<StorageTypeValue>("R2_UPLOAD");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setTitle(
      activeTab === "DOCUMENT"
        ? (existingDoc?.title || `ไฟล์กิจกรรม ${activity.activityNo}: ${activity.name}`)
        : (existingReport?.title || `รายงานสรุปกิจกรรม ${activity.activityNo}: ${activity.name}`)
    );
    setSelectedFile(null);
    setExternalUrl("");
    setErrorMsg(null);
    setSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activeTab, existingDoc, existingReport, activity.activityNo, activity.name]);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const attachmentType = activeTab === "DOCUMENT" ? "PROPOSAL" : "SUMMARY";
    const tabName = activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานสรุปกิจกรรม";

    const formData = new FormData();
    formData.set("projectId", project.id);
    formData.set("activityId", activity.id);
    formData.set("title", title.trim() || `${tabName} ${activity.name}`);
    formData.set("attachmentType", attachmentType);
    formData.set("storageType", storageType);

    if (storageType === "EXTERNAL_LINK") {
      if (!externalUrl.trim() || !/^https?:\/\//i.test(externalUrl.trim())) {
        setErrorMsg("กรุณาระบุลิงก์ภายนอกที่ขึ้นต้นด้วย http:// หรือ https://");
        return;
      }
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
      setSuccessMsg(`บันทึก${tabName}เรียบร้อยแล้ว`);
      setSelectedFile(null);
      setExternalUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onUpdated) onUpdated();
    });
  };

  const handleDelete = (attachmentId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await deleteProjectAttachmentAction(attachmentId);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }
      setSuccessMsg("ลบเอกสารเรียบร้อยแล้ว");
      setConfirmDeleteId(null);
      if (onUpdated) onUpdated();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                จัดการเอกสารกิจกรรมย่อย
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {project.code} └─ กิจกรรมที่ {activity.activityNo}: {activity.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher: 1. ไฟล์กิจกรรม / 2. รายงานกิจกรรม */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("DOCUMENT")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "DOCUMENT"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>1. ไฟล์กิจกรรม (เอกสาร/โครงการย่อย)</span>
            {existingDoc && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="แนบแล้ว" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REPORT")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "REPORT"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>2. รายงานกิจกรรม (สรุปผลการดำเนินงาน)</span>
            {existingReport && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="แนบแล้ว" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {/* Status Banners */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Attached File Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {activeTab === "DOCUMENT" ? "ไฟล์กิจกรรมปัจจุบัน" : "รายงานสรุปกิจกรรมปัจจุบัน"}
            </h3>

            {currentExisting ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 text-white shrink-0 mt-0.5 ${activeTab === "DOCUMENT" ? "bg-blue-600" : "bg-emerald-600"}`}>
                    {currentExisting.storageType === "EXTERNAL_LINK" ? (
                      <Link2 className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {currentExisting.title || (activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานสรุปกิจกรรม")}
                      </span>
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold px-2 py-0.5">
                        แนบแล้ว
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-2">
                      <span>โดย: {currentExisting.uploadedByName || "บุคลากร"}</span>
                      {currentExisting.createdAt && (
                        <span>
                          • {new Date(currentExisting.createdAt).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={currentExisting.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all ${
                      activeTab === "DOCUMENT" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <span>เปิดดูเอกสาร</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {canUpload && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(currentExisting.id)}
                      disabled={isPending}
                      className="rounded-lg border border-rose-200 dark:border-rose-900/50 p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="ลบเอกสารนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <Info className="h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {activeTab === "DOCUMENT"
                    ? "ยังไม่มีการแนบไฟล์กิจกรรมสำหรับกิจกรรมย่อยนี้"
                    : "ยังไม่มีการแนบรายงานสรุปผลสำหรับกิจกรรมย่อยนี้"}
                </span>
              </div>
            )}
          </div>

          {/* Upload / Link Form */}
          {canUpload && (
            <form onSubmit={handleUploadSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {currentExisting
                  ? `อัปโหลดหรือแก้ไข ${activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานกิจกรรม"} ใหม่`
                  : `+ แนบ ${activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานกิจกรรม"}`}
              </h3>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อหัวข้อเอกสาร
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    activeTab === "DOCUMENT"
                      ? "เช่น เอกสารโครงการย่อย/กำหนดการจัดกิจกรรม"
                      : "เช่น รายงานผลกิจกรรมการอบรมเชิงปฏิบัติการ"
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Storage Type Radio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  รูปแบบการจัดเก็บเอกสาร
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStorageType("R2_UPLOAD")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all cursor-pointer ${
                      storageType === "R2_UPLOAD"
                        ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <UploadCloud className="h-4 w-4 text-blue-600" />
                    <span>อัปโหลดไฟล์ (R2 Storage)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStorageType("EXTERNAL_LINK")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all cursor-pointer ${
                      storageType === "EXTERNAL_LINK"
                        ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <Link2 className="h-4 w-4 text-blue-600" />
                    <span>ลิงก์ภายนอก (GDrive / Canva)</span>
                  </button>
                </div>
              </div>

              {/* File Upload Input vs External URL Input */}
              {storageType === "R2_UPLOAD" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เลือกไฟล์เอกสาร (PDF, Word, Excel, รูปภาพ ไม่เกิน 25MB)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/50 dark:file:text-blue-300 cursor-pointer"
                    required={!selectedFile}
                  />
                  {selectedFile && (
                    <p className="mt-1 text-xs text-emerald-600">
                      ✓ เลือกแล้ว: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    URL ลิงก์เอกสารภายนอก
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/... หรือ https://canva.com/..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    required
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 shadow-xs cursor-pointer ${
                    activeTab === "DOCUMENT"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>
                        {currentExisting
                          ? `อัปเดต${activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานกิจกรรม"}`
                          : `บันทึก${activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานกิจกรรม"}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!canUpload && !currentExisting && (
            <p className="text-center text-xs text-slate-400 py-3">
              เฉพาะผู้รับผิดชอบกิจกรรมนี้ ({activity.responsibleUser?.name || "ยังไม่ระบุ"}) หรือผู้ดูแลระบบเท่านั้นที่จะสามารถแนบเอกสารได้
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Delete */}
      {confirmDeleteId && (
        <ConfirmDialog
          title={`ยืนยันการลบ${activeTab === "DOCUMENT" ? "ไฟล์กิจกรรม" : "รายงานกิจกรรม"}`}
          message="คุณต้องการลบไฟล์นี้หรือไม่? การดำเนินการนี้จะลบไฟล์ออกจากระบบจัดเก็บ Cloudflare R2 อย่างถาวร"
          confirmLabel="ยืนยันการลบ"
          confirmVariant="danger"
          isLoading={isPending}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
