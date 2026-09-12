/**
 * ✍️ High-Fidelity Client-Side Signature Background Remover & Ink Extractor
 *
 * Provides instant transparent background processing for paper-signed teacher signatures.
 * Features:
 *  1. Perceptual luminance calculation (0.299R + 0.587G + 0.114B).
 *  2. Smooth anti-aliasing feathering around ink contours.
 *  3. Halo suppression (defringing) to remove paper-glow around strokes.
 *  4. Ink contrast boost for ballpoint / fountain pen strokes.
 *  5. Optional auto-cropping to trim excess empty margins.
 *  6. Node.js-safe pure pixel function for testability.
 */

export interface ProcessSignatureOptions {
  /**
   * Luminance threshold above which pixels are considered paper background (0..255).
   * Default: 215. Values between 180 and 240 work best for phone camera photos.
   */
  threshold?: number;

  /**
   * Smoothness range for anti-aliased edge feathering.
   * Default: 30.
   */
  smoothness?: number;

  /**
   * Automatically crop surrounding empty margins to fit the signature tightly.
   * Default: true.
   */
  autoCrop?: boolean;

  /**
   * Darken ink edges to prevent white fringing on colored certificates.
   * Default: true.
   */
  darkenInk?: boolean;

  /**
   * Padding in pixels around the cropped bounding box.
   * Default: 12.
   */
  cropPadding?: number;
}

export interface ProcessSignatureResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PixelBuffer {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface CropBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cropWidth: number;
  cropHeight: number;
}

/**
 * Pure mathematical pixel processor (safe in both Browser and Node.js).
 * Directly mutates the RGBA pixel array to turn bright paper transparent
 * while preserving smooth anti-aliased ink contours.
 */
export function processSignaturePixels(
  buffer: PixelBuffer,
  options: ProcessSignatureOptions = {}
): { boundingBox: CropBoundingBox } {
  const {
    threshold = 215,
    smoothness = 30,
    darkenInk = true,
  } = options;

  const { data, width, height } = buffer;
  const len = data.length;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const currentAlpha = data[i + 3];

    // Already fully transparent
    if (currentAlpha === 0) continue;

    // Perceptual luminance (standard ITU-R BT.601)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= threshold) {
      // Paper background -> completely transparent
      data[i + 3] = 0;
    } else {
      let finalAlpha = 255;

      if (lum > threshold - smoothness) {
        // Smooth transition edge
        const factor = (threshold - lum) / smoothness;
        finalAlpha = Math.round(factor * 255);
      }

      // Multiply by existing alpha if source was already semi-transparent
      const compositeAlpha = Math.round((currentAlpha / 255) * finalAlpha);
      data[i + 3] = compositeAlpha;

      if (compositeAlpha > 15) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Halo suppression / defringing: eliminate paper tint bleeding into stroke edges
        if (darkenInk) {
          const ratio = Math.min(1, Math.max(0.2, lum / threshold));
          data[i] = Math.round(r * ratio * 0.95);
          data[i + 1] = Math.round(g * ratio * 0.95);
          data[i + 2] = Math.round(b * ratio * 0.95);
        }
      }
    }
  }

  // Handle case where entire image was cleared or empty
  if (maxX < minX || maxY < minY) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }

  return {
    boundingBox: {
      minX,
      minY,
      maxX,
      maxY,
      cropWidth: maxX - minX + 1,
      cropHeight: maxY - minY + 1,
    },
  };
}

/**
 * Converts a File or Blob into a base64 Data URL.
 */
export function fileToDataUrl(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image from a URL or Data URL without crossOrigin restrictions on local schemes.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from "${src.slice(0, 50)}..."`));
    img.src = src;
  });
}

/**
 * High-Level Client Browser Function:
 * Removes paper background from a signature file and returns a transparent PNG Blob and Data URL.
 */
export async function removeSignatureBackground(
  imageSource: File | Blob | string,
  options: ProcessSignatureOptions = {}
): Promise<ProcessSignatureResult> {
  const { autoCrop = true, cropPadding = 12 } = options;

  let sourceUrl = "";
  let shouldRevoke = false;

  if (typeof imageSource === "string") {
    sourceUrl = imageSource;
  } else if (imageSource instanceof Blob) {
    sourceUrl = URL.createObjectURL(imageSource);
    shouldRevoke = true;
  }

  try {
    const img = await loadImageElement(sourceUrl);
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    // 1. Render to source canvas
    const canvas = document.createElement("canvas");
    canvas.width = origWidth;
    canvas.height = origHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create 2D canvas context for signature processing.");

    ctx.drawImage(img, 0, 0, origWidth, origHeight);
    const imageData = ctx.getImageData(0, 0, origWidth, origHeight);

    // 2. Process pixels
    const { boundingBox } = processSignaturePixels(imageData, options);
    ctx.putImageData(imageData, 0, 0);

    // 3. Auto-crop or return full image
    let outputCanvas = canvas;
    let finalWidth = origWidth;
    let finalHeight = origHeight;

    if (autoCrop && boundingBox.cropWidth > 10 && boundingBox.cropHeight > 10) {
      const p = Math.max(2, cropPadding);
      const startX = Math.max(0, boundingBox.minX - p);
      const startY = Math.max(0, boundingBox.minY - p);
      const endX = Math.min(origWidth, boundingBox.maxX + p);
      const endY = Math.min(origHeight, boundingBox.maxY + p);
      finalWidth = endX - startX;
      finalHeight = endY - startY;

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = finalWidth;
      cropCanvas.height = finalHeight;
      const cropCtx = cropCanvas.getContext("2d");
      if (cropCtx) {
        cropCtx.drawImage(
          canvas,
          startX,
          startY,
          finalWidth,
          finalHeight,
          0,
          0,
          finalWidth,
          finalHeight
        );
        outputCanvas = cropCanvas;
      }
    }

    // 4. Export as transparent PNG Blob
    const dataUrl = outputCanvas.toDataURL("image/png");
    const blob = await new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to encode canvas to PNG blob."));
        },
        "image/png"
      );
    });

    const aspectRatio = Math.round((finalWidth / finalHeight) * 100) / 100;

    return {
      blob,
      dataUrl,
      width: finalWidth,
      height: finalHeight,
      aspectRatio,
    };
  } finally {
    if (shouldRevoke && sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
  }
}
