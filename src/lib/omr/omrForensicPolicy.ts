import crypto from 'crypto';

/**
 * OMR Forensic Policy & Data Integrity Engine (Rev 9.0 Locked)
 * Enforces:
 * - Anti-silent-fallback choice semantics
 * - Monotonic sequence ordering for overrides
 * - Server-derived previousChoice resolution
 * - Optimistic locking (overrideVersion)
 * - SHA-256 Raw image chain of custody
 * - Ingest idempotency
 */

export type DetectionStatusType = 'SINGLE_MARK' | 'MULTIPLE_MARKS' | 'NO_MARK' | 'AMBIGUOUS' | 'LOW_CONFIDENCE';

export interface OverrideRecord {
  id?: string;
  submissionItemId: string;
  sequenceNo: number | bigint;
  previousChoice: string | null;
  overrideChoice: string;
  reason: string;
  actorUserId: string;
  requestId: string;
  createdAt?: string | Date;
}

export interface ExamItemState {
  itemNo: number;
  detectedChoices: string[];
  fillRatios: Record<string, number>;
  confidenceScore: number;
  detectionStatus: DetectionStatusType;
  overrideVersion: number;
  overrides?: OverrideRecord[];
}

/**
 * Evaluates OMR mark detection status without silent fallback.
 */
export function evaluateDetectionStatus(
  detectedChoices: string[],
  confidenceScore: number,
  fillRatios: Record<string, number> = {}
): DetectionStatusType {
  if (!detectedChoices || detectedChoices.length === 0) {
    return 'NO_MARK';
  }

  if (detectedChoices.length > 1) {
    return 'MULTIPLE_MARKS';
  }

  // Check if top 2 fill ratios are dangerously close (ambiguous eraser residue)
  const ratios = Object.values(fillRatios).sort((a, b) => b - a);
  if (ratios.length >= 2 && ratios[0] > 0.35 && ratios[1] > 0.25 && (ratios[0] - ratios[1]) < 0.15) {
    return 'AMBIGUOUS';
  }

  if (confidenceScore < 0.60) {
    return 'LOW_CONFIDENCE';
  }

  return 'SINGLE_MARK';
}

/**
 * Resolves Effective Choice.
 * Genuinely enforces: NO SILENT FALLBACK.
 * If detectionStatus is not SINGLE_MARK and no override exists, effectiveChoice is strictly NULL.
 */
export function resolveEffectiveChoice(item: {
  detectionStatus: DetectionStatusType;
  detectedChoices: string[];
  overrides?: OverrideRecord[];
}): string | null {
  // 1. If teacher overrides exist, latest override by sequenceNo wins
  if (item.overrides && item.overrides.length > 0) {
    const sorted = [...item.overrides].sort((a, b) => Number(b.sequenceNo) - Number(a.sequenceNo));
    return sorted[0].overrideChoice;
  }

  // 2. Machine detection: Only award choice if cleanly verified as SINGLE_MARK
  if (item.detectionStatus === 'SINGLE_MARK' && item.detectedChoices.length === 1) {
    return item.detectedChoices[0];
  }

  // 3. For MULTIPLE_MARKS, NO_MARK, AMBIGUOUS, LOW_CONFIDENCE -> NEVER FALLBACK
  return null;
}

/**
 * Calculates score for an item.
 * Strictly returns 0 if effectiveChoice is NULL or not in answerKey.
 */
export function calculateItemScore(
  effectiveChoice: string | null,
  correctChoices: string[],
  maxScore: number = 1.00
): { isCorrect: boolean; scoreEarned: number } {
  if (!effectiveChoice) {
    return { isCorrect: false, scoreEarned: 0.00 };
  }

  const isCorrect = correctChoices.includes(effectiveChoice);
  return {
    isCorrect,
    scoreEarned: isCorrect ? maxScore : 0.00
  };
}

/**
 * Computes SHA-256 Checksum for Raw Image Chain of Custody.
 */
export function computeRawImageHash(buffer: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Derives previousChoice strictly on server from current effective state.
 * Client-submitted previousChoice is discarded.
 */
export function deriveServerPreviousChoice(item: {
  detectionStatus: DetectionStatusType;
  detectedChoices: string[];
  overrides?: OverrideRecord[];
}): string | null {
  return resolveEffectiveChoice(item);
}

/**
 * Validates Optimistic Lock.
 * Rejects concurrent modification if versions mismatch.
 */
export function validateOptimisticLock(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw new Error(`HTTP 409 Conflict: Concurrent modification detected. Current override version is ${currentVersion}, expected ${expectedVersion}.`);
  }
}

/**
 * Computes next monotonic sequence number for an item's override ledger.
 */
export function getNextSequenceNo(overrides?: OverrideRecord[]): bigint {
  if (!overrides || overrides.length === 0) {
    return 1n;
  }
  const maxSeq = overrides.reduce((max, o) => {
    const seq = BigInt(o.sequenceNo);
    return seq > max ? seq : max;
  }, 0n);
  return maxSeq + 1n;
}

/**
 * Idempotency Ingest Handler.
 * Returns existing submission if clientScanId already processed.
 */
export function handleIngestIdempotency(
  existingSubmissions: Array<{ id: string; clientScanId: string; netScore: any }>,
  clientScanId: string
): { isDuplicate: boolean; existingSubmission?: any } {
  const match = existingSubmissions.find(s => s.clientScanId === clientScanId);
  if (match) {
    return { isDuplicate: true, existingSubmission: match };
  }
  return { isDuplicate: false };
}
