export interface LeaveCycle {
  label: string;
  start: Date;
  end: Date;
}

export function getCurrentLeaveCycle(date: Date = new Date(), lang: "th" | "en" = "th"): LeaveCycle {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = Jan, 9 = Oct)

  if (month >= 9) {
    // Oct 1 to Mar 31 of next year
    return {
      label: lang === "th" 
        ? `รอบ 1/${year + 544} (1 ต.ค. ${year + 543} - 31 มี.ค. ${year + 544})` 
        : `Cycle 1/${year + 544} (01/10/${year + 543} - 31/03/${year + 544})`,
      start: new Date(year, 9, 1), // Oct 1
      end: new Date(year + 1, 2, 31, 23, 59, 59, 999), // Mar 31
    };
  } else if (month <= 2) {
    // Jan 1 to Mar 31 (still part of Oct 1 to Mar 31 of current year)
    return {
      label: lang === "th" 
        ? `รอบ 1/${year + 543} (1 ต.ค. ${year + 542} - 31 มี.ค. ${year + 543})`
        : `Cycle 1/${year + 543} (01/10/${year + 542} - 31/03/${year + 543})`,
      start: new Date(year - 1, 9, 1), // Oct 1 previous year
      end: new Date(year, 2, 31, 23, 59, 59, 999), // Mar 31 current year
    };
  } else {
    // Apr 1 to Sep 30 (Apr is 3, Sep is 8)
    return {
      label: lang === "th" 
        ? `รอบ 2/${year + 543} (1 เม.ย. ${year + 543} - 30 ก.ย. ${year + 543})`
        : `Cycle 2/${year + 543} (01/04/${year + 543} - 30/09/${year + 543})`,
      start: new Date(year, 3, 1), // Apr 1
      end: new Date(year, 8, 30, 23, 59, 59, 999), // Sep 30
    };
  }
}

export function getLeaveCycleFilter(date: Date = new Date(), mode: "current" | "cycle1" | "cycle2" | "year" | "all" = "current", lang: "th" | "en" = "th"): LeaveCycle | null {
  if (mode === "all") return null;
  
  if (mode === "current") {
    return getCurrentLeaveCycle(date, lang);
  }

  // Determine the base academic year start year (October of baseYear)
  let baseYear = date.getFullYear();
  const month = date.getMonth();
  if (month <= 2) {
    baseYear -= 1; // Jan-Mar belongs to previous year's start
  } else if (month >= 3 && month <= 8) {
    baseYear -= 1; // Apr-Sep belongs to previous year's Oct start
  }

  if (mode === "cycle1") {
    return {
      label: lang === "th"
        ? `รอบ 1/${baseYear + 1 + 543} (1 ต.ค. ${baseYear + 543} - 31 มี.ค. ${baseYear + 1 + 543})`
        : `Cycle 1/${baseYear + 1 + 543} (01/10/${baseYear + 543} - 31/03/${baseYear + 1 + 543})`,
      start: new Date(baseYear, 9, 1), // Oct 1
      end: new Date(baseYear + 1, 2, 31, 23, 59, 59, 999), // Mar 31
    };
  } else if (mode === "cycle2") {
    return {
      label: lang === "th"
        ? `รอบ 2/${baseYear + 1 + 543} (1 เม.ย. ${baseYear + 1 + 543} - 30 ก.ย. ${baseYear + 1 + 543})`
        : `Cycle 2/${baseYear + 1 + 543} (01/04/${baseYear + 1 + 543} - 30/09/${baseYear + 1 + 543})`,
      start: new Date(baseYear + 1, 3, 1), // Apr 1
      end: new Date(baseYear + 1, 8, 30, 23, 59, 59, 999), // Sep 30
    };
  } else if (mode === "year") {
    return {
      label: lang === "th" 
        ? `ปีงบประมาณ ${baseYear + 1 + 543}`
        : `FY ${baseYear + 1 + 543}`,
      start: new Date(baseYear, 9, 1),
      end: new Date(baseYear + 1, 8, 30, 23, 59, 59, 999),
    };
  }

  return getCurrentLeaveCycle(date, lang);
}
