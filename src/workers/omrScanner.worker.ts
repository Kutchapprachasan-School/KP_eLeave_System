/**
 * Web Worker for Off-Main-Thread OMR Image Processing
 * Offloads heavy bilinear homography warp and bubble optical density sampling.
 */

import {
  processOmrSheet,
  evaluateImageQuality,
  RawImageData,
  QuadPoints,
  TemplateGridMetadata
} from "@/lib/omr/omrEngine";

export interface WorkerScanMessage {
  id: string;
  type: "PROCESS_FRAME" | "PRECHECK_IQG";
  width: number;
  height: number;
  buffer: ArrayBuffer;
  corners?: QuadPoints;
  templateGrid: TemplateGridMetadata;
}

addEventListener("message", (event: MessageEvent<WorkerScanMessage>) => {
  const { id, type, width, height, buffer, corners, templateGrid } = event.data;

  try {
    const rawImage: RawImageData = {
      width,
      height,
      data: new Uint8ClampedArray(buffer)
    };

    if (type === "PRECHECK_IQG") {
      const iqg = evaluateImageQuality(rawImage, corners);
      postMessage({
        id,
        type: "IQG_PRECHECK_RESULT",
        iqg
      });
      return;
    }

    if (type === "PROCESS_FRAME") {
      const result = processOmrSheet(rawImage, templateGrid, corners);
      postMessage({
        id,
        type: "FRAME_PROCESSED",
        result
      });
      return;
    }
  } catch (err: any) {
    postMessage({
      id,
      type: "ERROR",
      error: err.message || "Failed to process image frame in worker."
    });
  }
});
