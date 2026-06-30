export function formatLeaveDate(dateInput: string | Date | null | undefined, lang: "th" | "en" = "th"): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  
  if (lang === "th") {
    const thaiMonthsShort = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const month = thaiMonthsShort[d.getMonth()];
    // Short BE year (e.g. 2569 -> 69)
    const yearBE = String(d.getFullYear() + 543).slice(-2);
    return `${day} ${month} ${yearBE}`;
  } else {
    const englishMonthsShort = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = englishMonthsShort[d.getMonth()];
    // Short CE year (e.g. 2026 -> 26)
    const yearCE = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${yearCE}`;
  }
}
