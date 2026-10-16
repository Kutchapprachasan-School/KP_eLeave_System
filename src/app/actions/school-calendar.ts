"use server";

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
        const d = start.getUTCDate();
        const m = start.getUTCMonth() + 1;
        const y = start.getUTCFullYear() + 543;

        events.push({
          id: `acad-db-${ae.id}`,
          day: d,
          month: m,
          year: y,
          fullDateLabel: `วันที่ ${d} ${THAI_MONTH_NAMES[m - 1]} ${y}`,
          title: ae.title,
          category: ae.eventType === "EXAM_WEEK" ? "EXAM" : "ACADEMIC",
          colorType: ae.eventType === "EXAM_WEEK" ? "ORANGE" : "GREEN",
          targetRole: "ALL",
          isAllDay: true,
          location: "โรงเรียนกุดจับประชาสรรค์",
          description: ae.description || "กำหนดการวิชาการสถานศึกษา",
        });
      }
    } catch {}

    return events;
  } catch (error) {
    console.error("Failed to load official holidays from leave system:", error);
    return [];
  }
}
