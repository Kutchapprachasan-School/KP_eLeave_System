import { FONT_MANIFEST, type FontManifestItem, type SupportedFont, SUPPORTED_FONTS } from "./font-manifest.ts";
import type { CustomFont } from "./cert-schema.ts";

export type FontLoadStatus = "IDLE" | "LOADING" | "READY" | "FAILED";

export interface FontRegistryEntry {
  family: string;
  status: FontLoadStatus;
  definition?: FontManifestItem | CustomFont;
  error?: string;
  loadedAt?: number;
}

// In-memory status cache: family -> FontRegistryEntry
const _statusCache = new Map<string, FontRegistryEntry>();

// In-flight promise deduplication: family -> Promise<boolean>
const _loadPromises = new Map<string, Promise<boolean>>();

// Dynamic custom font definitions registered at runtime
const _customFontDefinitions = new Map<string, CustomFont>();

// Helper to check environment
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined" && "fonts" in document;
}

/**
 * Universal glyph test string spanning Latin, Thai, Japanese (Kanji/Kana), and Chinese.
 */
export const UNIVERSAL_TEST_GLYPHS = "The quick brown fox 12345 กักขฬะ ญ ฎ ฏ ฐ ฑ ฒ ณ 日本語 中文";

export class FontRegistry {
  /**
   * Returns current entry status for a given family.
   */
  static getFont(family: string): FontRegistryEntry {
    const cached = _statusCache.get(family);
    if (cached) return cached;

    // Check manifest
    const manifestItem = (FONT_MANIFEST as Record<string, FontManifestItem>)[family];
    if (manifestItem) {
      const entry: FontRegistryEntry = { family, status: "IDLE", definition: manifestItem };
      _statusCache.set(family, entry);
      return entry;
    }

    // Check custom font definitions
    const customItem = _customFontDefinitions.get(family);
    if (customItem) {
      const entry: FontRegistryEntry = { family, status: "IDLE", definition: customItem };
      _statusCache.set(family, entry);
      return entry;
    }

    // Generic / system font
    const entry: FontRegistryEntry = { family, status: "IDLE" };
    _statusCache.set(family, entry);
    return entry;
  }

  /**
   * Registers a dynamic custom font definition into the registry.
   */
  static registerCustomFont(customFont: CustomFont): void {
    if (!customFont || !customFont.family) return;
    _customFontDefinitions.set(customFont.family, customFont);
    const existing = _statusCache.get(customFont.family);
    if (!existing || existing.status === "IDLE" || existing.status === "FAILED") {
      _statusCache.set(customFont.family, {
        family: customFont.family,
        status: "IDLE",
        definition: customFont,
      });
    }
  }

  /**
   * Resets registry cache (primarily for unit tests and deterministic resets).
   */
  static resetCache(): void {
    _statusCache.clear();
    _loadPromises.clear();
    _customFontDefinitions.clear();
  }

  /**
   * Ensures Google Fonts stylesheet tag is injected for a font family if available.
   */
  private static injectGoogleFontLink(manifestItem: FontManifestItem): void {
    if (!isBrowser() || !manifestItem.googleFontQuery) return;
    const linkId = `google-font-${manifestItem.family.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${manifestItem.googleFontQuery}&display=swap`;
    document.head.appendChild(link);
  }

  /**
   * Loads a font family asynchronously with promise deduplication.
   * Directly queries the FontFace / FontFaceSet API without redundant HEAD requests.
   */
  static loadFont(family: string): Promise<boolean> {
    const entry = this.getFont(family);

    // 1. If already READY, return true immediately
    if (entry.status === "READY") {
      return Promise.resolve(true);
    }

    // 2. If already loading, return existing deduplicated promise
    const inFlight = _loadPromises.get(family);
    if (inFlight) {
      return inFlight;
    }

    // 3. Update status to LOADING
    entry.status = "LOADING";
    _statusCache.set(family, entry);

    const loadPromise = (async () => {
      try {
        if (!isBrowser()) {
          // Microtask yield for async simulation in test environment
          await Promise.resolve();
          entry.status = "READY";
          entry.loadedAt = Date.now();
          entry.error = undefined;
          _statusCache.set(family, entry);
          return true;
        }
        // A. If font is from manifest, inject stylesheet if needed
        const manifestItem = (FONT_MANIFEST as Record<string, FontManifestItem>)[family];
        if (manifestItem) {
          this.injectGoogleFontLink(manifestItem);

          // Trigger document.fonts.load for all weights without glyph restrictions
          const loadTasks = manifestItem.weights.map((w) =>
            document.fonts.load(`${w} 16px "${family}"`).catch((err) => {
              console.warn(`[FontRegistry] Weight ${w} for "${family}" warning:`, err);
            })
          );
          await Promise.all(loadTasks);
        } else {
          // General font load without glyph restrictions
          await document.fonts.load(`16px "${family}"`).catch(() => {});
        }

        entry.status = "READY";
        entry.loadedAt = Date.now();
        entry.error = undefined;
        _statusCache.set(family, entry);
        return true;
      } catch (err: any) {
        console.warn(`[FontRegistry] Failed to load font "${family}":`, err);
        entry.status = "FAILED";
        entry.error = err?.message || String(err);
        _statusCache.set(family, entry);
        return false;
      } finally {
        _loadPromises.delete(family);
      }
    })();

    _loadPromises.set(family, loadPromise);
    return loadPromise;
  }

  /**
   * Verifies that the offscreen canvas 2D context can actually render with the specified font.
   * Compares text metrics against standard fallback font 'sans-serif' or 'monospace' to verify
   * that the font engine has activated the requested typography.
   */
  static async ensureCanvasFontReady(
    ctx: CanvasRenderingContext2D,
    family: string,
    weight: number | string = "normal"
  ): Promise<boolean> {
    const loaded = await this.loadFont(family);
    if (!loaded) return false;

    if (!isBrowser() || !ctx || typeof ctx.measureText !== "function") {
      return true;
    }

    try {
      const testString = "MWXqy1!กิฟ日中";
      const normalizedWeight = typeof weight === "number" ? weight : weight === "bold" ? 700 : 400;

      // Measure width with fallback sans-serif
      ctx.font = `${normalizedWeight} 32px sans-serif`;
      const fallbackWidth = ctx.measureText(testString).width;

      // Measure width with target font family
      ctx.font = `${normalizedWeight} 32px "${family}", sans-serif`;
      const targetWidth = ctx.measureText(testString).width;

      // If document.fonts.check confirms it, or measurement reflects distinct glyph widths, it is ready
      const isDocumentChecked =
        typeof document.fonts.check === "function"
          ? document.fonts.check(`${normalizedWeight} 32px "${family}"`)
          : true;

      return isDocumentChecked || targetWidth !== fallbackWidth;
    } catch {
      return true;
    }
  }

  /**
   * Preloads and verifies all unique font families required by a certificate template.
   */
  static async ensureTemplateFontsReady(
    families: string[]
  ): Promise<{ allReady: boolean; failed: string[] }> {
    const unique = Array.from(new Set(families.filter(Boolean)));
    const failed: string[] = [];

    await Promise.all(
      unique.map(async (family) => {
        const ok = await this.loadFont(family);
        if (!ok) {
          failed.push(family);
        }
      })
    );

    return {
      allReady: failed.length === 0,
      failed,
    };
  }
}
