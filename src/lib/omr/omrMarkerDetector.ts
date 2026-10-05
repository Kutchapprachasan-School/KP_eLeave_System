/**
 * KP Academic OMR - Real-Time 6-Point Fiducial Marker Detection Engine (ZipGrade Architecture)
 * 
 * ตรวจจับมาร์กเกอร์สี่เหลี่ยมดำ 6 จุด (4 มุมหลัก + 2 จุดกึ่งกลางซ้าย-ขวา) จากเฟรมกล้องมือถือแบบ real-time
 * Algorithm: Downsample → Grayscale → Otsu Threshold → Connected Components → Square Filter → 6-Point Collinearity Validation
 * เป้าหมาย: ≤200ms ต่อเฟรม @ 480p บนมือถือ
 */

import type { Point2D, QuadPoints } from "./omrEngine";

export interface SixPointMarkers extends QuadPoints {
  midLeft?: Point2D;
  midRight?: Point2D;
}

export interface MarkerDetectionResult {
  /** ตรวจพบครบอย่างน้อย 4 มุมหลักหรือไม่ (6 จุดจะได้ความแม่นยำสูงสุดแบบ Piecewise Homography) */
  found: boolean;
  /** จำนวนมาร์กเกอร์ที่ตรวจพบ (0-6) */
  markersDetected: number;
  /** พิกัด 4 มุมหลัก + 2 จุดกึ่งกลาง (null หากไม่ครบ) */
  corners: SixPointMarkers | null;
  /** จุดกึ่งกลางซ้าย-ขวา สำหรับทำ Piecewise Dual-Zone Homography แบบ ZipGrade */
  midPoints?: { midLeft: Point2D; midRight: Point2D } | null;
  /** ระดับความเชื่อมั่น 0.0 - 1.0 */
  confidence: number;
  /** เวลาประมวลผล (ms) */
  processingTimeMs: number;
}

interface BlobInfo {
  id: number;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** จุดศูนย์กลาง */
  cx: number;
  cy: number;
}

/**
 * Bradley-Roth Adaptive Thresholding using Integral Image
 * Fast O(N) local adaptive thresholding that adapts to local illumination gradients,
 * hand shadows, and darker desk backgrounds.
 */
function adaptiveThresholdBradley(
  gray: Uint8Array,
  width: number,
  height: number,
  windowSizeFraction: number = 16,
  thresholdMultiplier: number = 0.82
): Uint8Array {
  const binary = new Uint8Array(width * height);
  const intImg = new Float64Array(width * height);

  // 1. Build integral image
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const rowOffset = y * width;
    const prevRowOffset = (y - 1) * width;
    for (let x = 0; x < width; x++) {
      rowSum += gray[rowOffset + x];
      intImg[rowOffset + x] = (y > 0 ? intImg[prevRowOffset + x] : 0) + rowSum;
    }
  }

  // 2. Perform local threshold comparison
  const s = Math.max(8, Math.round(width / windowSizeFraction));
  const s2 = Math.floor(s / 2);

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - s2);
    const y2 = Math.min(height - 1, y + s2);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width - 1, x + s2);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const sum =
        intImg[y2 * width + x2] -
        (x1 > 0 ? intImg[y2 * width + (x1 - 1)] : 0) -
        (y1 > 0 ? intImg[(y1 - 1) * width + x2] : 0) +
        (x1 > 0 && y1 > 0 ? intImg[(y1 - 1) * width + (x1 - 1)] : 0);

      // Inverted: dark marker = 1, bright background = 0
      // If pixel is at least 18% darker than local mean:
      if (gray[rowOffset + x] * count <= sum * thresholdMultiplier) {
        binary[rowOffset + x] = 1;
      }
    }
  }

  return binary;
}

/**
 * Connected Component Labeling (8-connected) บน binary image
 * ใช้ two-pass algorithm พร้อม union-find
 */
