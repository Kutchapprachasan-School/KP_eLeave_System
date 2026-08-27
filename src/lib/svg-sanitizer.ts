/**
 * Strict Server-Side SVG Sanitizer
 * Strips executable scripts, event handlers, and foreign objects to prevent XSS.
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent) return "";

  let clean = svgContent.trim();

  // 1. Remove XML declaration / DOCTYPE if present
  clean = clean.replace(/<\?xml[\s\S]*?\?>/gi, "");
  clean = clean.replace(/<!DOCTYPE[\s\S]*?>/gi, "");

  // 2. Remove dangerous tags: <script>, <foreignObject>, <iframe>, <object>, <embed>, <applet>, <meta>, <link>
  const dangerousTags = [
    "script",
    "foreignObject",
    "iframe",
    "object",
    "embed",
    "applet",
    "meta",
    "link",
    "style"
  ];
  for (const tag of dangerousTags) {
    const regex = new RegExp("<" + tag + "[\\s\\S]*?>[\\s\\S]*?<\\/" + tag + ">", "gi");
    clean = clean.replace(regex, "");
    const selfClosing = new RegExp("<" + tag + "[\\s\\S]*?\\/?>", "gi");
    clean = clean.replace(selfClosing, "");
  }

  // 3. Remove inline event handlers (onload, onerror, onclick, etc.)
  clean = clean.replace(/\son\w+\s*=\s*(['\"]).*?\1/gi, "");
  clean = clean.replace(/\son\w+\s*=\s*[^>\s]+/gi, "");

  // 4. Remove javascript: URIs
  clean = clean.replace(/(href|xlink:href)\s*=\s*(['\"])javascript:.*?\2/gi, "");

  // 5. Ensure root is <svg> and has required namespace
  if (!clean.toLowerCase().includes("<svg")) {
    throw new Error("Invalid SVG content: Missing <svg> root element");
  }

  if (!clean.includes("xmlns=")) {
    clean = clean.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return clean;
}
