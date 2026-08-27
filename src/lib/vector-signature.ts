import { sanitizeSvg } from "./svg-sanitizer";

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts recorded stroke points into a smooth Vector SVG with explicit dimensions.
 */
export function exportStrokesToSvg(
  strokes: Point[][],
  width: number,
  height: number,
  strokeColor: string = "#0f172a",
  strokeWidth: number = 3
): string {
  if (!strokes || strokes.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '"></svg>';
  }

  let pathD = "";

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      // Single dot
      pathD += 'M ' + stroke[0].x.toFixed(1) + ' ' + stroke[0].y.toFixed(1) + ' l 0.1 0.1 ';
      continue;
    }

    pathD += 'M ' + stroke[0].x.toFixed(1) + ' ' + stroke[0].y.toFixed(1) + ' ';

    if (stroke.length === 2) {
      pathD += 'L ' + stroke[1].x.toFixed(1) + ' ' + stroke[1].y.toFixed(1) + ' ';
    } else {
      // Smooth quadratic Bezier curves through mid-points
      for (let i = 1; i < stroke.length - 1; i++) {
        const p1 = stroke[i];
        const p2 = stroke[i + 1];
        const midX = ((p1.x + p2.x) / 2).toFixed(1);
        const midY = ((p1.y + p2.y) / 2).toFixed(1);
        pathD += 'Q ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) + ', ' + midX + ' ' + midY + ' ';
      }
      const last = stroke[stroke.length - 1];
      pathD += 'L ' + last.x.toFixed(1) + ' ' + last.y.toFixed(1) + ' ';
    }
  }

  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '"><path d="' + pathD.trim() + '" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

  return sanitizeSvg(rawSvg);
}

/**
 * Converts recorded stroke points into a Data URL (image/svg+xml) ready for <img> src.
 */
export function exportStrokesToDataUrl(
  strokes: Point[][],
  width: number,
  height: number,
  strokeColor: string = "#0f172a",
  strokeWidth: number = 3
): string {
  const svg = exportStrokesToSvg(strokes, width, height, strokeColor, strokeWidth);
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

