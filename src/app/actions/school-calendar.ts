"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getHolidays } from "./holiday";

const THAI_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

/**
 * ดึงข้อมูลวันหยุดและวันเรียนพิเศษอย่างเป็นทางการจากระบบการลา (prisma.holiday)
 * เพื่อใช้เป็น Single Source of Truth สำหรับปฏิทินสถานศึกษาและแดชบอร์ด
 * - วันหยุด (isWorkday = false): วันหยุดราชการ/สถานศึกษา ไม่นับเป็นวันลา
 * - วันเรียนพิเศษ (isWorkday = true): วันทำการชดเชย/เรียนพิเศษ มีผลต่อการนับวันลาของครู
 */
export async function getOfficialSchoolCalendarEvents(yearBE?: number) {
  try {
    const targetBE = yearBE || (new Date().getFullYear() + 543);
    const rawHolidays = await getHolidays(targetBE);

    const events: Array<{
      id: string;
      day: number;
      month: number;
      year: number;
      endDay?: number;
      endMonth?: number;
      endYear?: number;
      fullDateLabel: string;
      title: string;
      category: "MEETING" | "SUBMISSION" | "ACADEMIC" | "STUDENT" | "OTHER" | "EXAM";
      colorType: "BLUE" | "ORANGE" | "GREEN" | "RED" | "PURPLE";
      targetRole: "TEACHER" | "STUDENT" | "ALL";
      isAllDay: boolean;
      location?: string;
      description?: string;
    }> = [];

    if (rawHolidays && rawHolidays.length > 0) {
      for (const h of rawHolidays) {
        const start = new Date(h.startDate);
        const end = new Date(h.endDate);
        const sDay = start.getUTCDate();
        const sMonth = start.getUTCMonth() + 1;
        const eDay = end.getUTCDate();
        const eMonth = end.getUTCMonth() + 1;
        const eYear = end.getUTCFullYear() + 543;

        const curr = new Date(start);

        while (curr <= end) {
          const d = curr.getUTCDate();
          const m = curr.getUTCMonth() + 1;
          const y = curr.getUTCFullYear() + 543;

          events.push({
            id: `hol-db-${h.id}-${d}-${m}-${y}`,
            day: d,
            month: m,
            year: y,
            endDay: eDay,
            endMonth: eMonth,
            endYear: eYear,
            fullDateLabel: sDay === eDay && sMonth === eMonth
              ? `วันที่ ${d} ${THAI_MONTH_NAMES[m - 1]} ${y}`
              : `วันที่ ${sDay} ${THAI_MONTH_NAMES[sMonth - 1]} - ${eDay} ${THAI_MONTH_NAMES[eMonth - 1]} ${eYear}`,
            title: h.name,
            category: h.isWorkday ? "ACADEMIC" : "OTHER",
            colorType: h.isWorkday ? "GREEN" : "RED",
            targetRole: "ALL",
            isAllDay: true,
            location: h.isWorkday ? "โรงเรียนกุดจับประชาสรรค์" : "วันหยุดราชการ / สถานศึกษา",
            description: h.isWorkday
              ? "วันเรียนพิเศษ / วันทำงานชดเชย (ตั้งค่าจากระบบการลา มีผลต่อการนับวันลาของครู)"
              : "วันหยุดราชการ / สถานศึกษา (ตั้งค่าจากระบบการลา ไม่นับเป็นวันลา)",
          });

          curr.setUTCDate(curr.getUTCDate() + 1);
        }
      }
    }

    // ดึงกำหนดการวิชาการเพิ่มเติมจาก AcademicEvent ถ้ามี
    try {
      const yearCE = targetBE - 543;
      const academicEvents = await prisma.academicEvent.findMany({
        where: {
          calendar: { academicYear: targetBE }
        }
      });
      for (const ae of academicEvents) {
        const start = new Date(ae.startDate);
        const end = new Date(ae.endDate);
        const sDay = start.getUTCDate();
        const sMonth = start.getUTCMonth() + 1;
        const eDay = end.getUTCDate();
        const eMonth = end.getUTCMonth() + 1;
        const eYear = end.getUTCFullYear() + 543;

        const curr = new Date(start);
        while (curr <= end) {
          const d = curr.getUTCDate();
          const m = curr.getUTCMonth() + 1;
          const y = curr.getUTCFullYear() + 543;

          events.push({
            id: `acad-db-${ae.id}-${d}-${m}-${y}`,
            day: d,
            month: m,
            year: y,
            endDay: eDay,
            endMonth: eMonth,
            endYear: eYear,
            fullDateLabel: sDay === eDay && sMonth === eMonth
              ? `วันที่ ${d} ${THAI_MONTH_NAMES[m - 1]} ${y}`
              : `วันที่ ${sDay} ${THAI_MONTH_NAMES[sMonth - 1]} - ${eDay} ${THAI_MONTH_NAMES[eMonth - 1]} ${eYear}`,
            title: ae.title,
            category: ae.eventType === "EXAM_WEEK" ? "EXAM" : "ACADEMIC",
            colorType: ae.eventType === "EXAM_WEEK" ? "ORANGE" : (ae.eventType === "SCOUT_CAMP" || ae.eventType === "SPORTS_DAY" ? "BLUE" : "GREEN"),
            targetRole: "ALL",
            isAllDay: true,
            location: "โรงเรียนกุดจับประชาสรรค์",
            description: ae.description || "กำหนดการวิชาการสถานศึกษา",
          });

          curr.setUTCDate(curr.getUTCDate() + 1);
        }
      }
    } catch (e) {
      console.warn("Failed to query academic events for calendar:", e);
    }

    return events;
  } catch (error) {
    console.error("Failed to load official holidays from leave system:", error);
    return [];
  }
}

