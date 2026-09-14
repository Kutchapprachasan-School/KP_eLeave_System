/**
 * Single Authoritative Time Utility for Facility Reservation Subsystem
 *
 * PostgreSQL Reality:
 * "startAt" and "endAt" are `timestamp without time zone` columns.
 * They do not contain timezone semantics in PostgreSQL.
 *
 * INVARIANT:
 * 1. All DB wall-clock values are defined as UTC Wall-Clock Time.
 * 2. All incoming strings without timezone offsets are rejected immediately.
 * 3. All outgoing values are converted to canonical UTC ISO 8601 strings (e.g. "2026-09-20T02:00:00.000Z").
 * 4. Never append "Z" to a string that already has a timezone offset (+07:00).
 */

/**
 * Converts input (Date or ISO string with timezone) into a UTC Date object for DB insertion.
 * Rejects bare strings without timezone (e.g. "2026-09-20 09:00:00").
 */
export function toDbUtcDate(input: string | Date): Date {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      throw new Error("INVALID_TIME: Invalid Date object");
    }
    return input;
  }

  if (typeof input !== "string" || !input.trim()) {
    throw new Error("INVALID_TIME: Time input must be a non-empty string or Date");
  }

  const s = input.trim();

  // Reject bare string without timezone offset (must end with Z or ±HH:MM or ±HHMM)
  const hasTimezoneOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i;
  if (!hasTimezoneOffset.test(s)) {
    throw new Error(`INVALID_TIME: Missing timezone offset. Input "${s}" must specify Z or ±HH:MM`);
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw new Error(`INVALID_TIME: Cannot parse "${s}" as valid date`);
  }

  return d;
}

/**
 * Converts a DB Date or string back to a Canonical UTC ISO 8601 String.
 * Handles 3 distinct cases without double-suffixing "Z":
 *   1. Date object -> .toISOString()
 *   2. ISO string with timezone offset (+HH:MM / -HH:MM) -> parse directly, .toISOString()
 *   3. ISO string ending with Z -> parse directly, .toISOString()
 *   4. DB wall-clock string without timezone -> append "Z", .toISOString()
 */
export function toIsoUtcString(dbDateOrString: Date | string): string {
  if (dbDateOrString instanceof Date) {
    if (isNaN(dbDateOrString.getTime())) {
      throw new Error("INVALID_TIME: Invalid Date object");
    }
    return dbDateOrString.toISOString();
  }

  if (typeof dbDateOrString !== "string" || !dbDateOrString.trim()) {
    throw new Error("INVALID_TIME: Value must be a non-empty string or Date");
  }

  const s = dbDateOrString.trim();

  // Case 1: Has offset (+HH:MM or -HH:MM) -> parse directly, NEVER append "Z"
  if (/[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    if (isNaN(d.getTime())) throw new Error(`INVALID_TIME: Cannot parse "${s}"`);
    return d.toISOString();
  }

  // Case 2: Ends with Z
  if (s.endsWith("Z") || s.endsWith("z")) {
    const d = new Date(s);
    if (isNaN(d.getTime())) throw new Error(`INVALID_TIME: Cannot parse "${s}"`);
    return d.toISOString();
  }

  // Case 3: DB wall-clock string without timezone (e.g. "2026-09-20 02:00:00" or "2026-09-20T02:00:00.000")
  // Since PostgreSQL TIMESTAMP WITHOUT TIME ZONE is defined as UTC wall-clock, we append "Z"
  const formatted = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(formatted + "Z");
  if (isNaN(d.getTime())) throw new Error(`INVALID_TIME: Cannot parse "${s}"`);
  return d.toISOString();
}

/**
 * Returns current UTC instant.
 * Single entry point for "now", making time logic deterministic and mockable in tests.
 */
export function utcNow(): Date {
  return new Date();
}

/**
 * Calculates dynamic SLA expiry timestamp for a reservation.
 * Enforces:
 *   - Both createdAt and startAt are parsed through toDbUtcDate()
 *   - SLA deadline = createdAt + slaHours
 *   - Buffer deadline = startAt - bufferHours
 *   - Picks the earliest between SLA deadline and buffer deadline
 *   - Minimum 30-minute grace period from utcNow()
 */
export function calculateDynamicSlaExpiry(
  startAt: Date | string,
  slaHours: number,
  bufferHours: number,
  createdAt: Date | string = utcNow()
): Date {
  const start = toDbUtcDate(startAt);
  const created = toDbUtcDate(createdAt);
  const now = utcNow();

  const slaDeadline = new Date(created.getTime() + slaHours * 3600_000);
  const latestBuffer = new Date(start.getTime() - bufferHours * 3600_000);

  const earliest = slaDeadline.getTime() < latestBuffer.getTime() ? slaDeadline : latestBuffer;
  const minGrace = new Date(now.getTime() + 30 * 60_000);

  return earliest.getTime() < minGrace.getTime() ? minGrace : earliest;
}
