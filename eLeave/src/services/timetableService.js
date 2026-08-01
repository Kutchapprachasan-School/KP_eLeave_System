/**
 * SROP Phase 1: Timetable Service
 * Handles Version Pointer Switch and Slot Collision Protection.
 */

export class TimetableService {
  constructor(store = { versions: [], slots: [], offerings: [], rooms: [] }) {
    this.store = store;
  }

  /**
   * Version Pointer Switch:
   * Sets target version to PUBLISHED & isCurrentPublished = true,
   * while archiving/deactivating previous published version.
   * Supports publishVersion(versionId) or publishVersion(schoolId, academicYear, term, targetVersionId).
   */
  publishVersion(arg1, arg2, arg3, arg4) {
    let targetVersionId;
    let schoolId;
    let academicYear;
    let term;

    if (arguments.length === 1 || (arg1 && arg2 === undefined && arg3 === undefined && arg4 === undefined)) {
      targetVersionId = arg1;
    } else if (arguments.length >= 4) {
      schoolId = arg1;
      academicYear = arg2;
      term = arg3;
      targetVersionId = arg4;
    } else {
      targetVersionId = arg1;
    }

    const version = (this.store.versions || []).find(v => v.id === targetVersionId);
    if (!version) {
      throw new Error(`TimetableVersion ${targetVersionId} not found`);
    }

    const targetSchoolId = schoolId || version.schoolId;
    const targetAcademicYear = academicYear !== undefined ? academicYear : version.academicYear;
    const targetTerm = term !== undefined ? term : version.term;

    // Switch pointers atomically for versions in scope
    (this.store.versions || []).forEach(v => {
      const matchesScope =
        (!targetSchoolId || v.schoolId === targetSchoolId) &&
        (targetAcademicYear === undefined || v.academicYear === targetAcademicYear) &&
        (targetTerm === undefined || v.term === targetTerm);

      if (matchesScope) {
        if (v.id === targetVersionId) {
          v.status = 'PUBLISHED';
          v.isCurrentPublished = true;
          v.updatedAt = new Date().toISOString();
        } else {
          v.isCurrentPublished = false;
          if (v.status === 'PUBLISHED') {
            v.status = 'ARCHIVED';
          }
          v.updatedAt = new Date().toISOString();
        }
      }
    });

    return version;
  }

