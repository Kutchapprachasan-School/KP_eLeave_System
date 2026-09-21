/**
 * KP Academic OMR - Real-Time Fiducial Marker Detection Engine
 * 
 * ตรวจจับมาร์กเกอร์สี่เหลี่ยมดำ 4 มุมจากเฟรมกล้องมือถือแบบ real-time
 * Algorithm: Downsample → Grayscale → Otsu Threshold → Connected Components → Square Filter
 * เป้าหมาย: ≤200ms ต่อเฟรม @ 480p บนมือถือ
 */

import type { Point2D, QuadPoints } from "./omrEngine";

export interface MarkerDetectionResult {
  /** ตรวจพบครบ 4 มุมหรือไม่ */
  found: boolean;
  /** จำนวนมาร์กเกอร์ที่ตรวจพบ (0-4) */
  markersDetected: number;
  /** พิกัด 4 มุมที่ตรวจพบ (null หากไม่ครบ) */
  corners: QuadPoints | null;
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
 * Otsu's Method: คำนวณ threshold อัตโนมัติจาก histogram
 */
function otsuThreshold(grayData: Uint8Array, length: number): number {
  // สร้าง histogram
  const histogram = new Uint32Array(256);
  for (let i = 0; i < length; i++) {
    histogram[grayData[i]]++;
  }

  let totalPixels = length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) {
    sumAll += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let bestThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const meanB = sumB / wB;
    const meanF = (sumAll - sumB) / wF;
    const diff = meanB - meanF;
    const variance = wB * wF * diff * diff;

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }

  return bestThreshold;
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
  const minArea = totalArea * 0.0008; // 0.08% ของภาพ
  const maxArea = totalArea * 0.06;   // 6% ของภาพ

  return blobs.filter(blob => {
    // ขนาดต้องอยู่ในช่วง
    if (blob.area < minArea || blob.area > maxArea) return false;

    // สัดส่วน bounding box ต้องใกล้สี่เหลี่ยมจัตุรัส
    const bboxW = blob.maxX - blob.minX + 1;
    const bboxH = blob.maxY - blob.minY + 1;
    const aspectRatio = bboxW / bboxH;
    if (aspectRatio < 0.6 || aspectRatio > 1.67) return false;

    // Solidity: area / bounding box area ต้อง > 0.75
    const bboxArea = bboxW * bboxH;
    const solidity = blob.area / bboxArea;
    if (solidity < 0.75) return false;

    return true;
  });
}

/**
 * จัดเรียง 4 มาร์กเกอร์เป็น TL, TR, BL, BR
 */
function assignCorners(markers: BlobInfo[], scaleX: number, scaleY: number): QuadPoints {
  // คำนวณ centroid ของทั้ง 4 จุด
  const avgX = markers.reduce((s, m) => s + m.cx, 0) / markers.length;
  const avgY = markers.reduce((s, m) => s + m.cy, 0) / markers.length;

  let tl: BlobInfo | null = null;
  let tr: BlobInfo | null = null;
  let bl: BlobInfo | null = null;
  let br: BlobInfo | null = null;

  for (const m of markers) {
    const isLeft = m.cx < avgX;
    const isTop = m.cy < avgY;

    if (isLeft && isTop) tl = m;
    else if (!isLeft && isTop) tr = m;
    else if (isLeft && !isTop) bl = m;
    else br = m;
  }

  // Fallback: ถ้า assign ไม่ได้ ใช้ sorting
  if (!tl || !tr || !bl || !br) {
    const sorted = [...markers].sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
    tl = sorted[0];
    br = sorted[3];
    // จาก 2 ตัวที่เหลือ เลือกตาม x
    const mid = [sorted[1], sorted[2]].sort((a, b) => a.cx - b.cx);
    bl = mid[0].cy > mid[1].cy ? mid[0] : mid[1];
    tr = mid[0].cy > mid[1].cy ? mid[1] : mid[0];
  }

  return {
    topLeft: { x: tl.cx * scaleX, y: tl.cy * scaleY },
    topRight: { x: tr.cx * scaleX, y: tr.cy * scaleY },
    bottomLeft: { x: bl.cx * scaleX, y: bl.cy * scaleY },
    bottomRight: { x: br.cx * scaleX, y: br.cy * scaleY }
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

  const sides = [topW, bottomW, leftH, rightH];
  const avgSide = sides.reduce((s, v) => s + v, 0) / 4;

  // ทุกด้านต้องไม่ห่างจากค่าเฉลี่ยเกิน 60%
  for (const s of sides) {
    if (Math.abs(s - avgSide) / avgSide > 0.60) return false;
  }

  // ขนาดขั้นต่ำ
  if (avgSide < 20) return false;

  return true;
}

/**
 * ตรวจจับมาร์กเกอร์สี่เหลี่ยมดำ 4 มุมจากเฟรมกล้อง
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

  // 3. Otsu threshold
  const threshold = otsuThreshold(gray, dw * dh);

  // 4. Binary image (inverted: dark markers = 1, white paper = 0)
  const binary = new Uint8Array(dw * dh);
  for (let i = 0; i < gray.length; i++) {
    binary[i] = gray[i] <= threshold ? 1 : 0;
  }

  // 5. Connected component labeling
  const { labels } = connectedComponents(binary, dw, dh);

  // 6. Extract and filter blobs
  const allBlobs = extractBlobs(labels, dw, dh);
  const squareMarkers = filterSquareMarkers(allBlobs, dw, dh);

  // 7. เลือก 4 ตัวที่ใหญ่ที่สุด
  squareMarkers.sort((a, b) => b.area - a.area);
  const top4 = squareMarkers.slice(0, 4);

  const processingTimeMs = Math.round(performance.now() - startTime);

  if (top4.length < 4) {
    return {
      found: false,
      markersDetected: top4.length,
      corners: null,
      confidence: top4.length / 4,
      processingTimeMs
    };
  }

  // 8. Assign corners (scale back to original coordinates)
  const scaleX = 1 / scale;
  const scaleY = 1 / scale;
  const corners = assignCorners(top4, scaleX, scaleY);

  // 9. Validate quad shape
  if (!validateQuad(corners)) {
    return {
      found: false,
      markersDetected: top4.length,
      corners: null,
      confidence: 0.3,
      processingTimeMs
    };
  }

  // 10. คำนวณ confidence จากความสม่ำเสมอของขนาดมาร์กเกอร์
  const areas = top4.map(m => m.area);
  const avgArea = areas.reduce((s, a) => s + a, 0) / 4;
  const areaVariance = areas.reduce((s, a) => s + Math.abs(a - avgArea) / avgArea, 0) / 4;
  const confidence = Math.max(0.5, Math.min(1.0, 1.0 - areaVariance * 2));

  return {
    found: true,
    markersDetected: 4,
    corners,
    confidence,
    processingTimeMs
  };
}