function connectedComponents(
  binary: Uint8Array,
  width: number,
  height: number
): { labels: Int32Array; blobCount: number } {
  const labels = new Int32Array(width * height);
  const parent: number[] = [0]; // parent[0] = background
  let nextLabel = 1;

  // Union-Find functions
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  // Pass 1: Assign labels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 0) continue; // background (white=0 in inverted)

      const neighbors: number[] = [];
      // 8-connected: check top-left, top, top-right, left
      if (y > 0 && x > 0 && labels[(y - 1) * width + (x - 1)] > 0)
        neighbors.push(labels[(y - 1) * width + (x - 1)]);
      if (y > 0 && labels[(y - 1) * width + x] > 0)
        neighbors.push(labels[(y - 1) * width + x]);
      if (y > 0 && x < width - 1 && labels[(y - 1) * width + (x + 1)] > 0)
        neighbors.push(labels[(y - 1) * width + (x + 1)]);
      if (x > 0 && labels[y * width + (x - 1)] > 0)
        neighbors.push(labels[y * width + (x - 1)]);

      if (neighbors.length === 0) {
        labels[idx] = nextLabel;
        parent.push(nextLabel);
        nextLabel++;
      } else {
        const minLabel = Math.min(...neighbors);
        labels[idx] = minLabel;
        for (const n of neighbors) {
          if (n !== minLabel) union(n, minLabel);
        }
      }
    }
  }

  // Pass 2: Resolve labels
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] > 0) {
      labels[i] = find(labels[i]);
    }
  }

  return { labels, blobCount: nextLabel - 1 };
}

/**
 * ดึงข้อมูล blob (connected component) จาก label map
 */
function extractBlobs(
  labels: Int32Array,
  width: number,
  height: number
): BlobInfo[] {
  const blobMap = new Map<number, BlobInfo>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const label = labels[y * width + x];
      if (label === 0) continue;

      if (!blobMap.has(label)) {
        blobMap.set(label, {
          id: label,
          area: 0,
          minX: x, maxX: x,
          minY: y, maxY: y,
          cx: 0, cy: 0
        });
      }

      const blob = blobMap.get(label)!;
      blob.area++;
      blob.minX = Math.min(blob.minX, x);
      blob.maxX = Math.max(blob.maxX, x);
      blob.minY = Math.min(blob.minY, y);
      blob.maxY = Math.max(blob.maxY, y);
      blob.cx += x;
      blob.cy += y;
    }
  }

  for (const blob of blobMap.values()) {
    blob.cx /= blob.area;
    blob.cy /= blob.area;
  }

  return Array.from(blobMap.values());
}

/**
 * กรอง blobs ที่เป็นสี่เหลี่ยมดำ (มาร์กเกอร์)
 */
function filterSquareMarkers(
  blobs: BlobInfo[],
  imageWidth: number,
  imageHeight: number
): BlobInfo[] {
  const totalArea = imageWidth * imageHeight;
  const minArea = Math.max(10, Math.round(totalArea * 0.00008)); // ~10 - 25 px on 480p
  const maxArea = Math.round(totalArea * 0.05);                  // 5% ของภาพ

  return blobs.filter(blob => {
    // ขนาดต้องอยู่ในช่วง
    if (blob.area < minArea || blob.area > maxArea) return false;

    // สัดส่วน bounding box ต้องใกล้สี่เหลี่ยมจัตุรัส (อนุโลมมุมเอียงกล้อง)
    const bboxW = blob.maxX - blob.minX + 1;
    const bboxH = blob.maxY - blob.minY + 1;
    const aspectRatio = bboxW / bboxH;
    if (aspectRatio < 0.52 || aspectRatio > 1.92) return false;

    // Solidity: area / bounding box area ต้อง > 0.65
    const bboxArea = bboxW * bboxH;
    const solidity = blob.area / bboxArea;
    if (solidity < 0.65) return false;

    return true;
  });
}

/**
 * จัดเรียง 4-6 มาร์กเกอร์เป็น TL, TR, BL, BR (+ ML, MR สำหรับระบบ 6 จุดแบบ ZipGrade)
 */
