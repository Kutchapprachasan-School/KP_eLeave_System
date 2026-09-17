const { describe, it } = require('node:test');
const assert = require('node:assert');

// Fast in-memory implementation under test
function calculateLeaveDaysFast(startDateStr, endDateStr, type, holidayDates, specialWorkdayDates) {
  if (!startDateStr || !endDateStr) return 0;
  if (endDateStr < startDateStr) return 0;

  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const [eY, eM, eD] = endDateStr.split("-").map(Number);
  if (isNaN(sY) || isNaN(sM) || isNaN(sD) || isNaN(eY) || isNaN(eM) || isNaN(eD)) return 0;

  const startUTC = new Date(Date.UTC(sY, sM - 1, sD));
  const endUTC = new Date(Date.UTC(eY, eM - 1, eD));
  if (endUTC < startUTC) return 0;

  if (type === "MATERNITY") {
    return Math.round((endUTC.getTime() - startUTC.getTime()) / 86400000) + 1;
  }

  let count = 0;
  const current = new Date(startUTC);
  while (current <= endUTC) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    const dayStr = `${y}-${m}-${d}`;
    const dayOfWeek = current.getUTCDay();

    if (specialWorkdayDates.has(dayStr)) {
      count++;
    } else if (holidayDates.has(dayStr)) {
      // Holiday, skip
    } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

// Canonical stepping implementation for parity comparison
function calculateLeaveDaysReference(startDate, endDate, type, holidays) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  if (type === "MATERNITY") {
    return Math.ceil((endUTC.getTime() - startUTC.getTime()) / 86400000) + 1;
  }

  const holidayDates = new Set();
  const specialWorkdayDates = new Set();

  for (const h of holidays) {
    const hStart = new Date(h.startDate);
    const hEnd = new Date(h.endDate);
    const cur = new Date(Date.UTC(hStart.getUTCFullYear(), hStart.getUTCMonth(), hStart.getUTCDate()));
    const curEnd = new Date(Date.UTC(hEnd.getUTCFullYear(), hEnd.getUTCMonth(), hEnd.getUTCDate()));
    while (cur <= curEnd) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cur.getUTCDate()).padStart(2, "0");
      const str = `${y}-${m}-${d}`;
      if (h.isWorkday) specialWorkdayDates.add(str);
      else holidayDates.add(str);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  let count = 0;
  const current = new Date(startUTC);
  while (current <= endUTC) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    const dayStr = `${y}-${m}-${d}`;
    const dayOfWeek = current.getUTCDay();

    if (specialWorkdayDates.has(dayStr)) {
      count++;
    } else if (holidayDates.has(dayStr)) {
      // skip
    } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

describe('Leave Days Calculation Parity & Edge Case Verification', () => {
  const sampleHolidays = [
    { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-01T23:59:59.999Z', isWorkday: false },
    { startDate: '2026-01-02T00:00:00.000Z', endDate: '2026-01-02T23:59:59.999Z', isWorkday: false }, // Fri holiday
    { startDate: '2026-01-10T00:00:00.000Z', endDate: '2026-01-10T23:59:59.999Z', isWorkday: true }   // Sat special workday
  ];

  const holidaySet = new Set(['2026-01-01', '2026-01-02']);
  const workdaySet = new Set(['2026-01-10']);

  it('Scenario 1: Single normal workday (Mon-Mon)', () => {
    // 2026-01-05 is Monday
    const fast = calculateLeaveDaysFast('2026-01-05', '2026-01-05', 'SICK', holidaySet, workdaySet);
    const ref = calculateLeaveDaysReference(new Date('2026-01-05T00:00:00Z'), new Date('2026-01-05T00:00:00Z'), 'SICK', sampleHolidays);
    assert.strictEqual(fast, 1);
    assert.strictEqual(fast, ref);
  });

  it('Scenario 2: Spanning over a weekend (Fri-Tue)', () => {
    // 2026-01-09 (Fri) to 2026-01-13 (Tue), with 2026-01-10 (Sat) as special workday
    // Days: Fri (1) + Sat workday (1) + Sun (0) + Mon (1) + Tue (1) = 4 days
    const fast = calculateLeaveDaysFast('2026-01-09', '2026-01-13', 'PERSONAL', holidaySet, workdaySet);
    const ref = calculateLeaveDaysReference(new Date('2026-01-09T00:00:00Z'), new Date('2026-01-13T00:00:00Z'), 'PERSONAL', sampleHolidays);
    assert.strictEqual(fast, 4);
    assert.strictEqual(fast, ref);
  });

  it('Scenario 3: National holidays on workdays (Thu-Fri holiday)', () => {
    // 2026-01-01 (Thu) to 2026-01-02 (Fri) are holidays
    const fast = calculateLeaveDaysFast('2026-01-01', '2026-01-02', 'VACATION', holidaySet, workdaySet);
    const ref = calculateLeaveDaysReference(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-02T00:00:00Z'), 'VACATION', sampleHolidays);
    assert.strictEqual(fast, 0);
    assert.strictEqual(fast, ref);
  });

  it('Scenario 4: Maternity leave counts all days (including holidays & weekends)', () => {
    // 2026-01-01 to 2026-01-05 = 5 calendar days
    const fast = calculateLeaveDaysFast('2026-01-01', '2026-01-05', 'MATERNITY', holidaySet, workdaySet);
    const ref = calculateLeaveDaysReference(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-05T00:00:00Z'), 'MATERNITY', sampleHolidays);
    assert.strictEqual(fast, 5);
    assert.strictEqual(fast, ref);
  });

  it('Scenario 5: Reporting window intersection boundary clipping', () => {
    // Leave spans from 2025-09-28 to 2025-10-04 (Sun-Sat)
    // Cycle 2 ends on 2025-09-30
    const reqStart = '2025-09-28';
    const reqEnd = '2025-10-04';
    const cycleEnd = '2025-09-30';
    const effectiveEnd = reqEnd < cycleEnd ? reqEnd : cycleEnd; // '2025-09-30'
    
    // 2025-09-28 (Sun, 0), 2025-09-29 (Mon, 1), 2025-09-30 (Tue, 1) = 2 workdays
    const daysInCycle = calculateLeaveDaysFast(reqStart, effectiveEnd, 'SICK', new Set(), new Set());
    assert.strictEqual(daysInCycle, 2);
  });
});
