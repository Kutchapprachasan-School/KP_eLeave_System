import { createHash } from "crypto";

/**
 * Generates a 32-bit signed integer key from a string resource identifier
 * using SHA-256 for PostgreSQL pg_advisory_xact_lock.
 */
export function generateAdvisoryLockKey(resourceIdentifier: string): number {
  const hash = createHash("sha256").update(resourceIdentifier).digest();
  return hash.readInt32BE(0);
}
