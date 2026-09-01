export interface NormalizedAttachment {
  name: string;
  url: string;
  preview: string;
  isImage: boolean;
  isPdf: boolean;
  sizeBytes?: number;
  mimeType?: string;
}

/**
 * Normalizes any Supabase storage URL:
 * Converts temporary signed URLs (`/storage/v1/object/sign/...`) with expiring JWT tokens
 * into permanent public URLs (`/storage/v1/object/public/...`) without query tokens.
 */
export function normalizeStorageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("/storage/v1/object/sign/")) {
    const withoutToken = trimmed.split("?")[0];
    return withoutToken.replace("/storage/v1/object/sign/", "/storage/v1/object/public/");
  }
  return trimmed;
}

/**
 * Universal Parser for Leave Request documentUrl values
 * Safely parses:
 *  1. JSON string array of objects: '[{"name":"doc.pdf","preview":"data:..."}]'
 *  2. JSON string array of new objects: '[{"name":"doc.pdf","url":"https://...","preview":"https://..."}]'
 *  3. JSON string array of plain strings: '["https://.../a.jpg"]'
 *  4. Comma-delimited strings: "https://.../1.jpg,https://.../2.jpg"
 *  5. Single Base64 Data URL or HTTP URL
 */
export function parseDocumentUrls(documentUrl: string | null | undefined): NormalizedAttachment[] {
  if (!documentUrl || !documentUrl.trim()) return [];

  let rawList: any[] = [];
  const trimmed = documentUrl.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else {
        rawList = [parsed];
      }
    } catch {
      rawList = trimmed.split(",");
    }
  } else {
    rawList = trimmed.split(",");
  }

  return rawList
    .map((item, idx) => {
      let url = "";
      let name = "เอกสารแนบ " + (idx + 1);
      let sizeBytes: number | undefined;
      let mimeType: string | undefined;

      if (typeof item === "string") {
        url = item.trim();
      } else if (item && typeof item === "object") {
        url = item.url || item.preview || "";
        name = item.name || name;
        sizeBytes = item.sizeBytes || item.size;
        mimeType = item.mimeType || item.type;
      }

      if (!url) return null;

      url = normalizeStorageUrl(url);

      const isDataImage = url.startsWith("data:image/");
      const isDataPdf = url.startsWith("data:application/pdf");
      const cleanUrl = url.split("?")[0].toLowerCase();
      const isHttpImage = /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(cleanUrl);
      const isHttpPdf = /\.pdf$/i.test(cleanUrl);

      return {
        name,
        url,
        preview: url,
        isImage: isDataImage || isHttpImage,
        isPdf: isDataPdf || isHttpPdf || (!isDataImage && !isHttpImage),
        sizeBytes,
        mimeType,
      };
    })
    .filter((item): item is NormalizedAttachment => Boolean(item && item.url));
}

/**
 * Universal Attachment Viewer (Client-side)
 * Opens Base64 via Blob Object URL in new tab, or opens HTTP/HTTPS URL directly.
 */
export function handleViewAttachment(previewOrUrl: string, fileName?: string): void {
  if (!previewOrUrl) return;

  const normalized = normalizeStorageUrl(previewOrUrl);

  if (normalized.startsWith("data:")) {
    try {
      const parts = normalized.split(",");
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          '<iframe src="' +
            normalized +
            '" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>'
        );
      }
    }
  } else {
    // Supabase HTTP/HTTPS public URL (never expires)
    window.open(normalized, "_blank");
  }
}