  /**
   * Collision Protection & Direct Move Mode:
   * Checks if offering, room, teacher (via offering), or classRoom (via offering)
   * is already booked for the same day, period, and timetable version.
   * If options.allowCollisionWarning is true, saves the slot with a collision warning flag instead of throwing.
   */
  createOrUpdateSlot(slotData, options = { allowCollisionWarning: false }) {
    const { timetableVersionId, offeringId, roomId, dayOfWeek, periodNumber } = slotData;

    // Filter existing slots in the same timetable version, day, and period (excluding current slot if updating)
    const existingSlotsInTimeSlot = (this.store.slots || []).filter(s =>
      s.timetableVersionId === timetableVersionId &&
      s.dayOfWeek === dayOfWeek &&
      s.periodNumber === periodNumber &&
      s.id !== slotData.id
    );

    const collisionWarnings = [];

    // 1. Check offeringId collision
    const offeringCollision = existingSlotsInTimeSlot.find(s => s.offeringId === offeringId);
    if (offeringCollision) {
      collisionWarnings.push(`Offering ${offeringId} is already scheduled on Day ${dayOfWeek}, Period ${periodNumber}`);
    }

    // 2. Check roomId collision
    const roomCollision = existingSlotsInTimeSlot.find(s => s.roomId === roomId);
    if (roomCollision) {
      collisionWarnings.push(`Room ${roomId} is already occupied on Day ${dayOfWeek}, Period ${periodNumber}`);
    }

    // Lookup offering details for teacherId and classRoomId collisions
    const targetOffering = (this.store.offerings || []).find(o => o.id === offeringId);

    if (targetOffering) {
      // 3. Check teacherId collision (via offering lookup)
      if (targetOffering.teacherId) {
        const teacherCollision = existingSlotsInTimeSlot.find(s => {
          const sOffering = (this.store.offerings || []).find(o => o.id === s.offeringId);
          return sOffering && sOffering.teacherId === targetOffering.teacherId;
        });

        if (teacherCollision) {
          collisionWarnings.push(`Teacher ${targetOffering.teacherId} is already scheduled on Day ${dayOfWeek}, Period ${periodNumber}`);
        }
      }

      // 4. Check classRoomId collision (via offering lookup)
      if (targetOffering.classRoomId) {
        const classRoomCollision = existingSlotsInTimeSlot.find(s => {
          const sOffering = (this.store.offerings || []).find(o => o.id === s.offeringId);
          return sOffering && sOffering.classRoomId === targetOffering.classRoomId;
        });

        if (classRoomCollision) {
          collisionWarnings.push(`ClassRoom ${targetOffering.classRoomId} is already scheduled on Day ${dayOfWeek}, Period ${periodNumber}`);
        }
      }
    }

    // If collisions found and warnings not allowed, throw Error
    if (collisionWarnings.length > 0 && !options.allowCollisionWarning) {
      throw new Error(`Collision Error: ${collisionWarnings.join('; ')}`);
    }

    // Create or update slot record
    let slot;
    const hasCollision = collisionWarnings.length > 0;
    const collisionWarning = hasCollision ? collisionWarnings.join('; ') : null;

    if (slotData.id) {
      const index = (this.store.slots || []).findIndex(s => s.id === slotData.id);
      if (index !== -1) {
        slot = {
          ...this.store.slots[index],
          timetableVersionId,
          offeringId,
          roomId,
          dayOfWeek,
          periodNumber,
          hasCollision,
          collisionWarning,
          updatedAt: new Date().toISOString()
        };
        this.store.slots[index] = slot;
      }
    }

    if (!slot) {
      slot = {
        id: slotData.id || `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timetableVersionId,
        offeringId,
        roomId,
        dayOfWeek,
        periodNumber,
        hasCollision,
        collisionWarning,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (!this.store.slots) {
        this.store.slots = [];
      }
      this.store.slots.push(slot);
    }

    return slot;
  }

  /**
   * Direct Move Mode Shortcut:
   * Moves a slot directly to target day and period, flagging collision warnings instead of blocking.
   */
  directMoveSlot(slotId, targetDayOfWeek, targetPeriodNumber, targetRoomId) {
    const slot = (this.store.slots || []).find(s => s.id === slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found`);
    }

    return this.createOrUpdateSlot({
      ...slot,
      dayOfWeek: targetDayOfWeek,
      periodNumber: targetPeriodNumber,
      roomId: targetRoomId || slot.roomId
    }, { allowCollisionWarning: true });
  }

  /**
   * Get all slots in a timetable version that have collision warnings
   */
  getCollisionSlots(timetableVersionId) {
    return (this.store.slots || []).filter(s =>
      s.timetableVersionId === timetableVersionId && s.hasCollision === true
    );
  }

  /**
   * Find available teachers for a specific day and period slot
   */
  getAvailableTeachers(timetableVersionId, dayOfWeek, periodNumber, allTeachers) {
    // Get occupied offering IDs in this version, day, period
    const occupiedSlotOfferingIds = new Set(
      (this.store.slots || [])
        .filter(s => s.timetableVersionId === timetableVersionId && s.dayOfWeek === dayOfWeek && s.periodNumber === periodNumber)
        .map(s => s.offeringId)
    );

    // Get occupied teacher IDs
    const occupiedTeacherIds = new Set();
    (this.store.offerings || []).forEach(off => {
      if (occupiedSlotOfferingIds.has(off.id)) {
        occupiedTeacherIds.add(off.teacherId);
      }
    });

    // Return teachers not in occupied set
    return allTeachers.filter(t => !occupiedTeacherIds.has(t.id));
  }
}

