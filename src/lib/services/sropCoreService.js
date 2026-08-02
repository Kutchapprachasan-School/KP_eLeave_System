/**
 * SROP Platform Core Infrastructure Services
 * Includes: Teacher Timeline (Event Sourcing Lite), Teacher Capacity Engine, and Generic Resource Platform
 */

/**
 * 1. Teacher Timeline Service (Event Sourcing Lite)
 */
export class TeacherTimelineService {
  constructor() {
    this.events = []; // In-memory Event Store (ขยายสู่ Persistent Database/Outbox Table)
  }

  /**
   * บันทึก Event ใหม่เข้าสู่ Timeline
   */
  emitEvent(event) {
    const timelineEvent = {
      ...event,
      eventId: event.eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.events.push(timelineEvent);
    return timelineEvent;
  }

  /**
   * ดึง Timeline ของครูตามช่วงเวลา
   */
  getTeacherTimeline(teacherId, startDate, endDate) {
    return this.events
      .filter((evt) => evt.teacherId === teacherId)
      .filter((evt) => {
        const evtStart = new Date(evt.startTime);
        return evtStart >= new Date(startDate) && evtStart <= new Date(endDate);
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }
}

/**
 * 2. Teacher Capacity Engine
 */
export class TeacherCapacityEngine {
  /**
   * คำนวณ Remaining Capacity Percent แบบ 360 องศา
   * Formula: Remaining % = ((MaxCapacity - TotalDutyHours) / MaxCapacity) * 100
   */
  static calculateCapacityIndex(params = {}) {
    const {
      teacherId,
      weeklyTeachingHours = 0,
      meetingHours = 0,
      committeeHours = 0,
      substituteHours = 0,
      homeroomHours = 0,
      counselingHours = 0,
      otherDutyHours = 0,
      maxWeeklyCapacityHours = 40,
    } = params;

    const totalDutyHours =
      weeklyTeachingHours +
      meetingHours +
      committeeHours +
      substituteHours +
      homeroomHours +
      counselingHours +
      otherDutyHours;

    const remainingHours = Math.max(0, maxWeeklyCapacityHours - totalDutyHours);
    const remainingCapacityPercent = Math.round(
      (remainingHours / maxWeeklyCapacityHours) * 100
    );

    return {
      teacherId,
      weeklyTeachingHours,
      meetingHours,
      committeeHours,
      substituteHours,
      homeroomHours,
      counselingHours,
      otherDutyHours,
      totalDutyHours,
      maxWeeklyCapacityHours,
      remainingCapacityPercent,
    };
  }
}

/**
 * 3. Generic Resource Reservation Platform
 */
export class GenericResourcePlatform {
  constructor() {
    this.reservations = [];
  }

  /**
   * ตรวจสอบการจองซ้ำซ้อน (Conflict Detection)
   */
  hasConflict(resourceId, startTime, endTime) {
    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);

    return this.reservations.some((res) => {
      if (res.resourceId !== resourceId) return false;
      const resStart = new Date(res.startTime);
      const resEnd = new Date(res.endTime);
      return reqStart < resEnd && reqEnd > resStart;
    });
  }

  /**
   * จองทรัพยากร
   */
  reserveResource(reservation) {
    if (this.hasConflict(reservation.resourceId, reservation.startTime, reservation.endTime)) {
      throw new Error(`ทรัพยากรรหัส ${reservation.resourceId} ถูกจองในช่วงเวลาดังกล่าวแล้ว`);
    }

    const newReservation = {
      ...reservation,
      reservationId: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.reservations.push(newReservation);
    return newReservation;
  }
}
