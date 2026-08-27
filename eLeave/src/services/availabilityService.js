/**
 * SROP Phase 2: Availability Engine Service
 * Checks teacher availability across Timetable Slots, Approved Leaves, and Active Substitute Workflows.
 * Implements Routing Policies: CENTRALIZED, DEPARTMENT, HYBRID.
 */

export class AvailabilityService {
  constructor(store = { slots: [], offerings: [], leaves: [], workflows: [], teachers: [] }) {
    this.store = {
      slots: [],
      offerings: [],
      leaves: [],
      workflows: [],
      teachers: [],
      ...store
    };
  }

  /**
   * Helper to derive Day of Week (1=Monday, ..., 5=Friday, 6=Saturday, 0=Sunday)
   * from ISO date string (e.g. '2026-07-27').
   */
  static getDayOfWeekFromDate(dateStr) {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return undefined;
    return d.getDay();
  }

  /**
   * Check if a specific teacher is available on a given date, dayOfWeek, and periodNumber.
   */
  isTeacherAvailable(teacherId, dateStr, dayOfWeek, periodNumber, timetableVersionId) {
    const computedDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : AvailabilityService.getDayOfWeekFromDate(dateStr);

    // 1. Check Approved Leaves (Only APPROVED status blocks availability)
    const isLeaved = (this.store.leaves || []).some(leave => {
      if (leave.teacherId !== teacherId) return false;
      if (leave.status !== 'APPROVED') return false;

      // Single day or date range check
      const targetDate = new Date(dateStr).getTime();
      const startDate = new Date(leave.startDate).getTime();
      const endDate = new Date(leave.endDate).getTime();

      return targetDate >= startDate && targetDate <= endDate;
    });

    if (isLeaved) return false;

    // 2. Check Timetable Slot booking
    const teacherOfferingIds = new Set(
      (this.store.offerings || [])
        .filter(o => o.teacherId === teacherId)
        .map(o => o.id)
    );

    const isSlotBooked = (this.store.slots || []).some(slot => {
      if (timetableVersionId && slot.timetableVersionId !== timetableVersionId) return false;
      return (
        teacherOfferingIds.has(slot.offeringId) &&
        slot.dayOfWeek === computedDayOfWeek &&
        slot.periodNumber === periodNumber
      );
    });

    if (isSlotBooked) return false;

    // 3. Check Active Substitute Workflows (ASSIGNED or ACKNOWLEDGED)
    const isCoveringAnotherSlot = (this.store.workflows || []).some(wf => {
      if (wf.assignedTeacherId !== teacherId) return false;
      if (!['ASSIGNED', 'ACKNOWLEDGED'].includes(wf.status)) return false;
      if (wf.date !== dateStr) return false;

      // If workflow references a timetable slot, check if it falls on the same dayOfWeek & periodNumber
      if (wf.timetableSlotId) {
        const slot = (this.store.slots || []).find(s => s.id === wf.timetableSlotId);
        if (slot) {
          return slot.dayOfWeek === computedDayOfWeek && slot.periodNumber === periodNumber;
        }
      }

      // If workflow specifies period directly
      if (wf.periodNumber !== undefined) {
        return wf.periodNumber === periodNumber;
      }

      return false;
    });

    if (isCoveringAnotherSlot) return false;

    return true;
  }

  /**
   * Filter candidate pool for available teachers
   */
  getAvailableCandidates(teachers, dateStr, dayOfWeek, periodNumber, timetableVersionId) {
    const pool = teachers || this.store.teachers || [];
    return pool.filter(t =>
      this.isTeacherAvailable(t.id, dateStr, dayOfWeek, periodNumber, timetableVersionId)
    );
  }

  /**
   * Filter candidates based on school AssignmentPolicy:
   * - CENTRALIZED: All available teachers in school pool
   * - DEPARTMENT: Only available teachers from same department
   * - HYBRID: Same department first, fallback to all available teachers if pool empty
   */
  filterCandidatesByPolicy(availableCandidates, targetDepartmentId, policyType = 'DEPARTMENT') {
    if (policyType === 'CENTRALIZED') {
      return availableCandidates;
    }

    const sameDeptCandidates = availableCandidates.filter(c => c.departmentId === targetDepartmentId);

    if (policyType === 'DEPARTMENT') {
      return sameDeptCandidates;
    }

    if (policyType === 'HYBRID') {
      return sameDeptCandidates.length > 0 ? sameDeptCandidates : availableCandidates;
    }

    return availableCandidates;
  }

  /**
   * Unified Interface Contract for SROP:
   * getAvailableSubstitutes({ date, period, departmentId, policy, timetableVersionId, slotId, teachers, dayOfWeek })
   */
  getAvailableSubstitutes({
    date,
    period,
    departmentId,
    policy = 'DEPARTMENT',
    timetableVersionId,
    slotId,
    teachers,
    dayOfWeek
  }) {
    const computedDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : AvailabilityService.getDayOfWeekFromDate(date);
    const teacherPool = teachers || this.store.teachers || [];

    // 1. Filter all available candidates in teacherPool for the specified time slot
    const available = this.getAvailableCandidates(
      teacherPool,
      date,
      computedDayOfWeek,
      period,
      timetableVersionId
    );

    // 2. Apply assignment policy routing (CENTRALIZED, DEPARTMENT, HYBRID)
    return this.filterCandidatesByPolicy(available, departmentId, policy);
  }
}
