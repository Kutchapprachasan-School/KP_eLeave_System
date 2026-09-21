/**
 * KP Academic Subsystem - OMR Computer Vision Engine
 * High-precision Optical Mark Recognition for A4 20/50/100 item answer sheets.
 * Supports pure TypeScript execution (Node.js & Web Worker) + OpenCV WASM acceleration.
 */

export interface BubbleCoordinate {
  choice: string;
  u: number;
  v: number;
  radius: number;
}

export interface QuestionCoordinate {
  itemNo: number;
  bubbles: BubbleCoordinate[];
}

export interface StudentIdDigitCoordinate {
  digitIndex: number;
  value: number;
  u: number;
  v: number;
  radius: number;
}

export interface VersionCodeCoordinate {
  versionCode: string;
  u: number;
  v: number;
  radius: number;
}

export interface TemplateGridMetadata {
  canvasWidth: number;
  canvasHeight: number;
  fiducialMarkers: {
    topLeft: { u: number; v: number; width: number; height: number };
    topRight: { u: number; v: number; width: number; height: number };
    bottomLeft: { u: number; v: number; width: number; height: number };
    bottomRight: { u: number; v: number; width: number; height: number };
  };
  qrCodeAnchor?: {
    u: number;
    v: number;
    size: number;
  };
  studentIdGrid: {
    digitsCount: number;
    digits: StudentIdDigitCoordinate[];
  };
  versionCodeGrid: {
    versions: VersionCodeCoordinate[];
  };
  questionBlocks: QuestionCoordinate[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface QuadPoints {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export interface RawImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface IQGResult {
  passed: boolean;
  blurVariance: number;
  glarePercentage: number;
  aspectRatio: number;
  curvatureError: number;
  illuminationUniformity: number;
  issues: string[];
}

export interface BubbleReadResult {
  choice: string;
  fillRatio: number;
  meanLuminance: number;
}

export interface QuestionReadResult {
  itemNo: number;
  detectedChoices: string[];
  fillRatios: Record<string, number>;
  confidenceScore: number;
}

export interface OmrScanResult {
  success: boolean;
  iqg: IQGResult;
  studentId: string;
  studentIdConfidence: number;
  versionCode: string;
  versionCodeConfidence: number;
  items: QuestionReadResult[];
  confidenceAvg: number;
  hasAnomalies: boolean;
  executionTimeMs: number;
  error?: string;
}

export interface OmrProcessOptions {
  /** Expected aspect ratio of scan zone for IQG validation (default: 1.0 for compact) */
  expectedAspectRatio?: number;
  /** Fill threshold multiplier (default: 0.35) */
  fillThresholdMultiplier?: number;
}

// =============================================================================
// 1. MATHEMATICAL HOMOGRAPHY & PERSPECTIVE WARP
// =============================================================================

/**
 * Solves an 8x8 linear system to find the 3x3 Homography Matrix H
 * Mapping src points [TL, TR, BR, BL] -> dst points [TL, TR, BR, BL]
 */
export function computeHomography(src: Point2D[], dst: Point2D[]): number[] {
  if (src.length !== 4 || dst.length !== 4) {
    throw new Error("Homography requires exactly 4 source and 4 destination points.");
  }

  // 8x8 matrix A and 8x1 vector B for A * h = B
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    B.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    B.push(dy);
  }

  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    const tmpA = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tmpA;

    const tmpB = B[i];
    B[i] = B[maxRow];
    B[maxRow] = tmpB;

    if (Math.abs(A[i][i]) < 1e-12) {
      throw new Error("Degenerate quad points in Homography calculation.");
    }

    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
      B[k] -= factor * B[i];
    }
  }

  // Back substitution
  const h = new Array(8).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = B[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * h[j];
    }
    h[i] = sum / A[i][i];
  }

  // H matrix in row-major order: [h0, h1, h2, h3, h4, h5, h6, h7, 1.0]
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

