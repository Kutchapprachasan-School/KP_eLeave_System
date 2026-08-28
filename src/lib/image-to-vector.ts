/**
 * Image to Vector SVG Converter
 * Automatically traces raster signatures (PNG, JPG, WebP) into smooth cubic Bezier Vector SVGs.
 */

function simplifyPoints(points: { x: number; y: number }[], tolerance = 1.0): { x: number; y: number }[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const num = Math.abs((last.y - first.y) * p.x - (last.x - first.x) * p.y + last.x * first.y - last.y * first.x);
    const den = Math.hypot(last.y - first.y, last.x - first.x);
    const dist = den === 0 ? Math.hypot(p.x - first.x, p.y - first.y) : num / den;

    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIdx), tolerance);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [first, last];
  }
}

export interface VectorizeOptions {
  threshold?: number;
  color?: string;
  maxDimension?: number;
  tolerance?: number;
}

export interface VectorizeResult {
  svg: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Traces a raster image buffer into smooth Bezier Vector SVG
 */
export async function traceBitmapToVectorSvg(
  imageBuffer: Buffer,
  options: VectorizeOptions = {}
): Promise<VectorizeResult> {
  const sharp = require("sharp");
  const threshold = options.threshold ?? 200;
  const strokeColor = options.color ?? "#0f172a";
  const tolerance = options.tolerance ?? 1.0;

  // 1. Process image: normalize contrast and resize
  const img = sharp(imageBuffer);
  const metadata = await img.metadata();
  const targetWidth = Math.min(metadata.width || 400, options.maxDimension || 500);

  const processed = await img
    .resize(targetWidth, null, { fit: "inside" })
    .grayscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = processed;
  const { width, height } = info;

  // 2. Threshold matrix (1 = ink, 0 = background)
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    binary[i] = data[i] < threshold ? 1 : 0;
  }

  // 3. Extract boundary contours (Moore-Neighbor Tracing)
  const visited = new Uint8Array(width * height);
  const contours: { x: number; y: number }[][] = [];

  const neighbors = [
    [-1, 0], [-1, 1], [0, 1], [1, 1],
    [1, 0], [1, -1], [0, -1], [-1, -1]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        let isBoundary = false;
        for (const [dy, dx] of neighbors) {
          if (binary[(y + dy) * width + (x + dx)] === 0) {
            isBoundary = true;
            break;
          }
        }

        if (isBoundary) {
          const contour: { x: number; y: number }[] = [];
          let cx = x;
          let cy = y;
          let dir = 0;
          let steps = 0;
          const maxSteps = 4000;

          while (steps < maxSteps) {
            contour.push({ x: cx, y: cy });
            visited[cy * width + cx] = 1;
            steps++;

            let foundNext = false;
            for (let i = 0; i < 8; i++) {
              const ndir = (dir + i) % 8;
              const nx = cx + neighbors[ndir][1];
              const ny = cy + neighbors[ndir][0];

              if (nx >= 0 && nx < width && ny >= 0 && ny < height && binary[ny * width + nx] === 1) {
                cx = nx;
                cy = ny;
                dir = (ndir + 5) % 8;
                foundNext = true;
                break;
              }
            }

            if (!foundNext || (cx === x && cy === y && steps > 2)) {
              break;
            }
          }

          if (contour.length > 8) {
            contours.push(simplifyPoints(contour, tolerance));
          }
        }
      }
    }
  }

  // 4. Construct Smooth Bezier Paths
  let pathD = "";
  for (const contour of contours) {
    if (contour.length < 3) continue;
    pathD += `M ${contour[0].x.toFixed(1)} ${contour[0].y.toFixed(1)} `;

    for (let i = 0; i < contour.length; i++) {
      const p0 = contour[i === 0 ? contour.length - 1 : i - 1];
      const p1 = contour[i];
      const p2 = contour[(i + 1) % contour.length];
      const p3 = contour[(i + 2) % contour.length];

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1);
      const cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1);
      const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1);
      const cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1);

      pathD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
    }
    pathD += "Z ";
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${pathD.trim()}" fill="${strokeColor}" fill-rule="evenodd" /></svg>`;
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return {
    svg,
    dataUrl,
    width,
    height,
    sizeBytes: Buffer.byteLength(svg, "utf8"),
  };
}

/**
 * Traces a Base64 data URL into smooth Vector SVG
 */
export async function traceBase64ToVectorSvg(
  base64DataUrl: string,
  options: VectorizeOptions = {}
): Promise<VectorizeResult> {
  const parts = base64DataUrl.split(",");
  const base64Str = parts[1] || parts[0];
  const buffer = Buffer.from(base64Str, "base64");
  return traceBitmapToVectorSvg(buffer, options);
}