function assignMarkers(
  markers: BlobInfo[],
  scaleX: number,
  scaleY: number
): { corners: SixPointMarkers; midPoints: { midLeft: Point2D; midRight: Point2D } | null; matchedCount: number } {
  if (markers.length < 4) {
    throw new Error("At least 4 markers required to assign corners");
  }

  // 1. Identify 4 extreme corners using projection extrema:
  // TL: minimizes (x + y)
  // TR: maximizes (x - y)
  // BL: minimizes (x - y)
  // BR: maximizes (x + y)
  let tl = markers[0], tr = markers[0], bl = markers[0], br = markers[0];
  let minSum = Infinity, maxSum = -Infinity;
  let minDiff = Infinity, maxDiff = -Infinity;

  for (const m of markers) {
    const sum = m.cx + m.cy;
    const diff = m.cx - m.cy;

    if (sum < minSum) { minSum = sum; tl = m; }
    if (sum > maxSum) { maxSum = sum; br = m; }
    if (diff > maxDiff) { maxDiff = diff; tr = m; }
    if (diff < minDiff) { minDiff = diff; bl = m; }
  }

  // Ensure 4 distinct corners
  const cornerIds = new Set([tl.id, tr.id, bl.id, br.id]);
  if (cornerIds.size < 4) {
    const sortedY = [...markers].sort((a, b) => a.cy - b.cy);
    const top = [sortedY[0], sortedY[1]].sort((a, b) => a.cx - b.cx);
    const bot = [sortedY[sortedY.length - 2], sortedY[sortedY.length - 1]].sort((a, b) => a.cx - b.cx);
    tl = top[0];
    tr = top[1];
    bl = bot[0];
    br = bot[1];
  }

  const corners: SixPointMarkers = {
    topLeft: { x: tl.cx * scaleX, y: tl.cy * scaleY },
    topRight: { x: tr.cx * scaleX, y: tr.cy * scaleY },
    bottomLeft: { x: bl.cx * scaleX, y: bl.cy * scaleY },
    bottomRight: { x: br.cx * scaleX, y: br.cy * scaleY }
  };

  // 2. If at least 6 markers, search for midLeft & midRight among the non-corner markers
  if (markers.length >= 6) {
    const remaining = markers.filter(m => m.id !== tl.id && m.id !== tr.id && m.id !== bl.id && m.id !== br.id);

    const expectedMlX = (tl.cx + bl.cx) / 2;
    const expectedMlY = (tl.cy + bl.cy) / 2;
    const expectedMrX = (tr.cx + br.cx) / 2;
    const expectedMrY = (tr.cy + br.cy) / 2;

    const leftH = Math.hypot(bl.cx - tl.cx, bl.cy - tl.cy);
    const rightH = Math.hypot(br.cx - tr.cx, br.cy - tr.cy);
    const maxH = Math.max(leftH, rightH, 1);

    let mlCandidate: BlobInfo | null = null;
    let mlMinDist = Infinity;
    let mrCandidate: BlobInfo | null = null;
    let mrMinDist = Infinity;

    for (const rem of remaining) {
      const dL = Math.hypot(rem.cx - expectedMlX, rem.cy - expectedMlY);
      const dR = Math.hypot(rem.cx - expectedMrX, rem.cy - expectedMrY);

      if (dL < mlMinDist) { mlMinDist = dL; mlCandidate = rem; }
      if (dR < mrMinDist) { mrMinDist = dR; mrCandidate = rem; }
    }

    if (
      mlCandidate && mrCandidate &&
      mlCandidate.id !== mrCandidate.id &&
      (mlMinDist / maxH) < 0.22 &&
      (mrMinDist / maxH) < 0.22
    ) {
      const ml: Point2D = { x: mlCandidate.cx * scaleX, y: mlCandidate.cy * scaleY };
      const mr: Point2D = { x: mrCandidate.cx * scaleX, y: mrCandidate.cy * scaleY };
      corners.midLeft = ml;
      corners.midRight = mr;
      return {
        corners,
        midPoints: { midLeft: ml, midRight: mr },
        matchedCount: 6
      };
    }
  }

  return {
    corners,
    midPoints: null,
    matchedCount: 4
  };
}

/**
 * ตรวจสอบว่า quad ที่ได้มีรูปทรงสมเหตุสมผล
 */
function validateQuad(quad: QuadPoints): boolean {
  const dist = (p1: Point2D, p2: Point2D) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  const topW = dist(quad.topLeft, quad.topRight);
  const bottomW = dist(quad.bottomLeft, quad.bottomRight);
  const leftH = dist(quad.topLeft, quad.bottomLeft);
  const rightH = dist(quad.topRight, quad.bottomRight);

  // ด้านตรงข้ามต้องไม่ต่างกันเกิน 50%
  if (Math.abs(topW - bottomW) / Math.max(topW, bottomW, 1) > 0.50) return false;
  if (Math.abs(leftH - rightH) / Math.max(leftH, rightH, 1) > 0.50) return false;

  // ขนาดขั้นต่ำ
  if (Math.min(topW, bottomW) < 30 || Math.min(leftH, rightH) < 30) return false;

  return true;
}

