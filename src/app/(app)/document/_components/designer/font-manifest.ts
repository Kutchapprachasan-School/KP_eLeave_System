/**
 * Font Manifest (Server & Client Safe)
 * Deterministic metadata for Thai certificate typography.
 */

export type FontLanguage = "th" | "en" | "ja" | "zh" | "custom";

export const SUPPORTED_FONTS = [
  // 🇹🇭 Thai
  "Sarabun",
  "Prompt",
  "Kanit",
  "Taviraj",
  "Chakra Petch",
  "Mali",
  // 🇬🇧 English / International
  "Playfair Display",
  "Cinzel",
  "Montserrat",
  "Inter",
  // 🇯🇵 Japanese
  "Noto Sans JP",
  "Noto Serif JP",
  // 🇨🇳 Chinese
  "Noto Sans SC",
  "Noto Serif SC",
] as const;

export type SupportedFont = (typeof SUPPORTED_FONTS)[number];

export interface FontManifestItem {
  id: SupportedFont;
  family: string;
  name: string;
  language: FontLanguage;
  category: "formal" | "modern" | "display" | "handwriting" | "serif" | "sans-serif";
  description: string;
  version: string;
  weights: number[];
  assetUrl: string;
  assetHash: string;
  googleFontQuery: string;
  format: "woff2";
}