/**
 * Inverts a 3x3 Homography Matrix
 */
export function invertHomography(H: number[]): number[] {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = H;

  const det =
    m00 * (m11 * m22 - m12 * m21) -
    m01 * (m10 * m22 - m12 * m20) +
    m02 * (m10 * m21 - m11 * m20);

  if (Math.abs(det) < 1e-12) {
    throw new Error("Homography matrix is singular and cannot be inverted.");
  }

  const invDet = 1.0 / det;

  return [
    (m11 * m22 - m12 * m21) * invDet,
    (m02 * m21 - m01 * m22) * invDet,
    (m01 * m12 - m02 * m11) * invDet,
    (m12 * m20 - m10 * m22) * invDet,
    (m00 * m22 - m02 * m20) * invDet,
    (m02 * m10 - m00 * m12) * invDet,
    (m10 * m21 - m11 * m20) * invDet,
    (m01 * m20 - m00 * m21) * invDet,
    (m00 * m11 - m01 * m10) * invDet
  ];
}

/**
 * Projects a single point using Homography matrix
 */
export function projectPoint(H: number[], p: Point2D): Point2D {
  const x = p.x;
  const y = p.y;
  const w = H[6] * x + H[7] * y + H[8];
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w
  };
}

/**
 * Warps a region defined by 4 corners into canonical canvas (e.g. 1654 x 2339 px)
 * using inverse mapping with bilinear interpolation.
 */
