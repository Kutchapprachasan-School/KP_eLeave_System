/**
 * SROP Phase 2: Availability Engine Service
 * Checks teacher availability across Timetable Slots and Approved Leaves.
 */

export class AvailabilityService {
  constructor(store = { slots: [], offerings: [], leaves: [] }) {
    this.store = store;
  }

  /**
   * Check if a specific teacher is available on a given date, dayOfWeek, and periodNumber.
   */
  isTeacherAvailable(teacherId, dateStr, dayOfWeek, periodNumber, timetableVersionId) {
    // 1. Check Approved Leaves
    const isLeaved = this.store.leaves.some(leave => {
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
      this.store.offerings.filter(o => o.teacherId === teacherId).map(o => o.id)
    );

    const isSlotBooked = this.store.slots.some(slot => {
      if (timetableVersionId && slot.timetableVersionId !== timetableVersionId) return false;
      return (
        teacherOfferingIds.has(slot.offeringId) &&
        slot.dayOfWeek === dayOfWeek &&
        slot.periodNumber === periodNumber
      );
    });

    return !isSlotBooked;
  }

  /**
   * Filter candidate pool for available teachers
   */
  getAvailableCandidates(teachers, dateStr, dayOfWeek, periodNumber, timetableVersionId) {
    return teachers.filter(t =>
      this.isTeacherAvailable(t.id, dateStr, dayOfWeek, periodNumber, timetableVersionId)
    );
  }
}