/**
 * ตรวจจับมาร์กเกอร์สี่เหลี่ยมดำ 6 จุด (4 มุม + 2 จุดกลาง) จากเฟรมกล้อง
 * 
 * @param imageData - RGBA pixel data จาก canvas.getImageData()
 * @param width - ความกว้างของภาพต้นฉบับ
 * @param height - ความสูงของภาพต้นฉบับ
 * @param expectedAspectRatio - สัดส่วนที่คาดหวังของ quad (default: 1.0 สำหรับ compact zone)
 */
export function detectFiducialMarkers(
  imageData: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  expectedAspectRatio: number = 1.0
): MarkerDetectionResult {
  const startTime = performance.now();

  // 1. Downsample สำหรับความเร็ว (max 480px on longest side)
  const maxDim = 480;
  const scale = Math.min(1.0, maxDim / Math.max(width, height));
  const dw = Math.round(width * scale);
  const dh = Math.round(height * scale);

  // 2. Grayscale + downsample ในรอบเดียว
  const gray = new Uint8Array(dw * dh);
  const srcStride = width * 4;

  for (let dy = 0; dy < dh; dy++) {
    const sy = Math.min(Math.round(dy / scale), height - 1);
    const srcRowOffset = sy * srcStride;
    const dstRowOffset = dy * dw;

    for (let dx = 0; dx < dw; dx++) {
      const sx = Math.min(Math.round(dx / scale), width - 1);
      const srcIdx = srcRowOffset + sx * 4;
      gray[dstRowOffset + dx] = Math.round(
        0.299 * imageData[srcIdx] +
        0.587 * imageData[srcIdx + 1] +
        0.114 * imageData[srcIdx + 2]
      );
    }
  }

  // 3. Bradley-Roth local adaptive thresholding (O(N) with integral image)
  const binary = adaptiveThresholdBradley(gray, dw, dh, 16, 0.82);

  // 4. Connected component labeling
  const { labels } = connectedComponents(binary, dw, dh);

  // 5. Extract and filter blobs
  const allBlobs = extractBlobs(labels, dw, dh);
  const squareMarkers = filterSquareMarkers(allBlobs, dw, dh);

  // 6. เลือกผู้สมัครสูงสุด 12 ตัวเพื่อหา 4 มุมและ 2 จุดกึ่งกลาง
  squareMarkers.sort((a, b) => b.area - a.area);
  const topCandidates = squareMarkers.slice(0, 12);

  const processingTimeMs = Math.round(performance.now() - startTime);

  if (topCandidates.length < 4) {
    return {
      found: false,
      markersDetected: topCandidates.length,
      corners: null,
      midPoints: null,
      confidence: topCandidates.length / 6,
      processingTimeMs
    };
  }

  // 7. Assign corners & midPoints (scale back to original coordinates)
  const scaleX = 1 / scale;
  const scaleY = 1 / scale;
  const assigned = assignMarkers(topCandidates, scaleX, scaleY);

  // 8. Validate quad shape
  if (!validateQuad(assigned.corners)) {
    return {
      found: false,
      markersDetected: topCandidates.length,
      corners: null,
      midPoints: null,
      confidence: 0.3,
      processingTimeMs
    };
  }

  // 9. คำนวณ confidence จากความสม่ำเสมอของขนาดมาร์กเกอร์ + โบนัส 6 จุด
  const areas = topCandidates.slice(0, 4).map(m => m.area);
  const avgArea = areas.reduce((s, a) => s + a, 0) / 4;
  const areaVariance = areas.reduce((s, a) => s + Math.abs(a - avgArea) / avgArea, 0) / 4;
  let confidence = Math.max(0.5, Math.min(1.0, 1.0 - areaVariance * 2));
  if (assigned.matchedCount === 6) {
    confidence = Math.min(1.0, confidence + 0.08);
  }

  return {
    found: true,
    markersDetected: assigned.matchedCount,
    corners: assigned.corners,
    midPoints: assigned.midPoints,
    confidence,
    processingTimeMs
  };
}