export function warpPerspectiveBilinear(
  src: RawImageData,
  srcCorners: QuadPoints,
  targetWidth: number,
  targetHeight: number
): RawImageData {
  const srcPts: Point2D[] = [
    srcCorners.topLeft,
    srcCorners.topRight,
    srcCorners.bottomRight,
    srcCorners.bottomLeft
  ];

  const dstPts: Point2D[] = [
    { x: 0, y: 0 },
    { x: targetWidth, y: 0 },
    { x: targetWidth, y: targetHeight },
    { x: 0, y: targetHeight }
  ];

  // Inverse mapping: Dst (canonical) -> Src (camera frame)
  const Hinv = computeHomography(dstPts, srcPts);

  const outData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const srcW = src.width;
  const srcH = src.height;
  const srcData = src.data;

  for (let y = 0; y < targetHeight; y++) {
    const rowOffset = y * targetWidth * 4;
    for (let x = 0; x < targetWidth; x++) {
      const w = Hinv[6] * x + Hinv[7] * y + Hinv[8];
      const sx = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / w;
      const sy = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / w;

      const pxOffset = rowOffset + x * 4;

      if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = sx - x0;
        const fy = sy - y0;
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        // Bilinear R, G, B
        outData[pxOffset] =
          w00 * srcData[idx00] + w10 * srcData[idx10] + w01 * srcData[idx01] + w11 * srcData[idx11];
        outData[pxOffset + 1] =
          w00 * srcData[idx00 + 1] + w10 * srcData[idx10 + 1] + w01 * srcData[idx01 + 1] + w11 * srcData[idx11 + 1];
        outData[pxOffset + 2] =
          w00 * srcData[idx00 + 2] + w10 * srcData[idx10 + 2] + w01 * srcData[idx01 + 2] + w11 * srcData[idx11 + 2];
        outData[pxOffset + 3] = 255;
      } else {
        // Out of bounds: fill with white
        outData[pxOffset] = 255;
        outData[pxOffset + 1] = 255;
        outData[pxOffset + 2] = 255;
        outData[pxOffset + 3] = 255;
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outData
  };
}

// =============================================================================
// 2. 5-STEP IMAGE QUALITY GATE (IQG)
// =============================================================================

export function evaluateImageQuality(
  image: RawImageData,
  quad?: QuadPoints,
  expectedAspectRatio: number = 1.0
): IQGResult {
  const issues: string[] = [];
  const { width, height, data } = image;

  // 1. Blur Check: Variance of Laplacian
  // Use subsampled grid (every 2nd pixel) for speed
  let sumL = 0;
  let sumL2 = 0;
  let laplacianCount = 0;

  for (let y = 2; y < height - 2; y += 2) {
    const row0 = (y - 1) * width * 4;
    const row1 = y * width * 4;
    const row2 = (y + 1) * width * 4;

    for (let x = 2; x < width - 2; x += 2) {
      // Luminance Y = 0.299R + 0.587G + 0.114B
      const getLum = (offset: number) =>
        0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];

      const c = getLum(row1 + x * 4);
      const top = getLum(row0 + x * 4);
      const bottom = getLum(row2 + x * 4);
      const left = getLum(row1 + (x - 1) * 4);
      const right = getLum(row1 + (x + 1) * 4);

      // Discrete 3x3 Laplacian: (top + bottom + left + right) - 4 * center
      const lap = top + bottom + left + right - 4 * c;

      sumL += lap;
      sumL2 += lap * lap;
      laplacianCount++;
    }
  }

  const meanL = sumL / (laplacianCount || 1);
  const blurVariance = (sumL2 / (laplacianCount || 1)) - (meanL * meanL);

  if (blurVariance < 60.0) {
    issues.push(`ภาพเบลอหรือไม่คมชัดเพียงพอ (Laplacian Variance: ${blurVariance.toFixed(1)} < 60.0)`);
  }

  // 2. Specular Glare Check: Count oversaturated pixels (Y > 250)
  let saturatedCount = 0;
  const totalPixelsSampled = Math.floor(width * height / 4);

  for (let i = 0; i < data.length; i += 16) {
    const yVal = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (yVal > 250) {
      saturatedCount++;
    }
  }
  const glarePercentage = (saturatedCount / (totalPixelsSampled || 1)) * 100;
  if (glarePercentage > 4.0) {
    issues.push(`ตรวจพบแสงสะท้อนจ้า (Specular Glare: ${glarePercentage.toFixed(1)}% > 4.0%)`);
  }

  // 3 & 4. Aspect Ratio & Curvature (if Quad is provided)
  let aspectRatio = 1.414;
  let curvatureError = 0;

  if (quad) {
    const dist = (p1: Point2D, p2: Point2D) =>
      Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const topW = dist(quad.topLeft, quad.topRight);
    const bottomW = dist(quad.bottomLeft, quad.bottomRight);
    const leftH = dist(quad.topLeft, quad.bottomLeft);
    const rightH = dist(quad.topRight, quad.bottomRight);

    const avgW = (topW + bottomW) / 2;
    const avgH = (leftH + rightH) / 2;
    aspectRatio = avgW > 0 ? avgH / avgW : expectedAspectRatio;

    // Expected aspect ratio: dynamic based on template (compact zone ≈ 1.0, A4 ≈ 1.414)
    const aspectDiff = Math.abs(aspectRatio - expectedAspectRatio) / expectedAspectRatio;
    if (aspectDiff > 0.20) {
      issues.push(`สัดส่วนกระดาษบิดเบี้ยวเกินเกณฑ์ (Aspect Ratio: ${aspectRatio.toFixed(2)} ผิดพลาด ${(aspectDiff * 100).toFixed(1)}%)`);
    }

    // Curvature / Trapezoid check
    const widthSkew = Math.abs(topW - bottomW) / Math.max(topW, bottomW, 1);
    const heightSkew = Math.abs(leftH - rightH) / Math.max(leftH, rightH, 1);
    curvatureError = Math.max(widthSkew, heightSkew) * 100;

    if (curvatureError > 20.0) {
      issues.push(`กระดาษเอียงหรือโค้งงอมากเกินไป (Skew Error: ${curvatureError.toFixed(1)}% > 20%)`);
    }
  }

  // 5. Illumination Uniformity: Sample corners
  const sampleCornerLum = (startX: number, startY: number, size: number) => {
    let sum = 0;
    let count = 0;
    for (let y = startY; y < startY + size; y++) {
      for (let x = startX; x < startX + size; x++) {
        const idx = (y * width + x) * 4;
        sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        count++;
      }
    }
    return sum / (count || 1);
  };

  const cornerSize = Math.min(30, Math.floor(width / 10));
  const lTL = sampleCornerLum(5, 5, cornerSize);
  const lTR = sampleCornerLum(width - cornerSize - 5, 5, cornerSize);
  const lBL = sampleCornerLum(5, height - cornerSize - 5, cornerSize);
  const lBR = sampleCornerLum(width - cornerSize - 5, height - cornerSize - 5, cornerSize);

  const maxCorner = Math.max(lTL, lTR, lBL, lBR);
  const minCorner = Math.min(lTL, lTR, lBL, lBR);
  const illuminationUniformity = maxCorner - minCorner;

  if (illuminationUniformity > 85.0) {
    issues.push(`แสงสว่างไม่สม่ำเสมอ มีเงามืดพาดผ่าน (Delta: ${illuminationUniformity.toFixed(1)} > 85)`);
  }

  return {
    passed: issues.length === 0,
    blurVariance,
    glarePercentage,
    aspectRatio,
    curvatureError,
    illuminationUniformity,
    issues
  };
}

