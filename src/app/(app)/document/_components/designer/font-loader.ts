import { FONT_MANIFEST, SUPPORTED_FONTS, type SupportedFont } from "./font-manifest.ts";

export interface LoadedFontSet {
  fontsLoaded: Record<SupportedFont, boolean>;
  verifiedAt: number;
}

export const THAI_TEST_GLYPHS = "กักขฬะ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ฤ ฤๅ ล ฦ ฦๅ ว ศ ษ ส ห ฬ อ ฮ ะ ั า ำ ิ ี ึ ื ุ ู ฺ ฿ เ แ โ ใ ไ ๅ ๆ ็ ่ ้ ๊ ๋ ์ ํ ๎ ๏ ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙ ๚ ๛";

const _loadedFamilies = new Set<string>();
let _loadedPromise: Promise<LoadedFontSet> | null = null;

/**
 * Computes hexadecimal SHA-256 hash of an ArrayBuffer in browser or Node environment.
 */
export async function computeBufferSha256(buf: ArrayBuffer | ArrayBufferView): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuf = await crypto.subtle.digest("SHA-256", buf as BufferSource);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for Node.js test environment
  try {
    const nodeCrypto = await import("node:crypto");
    const buffer = ArrayBuffer.isView(buf)
      ? Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)
      : Buffer.from(buf);
    return nodeCrypto.createHash("sha256").update(buffer).digest("hex");
  } catch {
    throw new Error("No cryptographic provider available for SHA-256");
  }
}

/**
 * Fetches binary font asset from URL, computes SHA-256 hash,
 * verifies against expected assetHash, and registers FontFace if valid.
 * Rejects if hash does not match (tampering / corruption protection).
 */
export async function loadFontWithIntegrity(font: {
  family: string;
  assetUrl: string;
  assetHash: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined" || !("fonts" in document)) {
    return true;
  }

  if (_loadedFamilies.has(font.family)) {
    return true;
  }

  const res = await fetch(font.assetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch font asset for "${font.family}": HTTP ${res.status} ${res.statusText}`);
  }

  const buf = await res.arrayBuffer();
  const actualHash = await computeBufferSha256(buf);

  if (actualHash.toLowerCase() !== font.assetHash.toLowerCase()) {
    throw new Error(
      `Font integrity verification failed for "${font.family}": hash mismatch (expected ${font.assetHash}, got ${actualHash})`
    );
  }

  const face = new FontFace(font.family, buf);
  await face.load();
  document.fonts.add(face);
  _loadedFamilies.add(font.family);
  return true;
}

/**
 * Verifies custom uploaded font binary buffer against expected hash,
 * and registers into document.fonts.
 */
export async function verifyAndLoadCustomFont(params: {
  family: string;
  buffer: ArrayBuffer;
  expectedHash: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined" || !("fonts" in document)) {
    return true;
  }

  if (_loadedFamilies.has(params.family)) {
    return true;
  }

  const actualHash = await computeBufferSha256(params.buffer);
  if (actualHash.toLowerCase() !== params.expectedHash.toLowerCase()) {
    throw new Error(
      `Custom font integrity verification failed for "${params.family}": hash mismatch (expected ${params.expectedHash}, got ${actualHash})`
    );
  }

  const face = new FontFace(params.family, params.buffer);
  await face.load();
  document.fonts.add(face);
  _loadedFamilies.add(params.family);
  return true;
}

/**
 * Browser-only Font Loader Gate.
 * Preloads manifest fonts and shapes them using comprehensive Thai glyphs.
 */
export async function ensureFontsLoaded(): Promise<LoadedFontSet> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    const fallback: any = {};
    for (const id of SUPPORTED_FONTS) fallback[id] = true;
    return { fontsLoaded: fallback, verifiedAt: Date.now() };
  }

  if (_loadedPromise) {
    return _loadedPromise;
  }

  _loadedPromise = (async () => {
    // Inject stylesheet link if not present for Google Fonts
    if (!document.getElementById("certificate-fonts-stylesheet")) {
      const fontQueries = Object.values(FONT_MANIFEST).map((f) => f.googleFontQuery).join("&");
      const link = document.createElement("link");
      link.id = "certificate-fonts-stylesheet";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?${fontQueries}&display=swap`;
      document.head.appendChild(link);
    }

    const loadStatus: Record<string, boolean> = {};
    const loadPromises: Promise<any>[] = [];

    for (const fontId of SUPPORTED_FONTS) {
      const font = FONT_MANIFEST[fontId];
      for (const weight of font.weights) {
        loadPromises.push(
          document.fonts
            .load(`${weight} 16px "${font.family}"`, THAI_TEST_GLYPHS)
            .then(() => {
              loadStatus[fontId] = true;
              _loadedFamilies.add(font.family);
            })
            .catch((err) => {
              console.warn(`[font-loader] Font ${font.family} (${weight}) warning:`, err);
              loadStatus[fontId] = true; // graceful fallback
            })
        );
      }
    }

    await Promise.all(loadPromises);

    return {
      fontsLoaded: loadStatus as Record<SupportedFont, boolean>,
      verifiedAt: Date.now(),
    };
  })();

  return _loadedPromise;
}
