import crypto from "crypto";

export interface FacilityActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  correlationId?: string;
}

/**
 * Universal Safe Action Boundary Wrapper for Facility Subsystem
 *
 * Guarantees:
 * 1. NEVER throws uncaught exceptions across Server Action boundary (immunizing against Next.js production error masking / React error #441).
 * 2. Deterministic error code classification:
 *    - "23P01" (PostgreSQL exclusion_violation) -> code: "CONFLICT"
 *    - "SLA_EXPIRED" -> code: "SLA_EXPIRED"
 *    - "IDEMPOTENCY_MISMATCH" -> code: "IDEMPOTENCY_MISMATCH"
 *    - "INVALID_TIME" -> code: "INVALID_TIME"
 *    - "UNAUTHORIZED" / "FORBIDDEN" -> code: "FORBIDDEN"
 * 3. Associates every mutation with a correlation UUID for production observability.
 */
export async function executeFacilityAction<T>(
  actionName: string,
  fn: (correlationId: string) => Promise<T>,
  postCommitRevalidate?: () => Promise<void> | void
): Promise<FacilityActionResult<T>> {
  const correlationId = crypto.randomUUID();

  try {
    const data = await fn(correlationId);

    // If a post-commit revalidation function is provided, run it safely
    if (postCommitRevalidate) {
      try {
        await postCommitRevalidate();
      } catch (revErr) {
        console.warn(`[${actionName}][${correlationId}] Non-fatal post-commit revalidate warning:`, revErr);
      }
    }

    return {
      success: true,
      data,
      correlationId,
    };
  } catch (err: any) {
    const code = classifyFacilityErrorCode(err);
    const message = extractCleanErrorMessage(err);

    console.error(`[${actionName}][${correlationId}] Action error [${code}]:`, {
      message,
      stack: err?.stack,
      rawCode: err?.code,
      constraint: err?.constraint,
    });

    return {
      success: false,
      error: message,
      code,
      correlationId,
    };
  }
}

/**
 * Classifies an error into a standardized business / forensic error code.
 */
export function classifyFacilityErrorCode(err: any): string {
  if (!err) return "INTERNAL_ERROR";

  const msg = String(err.message || "");
  const code = String(err.code || "");
  const constraint = String(err.constraint || "");

  // PostgreSQL Exclusion Violation
  if (code === "23P01" || constraint.includes("no_overlapping") || msg.includes("exclusion constraint")) {
    return "CONFLICT";
  }

  // SLA Expiry
  if (msg.includes("SLA_EXPIRED") || code === "SLA_EXPIRED") {
    return "SLA_EXPIRED";
  }

  // Idempotency Mismatch
  if (msg.includes("IDEMPOTENCY_MISMATCH") || code === "IDEMPOTENCY_MISMATCH") {
    return "IDEMPOTENCY_MISMATCH";
  }

  // Invalid Time
  if (msg.includes("INVALID_TIME") || code === "INVALID_TIME") {
    return "INVALID_TIME";
  }

  // Permissions
  if (msg.includes("UNAUTHORIZED") || msg.includes("FORBIDDEN") || msg.includes("ไม่มีสิทธิ์")) {
    return "FORBIDDEN";
  }

  // General Concurrency / Conflict
  if (msg.includes("CONFLICT") || code === "CONFLICT" || msg.includes("ทับซ้อน") || msg.includes("ไม่ว่าง")) {
    return "CONFLICT";
  }

  return "BAD_REQUEST";
}

/**
 * Extracts a human-readable, clean error message without internal stack leaks.
 */
export function extractCleanErrorMessage(err: any): string {
  if (!err) return "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";

  const rawMsg = String(err.message || "");

  if (classifyFacilityErrorCode(err) === "CONFLICT") {
    return "ทรัพยากรหรือผู้ขับขี่นี้ถูกจองหรือได้รับอนุมัติในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกช่วงเวลาหรือทรัพยากรอื่น";
  }

  if (rawMsg.startsWith("SLA_EXPIRED:")) {
    return rawMsg.replace("SLA_EXPIRED:", "").trim();
  }

  if (rawMsg.startsWith("IDEMPOTENCY_MISMATCH:")) {
    return rawMsg.replace("IDEMPOTENCY_MISMATCH:", "").trim();
  }

  if (rawMsg.startsWith("INVALID_TIME:")) {
    return rawMsg.replace("INVALID_TIME:", "").trim();
  }

  return rawMsg || "การดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}