// =============================================================================
// 3. DYNAMIC CONTRAST CALIBRATION & BUBBLE SAMPLING
// =============================================================================

export interface ContrastCalibration {
  lPaper: number;
  lMarker: number;
  contrastRange: number;
  fillThreshold: number;
}

/**
 * Calibrates white paper luminance vs solid black fiducial marker luminance
 */
export function calibrateContrast(
  image: RawImageData,
  template: TemplateGridMetadata,
  fillThresholdMultiplier: number = 0.35
): ContrastCalibration {
  const { width, height, data } = image;

  const getLuminance = (x: number, y: number) => {
    const px = Math.min(Math.max(Math.floor(x), 0), width - 1);
    const py = Math.min(Math.max(Math.floor(y), 0), height - 1);
    const idx = (py * width + px) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  };

  // 1. Sample Marker Luminance (Top-Left marker center)
  const marker = template.fiducialMarkers.topLeft;
  const markerCenterX = (marker.u + marker.width / 2) * width;
  const markerCenterY = (marker.v + marker.height / 2) * height;

  let markerSum = 0;
  let markerCount = 0;
  const sampleRadius = Math.max(3, Math.floor(marker.width * width * 0.2));

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      if (dx * dx + dy * dy <= sampleRadius * sampleRadius) {
        markerSum += getLuminance(markerCenterX + dx, markerCenterY + dy);
        markerCount++;
      }
    }
  }
  const lMarker = markerSum / (markerCount || 1);

  // 2. Sample Paper Margin Luminance (Safe white margins)
  let paperSum = 0;
  let paperCount = 0;
  const marginSamples = [
    { x: width * 0.5, y: height * 0.05 }, // top center margin
    { x: width * 0.05, y: height * 0.5 }, // left center margin
    { x: width * 0.95, y: height * 0.5 }, // right center margin
    { x: width * 0.5, y: height * 0.95 }  // bottom center margin
  ];

  for (const pt of marginSamples) {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        paperSum += getLuminance(pt.x + dx, pt.y + dy);
        paperCount++;
      }
    }
  }
  const lPaper = paperSum / (paperCount || 1);

  const contrastRange = Math.max(10, lPaper - lMarker);
  // Threshold for marked bubble: default 35% darker than paper reference
  const fillThreshold = lPaper - fillThresholdMultiplier * contrastRange;

  return {
    lPaper,
    lMarker,
    contrastRange,
    fillThreshold
  };
}

/**
 * Reads optical density of a single bubble circular ROI
 */
