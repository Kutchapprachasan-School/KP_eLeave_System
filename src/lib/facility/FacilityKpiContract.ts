/**
 * Canonical KPI Contract for Facility & Vehicle Management
 * Pure, side-effect-free formulas governing official school statistics.
 */

export interface FacilityUsageRecord {
  id: string;
  status: string; // PENDING, APPROVED, IN_USE, COMPLETED, CANCELLED, REJECTED
  startAt: Date | string;
  endAt: Date | string;
  approvalSteps?: Array<{ status: string }>;
}

export function calculateApprovedCount(records: FacilityUsageRecord[]): number {
  return records.filter(r => ['APPROVED', 'IN_USE', 'COMPLETED'].includes(r.status)).length;
}

export function calculateActualUsageCount(records: FacilityUsageRecord[]): number {
  return records.filter(r => ['IN_USE', 'COMPLETED'].includes(r.status)).length;
}

export function calculateCompletedCount(records: FacilityUsageRecord[]): number {
  return records.filter(r => r.status === 'COMPLETED').length;
}

export function calculateNoShowCount(records: FacilityUsageRecord[]): number {
  return records.filter(r => {
    if (r.status !== 'CANCELLED') return false;
    const hadApproval = r.approvalSteps?.some(s => s.status === 'APPROVED');
    return Boolean(hadApproval);
  }).length;
}

export function calculateUtilizedHours(records: FacilityUsageRecord[]): number {
  const actualRecords = records.filter(r => ['IN_USE', 'COMPLETED'].includes(r.status));
  const totalMs = actualRecords.reduce((sum, r) => {
    const start = new Date(r.startAt).getTime();
    const end = new Date(r.endAt).getTime();
    if (end > start) {
      return sum + (end - start);
    }
    return sum;
  }, 0);
  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}