export const FONT_MANIFEST: Record<SupportedFont, FontManifestItem> = {
  Sarabun: {
    id: "Sarabun",
    family: "Sarabun",
    name: "สารบรรณ (Sarabun)",
    language: "th",
    category: "formal",
    description: "ทางการ เป็นระเบียบ เหมาะสำหรับหนังสือราชการและวุฒิบัตรทางการ",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/sarabun/v14/DtVkJxOVoTznr3a-5bU.woff2",
    assetHash: "0e89ad81bef89808bfd3304b56a006a6c71f0dc52724176cdd2eed1f6390ebca",
    googleFontQuery: "family=Sarabun:ital,wght@0,400;0,700;1,400",
    format: "woff2",
  },
  Prompt: {
    id: "Prompt",
    family: "Prompt",
    name: "พร้อม (Prompt)",
    language: "th",
    category: "modern",
    description: "โมเดิร์น เรียบหรู อ่านง่าย ทันสมัย เหมาะกับใบประกาศนียบัตรทั่วไป",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/prompt/v10/-W_6XJnvDpBPz3mr6w.woff2",
    assetHash: "ead0343a9044f26a3417380dfe990704bb6124001b96348630cfab7c7ed095e1",
    googleFontQuery: "family=Prompt:ital,wght@0,400;0,600;0,700;1,400",
    format: "woff2",
  },
  Kanit: {
    id: "Kanit",
    family: "Kanit",
    name: "คณิต (Kanit)",
    language: "th",
    category: "modern",
    description: "หนักแน่น ชัดเจน ร่วมสมัย นิยมใช้กับหัวข้อรางวัลและชื่อผู้รับ",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/kanit/v15/nKKZ-Go6G5tXkoaSEAc.woff2",
    assetHash: "1c0bc0a3348c68a2cbd4d8efe8df7b9ffa5db7f487a3bc20471ee22ea32a1add",
    googleFontQuery: "family=Kanit:ital,wght@0,400;0,600;0,700;1,400",
    format: "woff2",
  },
  Taviraj: {
    id: "Taviraj",
    family: "Taviraj",
    name: "ทวิราช (Taviraj)",
    language: "th",
    category: "formal",
    description: "มีหัว อ่อนช้อย สง่างาม เหมาะกับงานเกียรติยศและผู้ลงนาม",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/taviraj/v11/AHcbv8Cz154npxL2vV8.woff2",
    assetHash: "02546638a95070caaf0d2def0dee0fd29b732590f2f8fd774ccff7e7aa570043",
    googleFontQuery: "family=Taviraj:ital,wght@0,400;0,700;1,400",
    format: "woff2",
  },
  "Chakra Petch": {
    id: "Chakra Petch",
    family: "Chakra Petch",
    name: "จักรเพชร (Chakra Petch)",
    language: "th",
    category: "display",
    description: "ทรงเหลี่ยม ไฮเทค วิทยาศาสตร์ นวัตกรรม และกิจกรรมไอที",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/chakrapetch/v12/cIfaMaFLnIBe9NT6-bQ1JEd7.woff2",
    assetHash: "2518935bd1d73cd2bf8f15ea0305aa3aa18d3d7454f10e1f2cb11aab0cf76ed3",
    googleFontQuery: "family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,400",
    format: "woff2",
  },
  Mali: {
    id: "Mali",
    family: "Mali",
    name: "มะลิ (Mali)",
    language: "th",
    category: "handwriting",
    description: "ลายมือน่ารัก เป็นกันเอง เหมาะสำหรับเด็ก ประถมศึกษา และกิจกรรมสร้างสรรค์",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/mali/v12/N51XAPfl4i14-9bC.woff2",
    assetHash: "e6fcabb85f048cc524d87ce15d61e3bb2ed4734749d9fa59e62590306307a7bc",
    googleFontQuery: "family=Mali:ital,wght@0,400;0,600;0,700;1,400",
    format: "woff2",
  },
  "Playfair Display": {
    id: "Playfair Display",
    family: "Playfair Display",
    name: "Playfair Display (สากล/หรูหรา)",
    language: "en",
    category: "serif",
    description: "Serif สุดหรูระดับสากล นิยมสูงสุดในใบเกียรติบัตรภาษาอังกฤษและหลักสูตรนานาชาติ",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff2",
    assetHash: "3d5c614fb6b956b6ef2c1c88fb9d22a1c0ec377ca7178168f2f488ad11560a4e",
    googleFontQuery: "family=Playfair+Display:ital,wght@0,400;0,700;1,400",
    format: "woff2",
  },
  Cinzel: {
    id: "Cinzel",
    family: "Cinzel",
    name: "Cinzel (คลาสสิก/โรมัน)",
    language: "en",
    category: "serif",
    description: "ฟอนต์เกียรติยศแรงบันดาลใจจากอักษรจารึกโรมันโบราณ เพิ่มความขลังและสง่างาม",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/cinzel/v23/8vIU77632Wgw45u-q3qX.woff2",
    assetHash: "728bad275ee22a5e3bd9fd72c03fc7a05429626587e87b3c39c3009bb1f645a6",
    googleFontQuery: "family=Cinzel:wght@400;700",
    format: "woff2",
  },
  Montserrat: {
    id: "Montserrat",
    family: "Montserrat",
    name: "Montserrat (โมเดิร์นร่วมสมัย)",
    language: "en",
    category: "sans-serif",
    description: "Geometric Sans สะอาดตา เป็นมาตรฐานสากลในการออกแบบกราฟิกยุคใหม่",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.woff2",
    assetHash: "90ef00d028616367b4abd2c47b0281b774256903be7b8924003f60567b64d626",
    googleFontQuery: "family=Montserrat:ital,wght@0,400;0,600;0,700;1,400",
    format: "woff2",
  },
  Inter: {
    id: "Inter",
    family: "Inter",
    name: "Inter (คมชัด เรียบง่าย)",
    language: "en",
    category: "sans-serif",
    description: "อ่านง่าย ชัดเจนเป็นเลิศ เหมาะสำหรับข้อมูลรายละเอียดและรหัสอ้างอิง",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2",
    assetHash: "b04ffe218b50ae07fd5c3d62a69fa43a50f79ab8748b54f42408b61d38b3a8b8",
    googleFontQuery: "family=Inter:wght@400;600;700",
    format: "woff2",
  },
  "Noto Sans JP": {
    id: "Noto Sans JP",
    family: "Noto Sans JP",
    name: "Noto Sans JP (โกธิก/อ่านง่าย)",
    language: "ja",
    category: "sans-serif",
    description: "ฟอนต์ภาษาญี่ปุ่นมาตรฐานสากล รองรับคันจิ ฮิรางานะ คาตาคานะ ครบ 100%",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/notosansjp/v53/-F62fjtqLzK2o5FZeDeXOT5R.woff2",
    assetHash: "05cef7cefb3202bd645b3abb76664928a398fba6aa22efa45c4325af5103b6dd",
    googleFontQuery: "family=Noto+Sans+JP:wght@400;700",
    format: "woff2",
  },
  "Noto Serif JP": {
    id: "Noto Serif JP",
    family: "Noto Serif JP",
    name: "Noto Serif JP (มินโช/ทางการ)",
    language: "ja",
    category: "serif",
    description: "ฟอนต์มินโชแบบมีเชิงคลาสสิกของญี่ปุ่น สง่างาม เหมาะกับใบรับรองและรางวัลทางการ",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/notoserifjp/v30/xn7hYHE3xXekm7sx_34AFkWb1S2u.woff2",
    assetHash: "8a6d60dcd91462d346f10d8462300eaacca76050c0e29a97250f72d6dd0ea1b5",
    googleFontQuery: "family=Noto+Serif+JP:wght@400;700",
    format: "woff2",
  },
  "Noto Sans SC": {
    id: "Noto Sans SC",
    family: "Noto Sans SC",
    name: "Noto Sans SC (จีนประยุกต์ตัวย่อ)",
    language: "zh",
    category: "sans-serif",
    description: "อักษรจีนตัวย่อมาตรฐานสากล ครอบคลุมคลังอักขระจีนมาตรฐาน GB18030",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/notosanssc/v39/k3kCo84MPvpLkitqhkXx3IEG.woff2",
    assetHash: "2e92806a36fb750033a28f1960a37f895aee37f91124d4a03719c417da2a4a44",
    googleFontQuery: "family=Noto+Sans+SC:wght@400;700",
    format: "woff2",
  },
  "Noto Serif SC": {
    id: "Noto Serif SC",
    family: "Noto Serif SC",
    name: "Noto Serif SC (ซ่งถี่/พู่กันทางการ)",
    language: "zh",
    category: "serif",
    description: "อักษรจีนแบบพู่กันซ่งถี่ ทางการ ประณีต เหมาะสำหรับประกาศนียบัตรภาษาจีน",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/notoserifsc/v31/H4ckBX6Bm9y1sA2v53v2l4E.woff2",
    assetHash: "e4d065508322bdb7738bfe56eb1418958a11f927dd9bedd2578940fb6d3118a3",
    googleFontQuery: "family=Noto+Serif+SC:wght@400;700",
    format: "woff2",
  },
};