export function readBubbleFill(
  image: RawImageData,
  u: number,
  v: number,
  radiusNorm: number,
  calibration: ContrastCalibration
): { fillRatio: number; meanLuminance: number } {
  const { width, height, data } = image;
  const cx = Math.floor(u * width);
  const cy = Math.floor(v * height);
  // Inner inspection radius (shrink 20% to avoid bubble rim)
  const r = Math.max(2, Math.floor(radiusNorm * width * 0.80));

  let darkPixelCount = 0;
  let totalPixels = 0;
  let sumLuminance = 0;

  for (let dy = -r; dy <= r; dy++) {
    const py = cy + dy;
    if (py < 0 || py >= height) continue;
    const rowOffset = py * width * 4;

    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const px = cx + dx;
        if (px < 0 || px >= width) continue;

        const idx = rowOffset + px * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        sumLuminance += lum;
        totalPixels++;

        if (lum <= calibration.fillThreshold) {
          darkPixelCount++;
        }
      }
    }
  }

  const fillRatio = totalPixels > 0 ? darkPixelCount / totalPixels : 0;
  const meanLuminance = totalPixels > 0 ? sumLuminance / totalPixels : calibration.lPaper;

  return {
    fillRatio,
    meanLuminance
  };
}

// =============================================================================
// 4. BUBBLE GRID DECODING (STUDENT ID, VERSION, QUESTIONS)
// =============================================================================

export function decodeStudentIdGrid(
  image: RawImageData,
  studentGrid: TemplateGridMetadata["studentIdGrid"],
  calibration: ContrastCalibration
): { studentId: string; confidence: number } {
  const digitsCount = studentGrid.digitsCount || 5;
  const detectedDigits: string[] = [];
  let totalConf = 0;

  for (let d = 0; d < digitsCount; d++) {
    const digitBubbles = studentGrid.digits.filter(item => item.digitIndex === d);
    const readings = digitBubbles.map(b => {
      const read = readBubbleFill(image, b.u, b.v, b.radius, calibration);
      return { value: b.value, fillRatio: read.fillRatio };
    });

    readings.sort((a, b) => b.fillRatio - a.fillRatio);
    const top = readings[0];
    const second = readings[1] || { fillRatio: 0 };

    if (top.fillRatio >= 0.35) {
      detectedDigits.push(String(top.value));
      const margin = top.fillRatio - second.fillRatio;
      const conf = Math.min(1.0, Math.max(0.5, margin / 0.30));
      totalConf += conf;
    } else {
      // Inconclusive: fallback to '0'
      detectedDigits.push("0");
      totalConf += 0.3;
    }
  }

  return {
    studentId: detectedDigits.join(""),
    confidence: totalConf / digitsCount
  };
}

export function decodeVersionCodeGrid(
  image: RawImageData,
  versionGrid: TemplateGridMetadata["versionCodeGrid"],
  calibration: ContrastCalibration
): { versionCode: string; confidence: number } {
  const readings = versionGrid.versions.map(v => {
    const read = readBubbleFill(image, v.u, v.v, v.radius, calibration);
    return { versionCode: v.versionCode, fillRatio: read.fillRatio };
  });

  readings.sort((a, b) => b.fillRatio - a.fillRatio);
  const top = readings[0];
  const second = readings[1] || { fillRatio: 0 };

  if (top.fillRatio >= 0.30) {
    const margin = top.fillRatio - second.fillRatio;
    return {
      versionCode: top.versionCode,
      confidence: Math.min(1.0, Math.max(0.6, margin / 0.25))
    };
  }

  return {
    versionCode: "01",
    confidence: 0.5
  };
}

