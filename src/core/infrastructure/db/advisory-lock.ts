import { createHash } from "crypto";

/**
 * Generates a signed 64-bit integer lock key from a string using SHA-256 for Postgres Advisory Locks
 */
export function generateAdvisoryLockKey(resourceIdentifier: string): bigint {
  const hash = createHash("sha256").update(resourceIdentifier).digest("hex");
  // Take first 16 hex characters (64 bits) and convert to BigInt
  const BigInt64 = BigInt(`0x${hash.slice(0, 16)}`);
  return BigInt.asIntN(64, BigInt64);
}