/**
 * สกัด holidayId จาก event id เช่น hol-db-cm123-16-5-2569 หรือ hol-db-cm123
 */
function parseHolidayId(id: string): string | null {
  if (!id || typeof id !== "string" || !id.startsWith("hol-db-")) return null;
  const stripped = id.slice("hol-db-".length);
  const match = stripped.match(/^(.+?)-(\d+)-(\d+)-(\d+)$/);
  if (match) return match[1];
  return stripped;
}

/**
 * สกัด academicEventId จาก event id เช่น acad-db-cm456-20-7-2569 หรือ acad-db-cm456
 */
function parseAcademicEventId(id: string): string | null {
  if (!id || typeof id !== "string" || !id.startsWith("acad-db-")) return null;
  const stripped = id.slice("acad-db-".length);
  const match = stripped.match(/^(.+?)-(\d+)-(\d+)-(\d+)$/);
  if (match) return match[1];
  return stripped;
}


/**
 * ลบกิจกรรมออกจากปฏิทินและฐานข้อมูล (รองรับทั้ง Holiday และ AcademicEvent)
 * เมื่อลบสำเร็จจะ Revalidate แคชที่เกี่ยวข้องทั้งหมด
 */
export async function deleteSchoolCalendarEvents(eventIds: string[]) {
  try {
    if (!eventIds || eventIds.length === 0) return { success: true, count: 0 };

    const holidayIdsToDelete = new Set<string>();
    const academicIdsToDelete = new Set<string>();
    const otherIdsToCheck = new Set<string>();

    for (const id of eventIds) {
      if (!id) continue;
      const hId = parseHolidayId(id);
      if (hId) {
        holidayIdsToDelete.add(hId);
        continue;
      }
      const aId = parseAcademicEventId(id);
      if (aId) {
        academicIdsToDelete.add(aId);
        continue;
      }
      otherIdsToCheck.add(id);
    }

    let deletedCount = 0;

    // 1. ลบ Holiday ในฐานข้อมูล
    for (const hId of holidayIdsToDelete) {
      try {
        await prisma.holiday.delete({ where: { id: hId } });
        deletedCount++;
      } catch (e: any) {
        console.warn(`Holiday delete skipped or already deleted: ${hId}`, e?.message);
      }
    }

    // 2. ลบ AcademicEvent ในฐานข้อมูล
    for (const aId of academicIdsToDelete) {
      try {
        await prisma.academicEvent.delete({ where: { id: aId } });
        deletedCount++;
      } catch (e: any) {
        console.warn(`AcademicEvent delete skipped or already deleted: ${aId}`, e?.message);
      }
    }

    // 3. ตรวจสอบและลบกรณีส่ง ID ตรงๆ
    for (const otherId of otherIdsToCheck) {
      try {
        const ae = await prisma.academicEvent.findUnique({ where: { id: otherId } });
        if (ae) {
          await prisma.academicEvent.delete({ where: { id: otherId } });
          deletedCount++;
          continue;
        }
      } catch {}

      try {
        const hol = await prisma.holiday.findUnique({ where: { id: otherId } });
        if (hol) {
          await prisma.holiday.delete({ where: { id: otherId } });
          deletedCount++;
        }
      } catch {}
    }

    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/academic/planning/calendar");

    return { success: true, count: deletedCount };
  } catch (error: any) {
    console.error("Failed to delete school calendar events:", error);
    return { success: false, error: error?.message || "Failed to delete events", count: 0 };
  }
}

