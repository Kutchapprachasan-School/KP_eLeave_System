// Thai Numerals Mapping using Unicode escape sequences
const arabicToThaiMap = ["\u0e50", "\u0e51", "\u0e52", "\u0e53", "\u0e54", "\u0e55", "\u0e56", "\u0e57", "\u0e58", "\u0e59"];

export function toThaiNumerals(num: string | number): string {
  return String(num)
    .split("")
    .map((char) => {
      const idx = parseInt(char);
      return isNaN(idx) ? char : arabicToThaiMap[idx];
    })
    .join("");
}

// Core helper for pattern rendering
export function formatDocNumber(
  pattern: string,
  prefix: string,
  seq: number,
  year: number,
  padding: number,
  useThai: boolean
): string {
  let seqStr = String(seq).padStart(padding, "0");
  let yearStr = String(year);
  if (useThai) {
    seqStr = toThaiNumerals(seqStr);
    yearStr = toThaiNumerals(yearStr);
  }
  
  let formatted = pattern
    .replace("[PREFIX]", prefix)
    .replace("[SEQ]", seqStr)
    .replace("[YEAR]", yearStr);
    
  return formatted;
}
