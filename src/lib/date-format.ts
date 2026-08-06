export function formatLeaveDate(dateInput: string | Date | null | undefined, lang: "th" | "en" = "th"): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate());
  
  if (lang === "th") {
    const thaiMonthsShort = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const month = thaiMonthsShort[d.getMonth()];
    const yearBE = String(d.getFullYear() + 543);
    return `${day} ${month} ${yearBE}`;
  } else {
    const englishMonthsShort = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = englishMonthsShort[d.getMonth()];
    const yearCE = String(d.getFullYear());
    return `${day} ${month} ${yearCE}`;
  }
}