/**
 * ลบกิจกรรมเดี่ยวออกจากปฏิทิน
 */
export async function deleteSchoolCalendarEvent(eventId: string) {
  return deleteSchoolCalendarEvents([eventId]);
}

export interface SaveSchoolCalendarEventInput {
  id?: string;
  day: number;
  month: number;
  year: number; // BE, e.g. 2569
  endDay?: number;
  endMonth?: number;
  endYear?: number;
  title: string;
  category: "ACADEMIC" | "MEETING" | "SUBMISSION" | "STUDENT" | "EXAM" | "OTHER";
  colorType?: "BLUE" | "ORANGE" | "GREEN" | "RED" | "PURPLE";
  targetRole?: "TEACHER" | "STUDENT" | "ALL";
  isAllDay?: boolean;
  time?: string;
  location?: string;
  description?: string;
}

/**
 * บันทึกหรืออัปเดตกิจกรรมปฏิทินลงฐานข้อมูล AcademicCalendar / AcademicEvent
 * เพื่อใช้เป็นฐานข้อมูลร่วมกันระหว่าง SMS และระบบจัดการเรียนการสอน
 */
export async function saveSchoolCalendarEvent(input: SaveSchoolCalendarEventInput) {
  try {
    if (!input.title || !input.day || !input.month || !input.year) {
      throw new Error("Missing required fields: title, day, month, year");
    }

    const yearBE = input.year;
    const yearCE = yearBE - 543;
    const endYearBE = input.endYear || yearBE;
    const endYearCE = endYearBE - 543;
    const endMonth = input.endMonth || input.month;
    const endDay = input.endDay || input.day;

    const startDate = new Date(Date.UTC(yearCE, input.month - 1, input.day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(endYearCE, endMonth - 1, endDay, 23, 59, 59, 999));

    // แปลงหมวดหมู่เป็น eventType สำหรับ AcademicEvent
    let eventType = "ACADEMIC";
    if (input.category === "EXAM") eventType = "EXAM_WEEK";
    else if (input.category === "STUDENT") eventType = "SCOUT_CAMP";
    else if (input.category === "MEETING") eventType = "MEETING";
    else if (input.category === "SUBMISSION") eventType = "SUBMISSION";
    else if (input.category === "OTHER") eventType = "HOLIDAY";

    const academicId = input.id ? parseAcademicEventId(input.id) : null;
    const holidayId = input.id ? parseHolidayId(input.id) : null;

    if (academicId) {
      const updated = await prisma.academicEvent.update({
        where: { id: academicId },
        data: {
          title: input.title,
          eventType,
          startDate,
          endDate,
          locksTimetable: input.category === "EXAM",
          description: input.description || null,
        },
      });

      revalidatePath("/calendar");
      revalidatePath("/dashboard");
      revalidatePath("/academic/planning/calendar");

      return {
        success: true,
        eventId: `acad-db-${updated.id}-${input.day}-${input.month}-${yearBE}`,
      };
    }

    if (holidayId) {
      const updated = await prisma.holiday.update({
        where: { id: holidayId },
        data: {
          name: input.title,
          startDate,
          endDate,
          isWorkday: input.category === "ACADEMIC",
        },
      });

      revalidatePath("/calendar");
      revalidatePath("/dashboard");
      revalidatePath("/academic/planning/calendar");

      return {
        success: true,
        eventId: `hol-db-${updated.id}-${input.day}-${input.month}-${yearBE}`,
      };
    }

    // สร้างระเบียนใหม่ใน AcademicCalendar / AcademicEvent
    let calendar = await prisma.academicCalendar.findUnique({
      where: { academicYear: yearBE },
    });

    if (!calendar) {
      calendar = await prisma.academicCalendar.create({
        data: {
          academicYear: yearBE,
          term: 1,
          title: `ปฏิทินวิชาการ ปีการศึกษา ${yearBE}`,
        },
      });
    }

    const created = await prisma.academicEvent.create({
      data: {
        calendarId: calendar.id,
        eventType,
        title: input.title,
        startDate,
        endDate,
        locksTimetable: input.category === "EXAM",
        locksSupervision: false,
        description: input.description || null,
      },
    });

    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/academic/planning/calendar");

    return {
      success: true,
      eventId: `acad-db-${created.id}-${input.day}-${input.month}-${yearBE}`,
    };
  } catch (error: any) {
    console.error("Failed to save school calendar event:", error);
    return {
      success: false,
      error: error?.message || "Failed to save calendar event",
    };
  }
}

