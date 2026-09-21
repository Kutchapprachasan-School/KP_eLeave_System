/**
 * Web Worker for Off-Main-Thread OMR Image Processing
 * Offloads heavy bilinear homography warp, marker detection, and bubble optical density sampling.
 */

import {
  processOmrSheet,
  evaluateImageQuality,
  RawImageData,
  QuadPoints,
  TemplateGridMetadata,
  OmrProcessOptions
} from "@/lib/omr/omrEngine";
import { detectFiducialMarkers } from "@/lib/omr/omrMarkerDetector";

export interface WorkerScanMessage {
  id: string;
  type: "PROCESS_FRAME" | "PRECHECK_IQG" | "DETECT_MARKERS";
  width: number;
  height: number;
  buffer: ArrayBuffer;
  corners?: QuadPoints;
  templateGrid?: TemplateGridMetadata;
  options?: OmrProcessOptions;
  expectedAspectRatio?: number;
}

addEventListener("message", (event: MessageEvent<WorkerScanMessage>) => {
  const { id, type, width, height, buffer, corners, templateGrid, options, expectedAspectRatio } = event.data;

  try {
    const rawImage: RawImageData = {
      width,
      height,
      data: new Uint8ClampedArray(buffer)
    };

    if (type === "DETECT_MARKERS") {
      const result = detectFiducialMarkers(rawImage.data, width, height, expectedAspectRatio ?? 1.0);
      postMessage({
        id,
        type: "MARKERS_DETECTED",
        result
      });
      return;
    }

    if (type === "PRECHECK_IQG") {
      const iqg = evaluateImageQuality(rawImage, corners, expectedAspectRatio ?? 1.0);
      postMessage({
        id,
        type: "IQG_PRECHECK_RESULT",
        iqg
      });
      return;
    }

    if (type === "PROCESS_FRAME") {
      if (!templateGrid) {
        throw new Error("Missing templateGrid for PROCESS_FRAME");
      }
      const result = processOmrSheet(rawImage, templateGrid, corners, options);
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
