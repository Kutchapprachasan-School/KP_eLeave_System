/**
 * Font Manifest (Server & Client Safe)
 * Deterministic metadata for Thai certificate typography.
 */

export const SUPPORTED_FONTS = [
  "Sarabun",
  "Prompt",
  "Kanit",
  "Taviraj",
  "Chakra Petch",
  "Mali",
] as const;

export type SupportedFont = (typeof SUPPORTED_FONTS)[number];

export interface FontManifestItem {
  id: SupportedFont;
  family: string;
  name: string;
  category: "formal" | "modern" | "display" | "handwriting";
  description: string;
  version: string;
  weights: number[];
  assetUrl: string;
  assetHash: string;
  googleFontQuery: string;
}

export const FONT_MANIFEST: Record<SupportedFont, FontManifestItem> = {
  Sarabun: {
    id: "Sarabun",
    family: "Sarabun",
    name: "สารบรรณ (Sarabun)",
    category: "formal",
    description: "ทางการ เป็นระเบียบ เหมาะสำหรับหนังสือราชการและวุฒิบัตรทางการ",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/sarabun/v14/DtVkJxOVoTznr3a-5bU.woff2",
    assetHash: "sha256-sarabun-v14-thai",
    googleFontQuery: "family=Sarabun:ital,wght@0,400;0,700;1,400",
  },
  Prompt: {
    id: "Prompt",
    family: "Prompt",
    name: "พร้อม (Prompt)",
    category: "modern",
    description: "โมเดิร์น เรียบหรู อ่านง่าย ทันสมัย เหมาะกับใบประกาศนียบัตรทั่วไป",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/prompt/v10/-W_6XJnvDpBPz3mr6w.woff2",
    assetHash: "sha256-prompt-v10-thai",
    googleFontQuery: "family=Prompt:ital,wght@0,400;0,600;0,700;1,400",
  },
  Kanit: {
    id: "Kanit",
    family: "Kanit",
    name: "คณิต (Kanit)",
    category: "modern",
    description: "หนักแน่น ชัดเจน ร่วมสมัย นิยมใช้กับหัวข้อรางวัลและชื่อผู้รับ",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/kanit/v15/nKKZ-Go6G5tXkoaSEAc.woff2",
    assetHash: "sha256-kanit-v15-thai",
    googleFontQuery: "family=Kanit:ital,wght@0,400;0,600;0,700;1,400",
  },
  Taviraj: {
    id: "Taviraj",
    family: "Taviraj",
    name: "ทวิราช (Taviraj)",
    category: "formal",
    description: "มีหัว อ่อนช้อย สง่างาม เหมาะกับงานเกียรติยศและผู้ลงนาม",
    version: "1.0.0",
    weights: [400, 700],
    assetUrl: "https://fonts.gstatic.com/s/taviraj/v11/AHcbv8Cz154npxL2vV8.woff2",
    assetHash: "sha256-taviraj-v11-thai",
    googleFontQuery: "family=Taviraj:ital,wght@0,400;0,700;1,400",
  },
  "Chakra Petch": {
    id: "Chakra Petch",
    family: "Chakra Petch",
    name: "จักรเพชร (Chakra Petch)",
    category: "display",
    description: "ทรงเหลี่ยม ไฮเทค วิทยาศาสตร์ นวัตกรรม และกิจกรรมไอที",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/chakrapetch/v12/cIfaMaFLnIBe9NT6-bQ1JEd7.woff2",
    assetHash: "sha256-chakrapetch-v12-thai",
    googleFontQuery: "family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,400",
  },
  Mali: {
    id: "Mali",
    family: "Mali",
    name: "มะลิ (Mali)",
    category: "handwriting",
    description: "ลายมือน่ารัก เป็นกันเอง เหมาะสำหรับเด็ก ประถมศึกษา และกิจกรรมสร้างสรรค์",
    version: "1.0.0",
    weights: [400, 600, 700],
    assetUrl: "https://fonts.gstatic.com/s/mali/v12/N51XAPfl4i14-9bC.woff2",
    assetHash: "sha256-mali-v12-thai",
    googleFontQuery: "family=Mali:ital,wght@0,400;0,600;0,700;1,400",
  },
};