export function decodeQuestionBlocks(
  image: RawImageData,
  questionBlocks: TemplateGridMetadata["questionBlocks"],
  calibration: ContrastCalibration
): QuestionReadResult[] {
  return questionBlocks.map(q => {
    const choicesRead = q.bubbles.map(b => {
      const read = readBubbleFill(image, b.u, b.v, b.radius, calibration);
      return {
        choice: b.choice,
        fillRatio: read.fillRatio,
        meanLum: read.meanLuminance
      };
    });

    // Fill ratio map
    const fillRatios: Record<string, number> = {};
    for (const cr of choicesRead) {
      fillRatios[cr.choice] = Math.round(cr.fillRatio * 1000) / 1000;
    }

    choicesRead.sort((a, b) => b.fillRatio - a.fillRatio);
    const first = choicesRead[0];
    const second = choicesRead[1] || { fillRatio: 0 };

    const detectedChoices: string[] = [];
    let confidenceScore = 1.0;

    // Disambiguation Logic
    if (first.fillRatio < 0.20) {
      // Blank
      confidenceScore = Math.max(0.8, 1.0 - first.fillRatio);
    } else if (first.fillRatio >= 0.35 && second.fillRatio >= 0.30) {
      // Multiple marks
      detectedChoices.push(first.choice, second.choice);
      confidenceScore = 0.50; // Multiple marks flag
    } else if (first.fillRatio >= 0.30) {
      // Single marked choice
      detectedChoices.push(first.choice);
      const margin = first.fillRatio - second.fillRatio;
      if (margin >= 0.25) {
        confidenceScore = 0.95; // High confidence
      } else if (margin >= 0.15) {
        confidenceScore = 0.78; // Medium confidence (erased mark smudge)
      } else {
        confidenceScore = 0.60; // Low confidence
      }
    }

    return {
      itemNo: q.itemNo,
      detectedChoices,
      fillRatios,
      confidenceScore
    };
  });
}

// =============================================================================
// 5. TOP-LEVEL ORCHESTRATOR
// =============================================================================

export function processOmrSheet(
  image: RawImageData,
  template: TemplateGridMetadata,
  corners?: QuadPoints,
  options?: OmrProcessOptions
): OmrScanResult {
  const startTime = Date.now();

  const expectedAspect = options?.expectedAspectRatio ?? template.scanZoneAspectRatio ?? 1.0;
  const fillMultiplier = options?.fillThresholdMultiplier ?? 0.35;

  // 1. Image Quality Gate
  const iqg = evaluateImageQuality(image, corners, expectedAspect);
  if (!iqg.passed) {
    return {
      success: false,
      iqg,
      studentId: "",
      studentIdConfidence: 0,
      versionCode: "01",
      versionCodeConfidence: 0,
      items: [],
      confidenceAvg: 0,
      hasAnomalies: true,
      executionTimeMs: Date.now() - startTime,
      error: iqg.issues.join("; ")
    };
  }

  // 2. Perspective Warp (if 4 corners provided)
  let canonicalImage = image;
  if (corners) {
    canonicalImage = warpPerspectiveBilinear(
      image,
      corners,
      template.canvasWidth,
      template.canvasHeight
    );
  }

  // 3. Dynamic Contrast Calibration
  const calibration = calibrateContrast(canonicalImage, template, fillMultiplier);

  // 4. Decode Student ID & Version Code
  const studentResult = decodeStudentIdGrid(canonicalImage, template.studentIdGrid, calibration);
  const versionResult = decodeVersionCodeGrid(canonicalImage, template.versionCodeGrid, calibration);

  // 5. Decode Questions
  const items = decodeQuestionBlocks(canonicalImage, template.questionBlocks, calibration);

  // 6. Aggregate Metrics
  const totalConf = items.reduce((acc, curr) => acc + curr.confidenceScore, 0);
  const confidenceAvg = items.length > 0 ? totalConf / items.length : 1.0;
  const hasAnomalies = items.some(i => i.confidenceScore < 0.65 || i.detectedChoices.length > 1);

  return {
    success: true,
    iqg,
    studentId: studentResult.studentId,
    studentIdConfidence: studentResult.confidence,
    versionCode: versionResult.versionCode,
    versionCodeConfidence: versionResult.confidence,
    items,
    confidenceAvg,
    hasAnomalies,
    executionTimeMs: Date.now() - startTime
  };
}