/**
 * Validates font binary magic bytes (WOFF2, WOFF, TrueType, OpenType).
 * Safe for server, client, and test runners (Buffer or Uint8Array).
 */
export function detectFontMagicBytes(buffer: Uint8Array | Buffer | number[]): {
  valid: boolean;
  format: string;
  mimeType: string;
} {
  if (!buffer || buffer.length < 4) {
    return { valid: false, format: "unknown", mimeType: "application/octet-stream" };
  }

  // WOFF2: 'wOF2' (0x77, 0x4F, 0x46, 0x32)
  if (buffer[0] === 0x77 && buffer[1] === 0x4f && buffer[2] === 0x46 && buffer[3] === 0x32) {
    return { valid: true, format: "woff2", mimeType: "font/woff2" };
  }

  // WOFF: 'wOFF' (0x77, 0x4F, 0x46, 0x46)
  if (buffer[0] === 0x77 && buffer[1] === 0x4f && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return { valid: true, format: "woff", mimeType: "font/woff" };
  }

  // TrueType: 0x00, 0x01, 0x00, 0x00 or 'true' (0x74, 0x72, 0x75, 0x65)
  if (
    (buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00) ||
    (buffer[0] === 0x74 && buffer[1] === 0x72 && buffer[2] === 0x75 && buffer[3] === 0x65)
  ) {
    return { valid: true, format: "ttf", mimeType: "font/ttf" };
  }

  // OpenType: 'OTTO' (0x4F, 0x54, 0x54, 0x4F)
  if (buffer[0] === 0x4f && buffer[1] === 0x54 && buffer[2] === 0x54 && buffer[3] === 0x4f) {
    return { valid: true, format: "otf", mimeType: "font/otf" };
  }

  return { valid: false, format: "unknown", mimeType: "application/octet-stream" };
}
