"use client";

import React, { useRef, useState, useTransition } from "react";
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
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ActivityReportModalProps {
  project: ProjectDTO;
  activity: ProjectActivityDTO;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ActivityReportModal({
  project,
  activity,
  onClose,
  onUpdated,
}: ActivityReportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canUpload = Boolean(
    activity.permissions?.canUploadReport ??
    project.permissions?.canManageProjectsAndBudget
  );

  const existingReport = activity.reportAttachment;

  const [title, setTitle] = useState(
    existingReport?.title || `รายงานสรุปกิจกรรม ${activity.activityNo}: ${activity.name}`
  );
  const [storageType, setStorageType] = useState<StorageTypeValue>("R2_UPLOAD");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.set("projectId", project.id);
    formData.set("activityId", activity.id);
    formData.set("title", title.trim() || `รายงานสรุปกิจกรรม ${activity.name}`);
    formData.set("attachmentType", "SUMMARY");
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
      setSuccessMsg("บันทึกรายงานสรุปกิจกรรมเรียบร้อยแล้ว");
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
      setSuccessMsg("ลบรายงานสรุปกิจกรรมเรียบร้อยแล้ว");
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
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-xs">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                รายงานสรุปผลกิจกรรมย่อย
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {project.code} └─ กิจกรรมที่ {activity.activityNo}: {activity.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-5">
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

          {/* Current Attached Report Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              รายงานกิจกรรมปัจจุบัน
            </h3>

            {existingReport ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-600 text-white p-2 shrink-0 mt-0.5">
                    {existingReport.storageType === "EXTERNAL_LINK" ? (
                      <Link2 className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {existingReport.title || "รายงานสรุปกิจกรรมย่อย"}
                      </span>
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold px-2 py-0.5">
                        แนบแล้ว
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-2">
                      <span>โดย: {existingReport.uploadedByName || "บุคลากร"}</span>
                      {existingReport.createdAt && (
                        <span>
                          • {new Date(existingReport.createdAt).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={existingReport.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-all"
                  >
                    <span>เปิดดูรายงาน</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {canUpload && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(existingReport.id)}
                      disabled={isPending}
                      className="rounded-lg border border-rose-200 dark:border-rose-900/50 p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="ลบรายงานนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <Info className="h-4 w-4 shrink-0 text-slate-400" />
                <span>ยังไม่มีการแนบรายงานสรุปผลสำหรับกิจกรรมย่อยนี้</span>
              </div>
            )}
          </div>

          {/* Upload / Link Form (For Responsible User or Admins) */}
          {canUpload && (
            <form onSubmit={handleUploadSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {existingReport ? "อัปโหลดหรือแก้ไขรายงานใหม่" : "+ แนบรายงานสรุปกิจกรรมย่อย"}
              </h3>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อหัวข้อรายงาน
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น รายงานผลกิจกรรมการอบรมเชิงปฏิบัติการ"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      storageType === "R2_UPLOAD"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <UploadCloud className="h-4 w-4 text-emerald-600" />
                    <span>อัปโหลดไฟล์ (R2 Storage)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStorageType("EXTERNAL_LINK")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      storageType === "EXTERNAL_LINK"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <Link2 className="h-4 w-4 text-emerald-600" />
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
                    className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950/50 dark:file:text-emerald-300"
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
                    URL ลิงก์เอกสารรายงานภายนอก
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/... หรือ https://canva.com/..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    required
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>{existingReport ? "อัปเดตรายงาน" : "บันทึกรายงาน"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!canUpload && !existingReport && (
            <p className="text-center text-xs text-slate-400 py-3">
              เฉพาะผู้รับผิดชอบกิจกรรมนี้ ({activity.responsibleUser?.name || "ยังไม่ระบุ"}) หรือผู้ดูแลระบบเท่านั้นที่จะสามารถแนบรายงานได้
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
          title="ยืนยันการลบรายงานสรุปกิจกรรม"
          message="คุณต้องการลบไฟล์รายงานสรุปกิจกรรมนี้หรือไม่? การดำเนินการนี้จะลบไฟล์ออกจากระบบจัดเก็บ Cloudflare R2 อย่างถาวร"
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
