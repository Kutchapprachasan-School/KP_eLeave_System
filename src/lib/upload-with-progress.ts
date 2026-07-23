/**
 * Upload Photo Helper with Real-Time Progress (%) & Cancellation
 */

export interface UploadProgressInfo {
  percent: number;
  stage: "compressing" | "uploading" | "done";
  message?: string;
}

export function uploadPhotoWithProgress(
  formData: FormData,
  onProgress?: (info: UploadProgressInfo) => void
): { promise: Promise<any>; cancel: () => void } {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<any>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress({
          percent,
          stage: "uploading",
          message: `กำลังอัปโหลด... ${percent}%`,
        });
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          if (onProgress) {
            onProgress({ percent: 100, stage: "done", message: "อัปโหลดสำเร็จ" });
          }
          resolve(data);
        } else {
          reject(new Error(data.error || `อัปโหลดไม่สำเร็จ (${xhr.status})`));
        }
      } catch (err) {
        reject(new Error("เซิร์ฟเวอร์ตอบรับไม่ถูกต้อง"));
      }
    };

    xhr.onerror = () => reject(new Error("การเชื่อมต่อเครือข่ายขัดข้อง"));
    xhr.onabort = () => reject(new Error("ยกเลิกการอัปโหลดเรียบร้อยแล้ว"));

    xhr.open("POST", "/api/repair/upload-photo");
    xhr.send(formData);
  });

  return {
    promise,
    cancel: () => {
      xhr.abort();
    },
  };
}
