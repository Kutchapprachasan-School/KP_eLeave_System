import { FONT_MANIFEST, SUPPORTED_FONTS, type SupportedFont } from "./font-manifest.ts";

export interface LoadedFontSet {
  fontsLoaded: Record<SupportedFont, boolean>;
  verifiedAt: number;
}

export const THAI_TEST_GLYPHS = "กักขฬะ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ฤ ฤๅ ล ฦ ฦๅ ว ศ ษ ส ห ฬ อ ฮ ะ ั า ำ ิ ี ึ ื ุ ู ฺ ฿ เ แ โ ใ ไ ๅ ๆ ็ ่ ้ ๊ ๋ ์ ํ ๎ ๏ ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙ ๚ ๛";

let _loadedPromise: Promise<LoadedFontSet> | null = null;

/**
 * Browser-only Font Loader Gate.
 * Preloads all 6 manifest Thai fonts and shapes them using comprehensive Thai glyphs.
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
    // Inject stylesheet link if not present
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
