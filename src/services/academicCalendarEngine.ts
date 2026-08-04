import { prisma } from "@/lib/db";

export interface AcademicEventInput {
  eventType: string; // e.g. "OPENING_DAY", "EXAM_WEEK", "HOLIDAY", "SCOUT_CAMP", "SPORTS_DAY", "PA_OBSERVATION"
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  locksTimetable?: boolean;
  locksSupervision?: boolean;
  description?: string;
}

export interface ValidationDateResult {
  allowed: boolean;
  reason?: string;
  lockingEvents: Array<{
    id: string;
    eventType: string;
    title: string;
    startDate: Date;
    endDate: Date;
    locksTimetable: boolean;
    locksSupervision: boolean;
  }>;
}

export class AcademicCalendarEngine {
  /**
   * Retrieves or creates an AcademicCalendar for a specified year and term.
   */
  public async getOrCreateCalendar(academicYear: number, term: number = 1) {
    let calendar = await prisma.academicCalendar.findUnique({
      where: { academicYear },
      include: { events: true },
    });

    if (!calendar) {
      calendar = await prisma.academicCalendar.create({
        data: {
          academicYear,
          term,
          title: `ปฏิทินวิชาการ ปีการศึกษา ${academicYear}`,
        },
        include: { events: true },
      });
    }

    return calendar;
  }

  /**
   * Adds a new AcademicEvent to the specified calendar.
   */
  public async addAcademicEvent(calendarId: string, eventData: AcademicEventInput) {
    const start = new Date(eventData.startDate);
    const end = new Date(eventData.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid start or end date format.");
    }

    if (start > end) {
      throw new Error("startDate must be before or equal to endDate.");
    }

    return prisma.academicEvent.create({
      data: {
        calendarId,
        eventType: eventData.eventType,
        title: eventData.title,
        startDate: start,
        endDate: end,
        locksTimetable: eventData.locksTimetable ?? false,
        locksSupervision: eventData.locksSupervision ?? false,
        description: eventData.description || null,
      },
    });
  }

  /**
   * Checks if timetable modification or attendance/slot assignment is locked on a specific date.
   */
  public async isTimetableLocked(targetDate: Date | string, academicYear?: number): Promise<boolean> {
    const date = new Date(targetDate);
    const year = academicYear || (date.getFullYear() > 2400 ? date.getFullYear() : date.getFullYear() + 543);

    const lockingEvent = await prisma.academicEvent.findFirst({
      where: {
        calendar: { academicYear: year },
        locksTimetable: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    return !!lockingEvent;
  }

  /**
   * Checks if PA / teacher supervision observation is locked on a specific date.
   */
  public async isSupervisionLocked(targetDate: Date | string, academicYear?: number): Promise<boolean> {
    const date = new Date(targetDate);
    const year = academicYear || (date.getFullYear() > 2400 ? date.getFullYear() : date.getFullYear() + 543);

    const lockingEvent = await prisma.academicEvent.findFirst({
      where: {
        calendar: { academicYear: year },
        locksSupervision: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    return !!lockingEvent;
  }

  /**
   * Returns all locking events overlapping with a date range.
   */
  public async getLockingEvents(startDate: Date | string, endDate: Date | string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return prisma.academicEvent.findMany({
      where: {
        OR: [{ locksTimetable: true }, { locksSupervision: true }],
        startDate: { lte: end },
        endDate: { gte: start },
      },
      orderBy: { startDate: "asc" },
    });
  }

  /**
   * Validates if a target date is allowed for timetable changes or supervision activities.
   */
  public async validateScheduleDate(
    targetDate: Date | string,
    checkType: "TIMETABLE" | "SUPERVISION"
  ): Promise<ValidationDateResult> {
    const date = new Date(targetDate);

    const lockingEvents = await prisma.academicEvent.findMany({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        ...(checkType === "TIMETABLE" ? { locksTimetable: true } : { locksSupervision: true }),
      },
    });

    if (lockingEvents.length > 0) {
      const titles = lockingEvents.map((e) => e.title).join(", ");
      return {
        allowed: false,
        reason: `Date ${date.toISOString().split("T")[0]} is locked by event(s): ${titles}`,
        lockingEvents,
      };
    }

    return {
      allowed: true,
      lockingEvents: [],
    };
  }

  /**
   * Fetches all events associated with a calendar for UI visualization.
   */
  public async getCalendarEvents(academicYear: number, term: number = 1) {
    const calendar = await this.getOrCreateCalendar(academicYear, term);
    return prisma.academicEvent.findMany({
      where: { calendarId: calendar.id },
      orderBy: { startDate: "asc" },
    });
  }
}

export const academicCalendarEngine = new AcademicCalendarEngine();
