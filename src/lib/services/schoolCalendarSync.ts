// src/lib/services/schoolCalendarSync.ts
// บริการข้อมูลปฏิทินกิจกรรมสถานศึกษาและประกาศ เชื่อมโยงข้อมูลชุดเดียวกันกับระบบจัดการชั้นเรียน (Classroom Management)
// Single Source of Truth ผ่าน localStorage keys: 'kp_school_calendar_events_v2' และ 'kp_school_announcements_v2'
// ปราศจากข้อมูลจำลอง (Zero Mock Data Policy) มีเฉพาะวันหยุดราชการไทยจริงตามประกาศสำนักนายกฯ และกำหนดการเปิด-ปิดภาคเรียนจริงของ สพฐ.

export type CalendarCategory = 'MEETING' | 'SUBMISSION' | 'ACADEMIC' | 'STUDENT' | 'OTHER' | 'EXAM';
export type CalendarColor = 'BLUE' | 'ORANGE' | 'GREEN' | 'RED' | 'PURPLE';
export type TargetRole = 'TEACHER' | 'STUDENT' | 'ALL' | 'PERSONAL' | 'CUSTOM';

export interface SchoolCalendarEvent {
  id: string;
  day: number;
  month: number; // 1-12
  year: number; // พ.ศ. เช่น 2569
  endDay?: number;
  endMonth?: number;
  endYear?: number;
  fullDateLabel?: string;
  time?: string;
  isAllDay?: boolean;
  title: string;
  category: CalendarCategory;
  colorType: CalendarColor;
  targetRole: TargetRole;
  location?: string;
  description?: string;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  date: string;
  category: 'academic' | 'general' | 'student' | 'system';
  dotColor: string;
  timestamp: string;
  content?: string;
}

export const CALENDAR_STORAGE_KEY = 'kp_school_calendar_events_v2';
export const ANNOUNCEMENTS_STORAGE_KEY = 'kp_school_announcements_v2';
export const CALENDAR_UPDATED_EVENT = 'kp-school-calendar-updated';
export const ANNOUNCEMENTS_UPDATED_EVENT = 'kp-school-announcements-updated';

// ─────────────────────────────────────────────────────────────
// ข้อมูลจริง: วันหยุดราชการไทยประจำปี พ.ศ. 2569 (ค.ศ. 2026)
// และกำหนดการสำคัญของภาคเรียนตามระเบียบ สพฐ.
// ─────────────────────────────────────────────────────────────
export const REAL_SCHOOL_AND_PUBLIC_EVENTS_2569: SchoolCalendarEvent[] = [
  // === มกราคม 2569 ===
  {
    id: 'th-hol-2026-01-01',
    day: 1,
    month: 1,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 1 มกราคม 2569',
    title: 'วันขึ้นปีใหม่',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
    description: 'วันขึ้นปีใหม่ตามปฏิทินสากล',
  },
  {
    id: 'th-hol-2026-01-02',
    day: 2,
    month: 1,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 2 มกราคม 2569',
    title: 'วันหยุดราชการพิเศษ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
    description: 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษตามมติ ครม.',
  },

  // === มีนาคม 2569 ===
  {
    id: 'th-hol-2026-03-03',
    day: 3,
    month: 3,
    year: 2569,
    fullDateLabel: 'วันอังคารที่ 3 มีนาคม 2569',
    title: 'วันมาฆบูชา',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
    description: 'วันสำคัญทางพระพุทธศาสนา ขึ้น 15 ค่ำ เดือน 3',
  },
  {
    id: 'sch-term-2568-end2',
    day: 31,
    month: 3,
    year: 2569,
    fullDateLabel: 'วันอังคารที่ 31 มีนาคม 2569',
    title: 'วันสิ้นสุดการเรียนการสอน ภาคเรียนที่ 2',
    category: 'ACADEMIC',
    colorType: 'GREEN',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'วันสิ้นสุดการจัดการเรียนรู้ภาคเรียนที่ 2 ตามปฏิทิน สพฐ.',
  },

  // === เมษายน 2569 ===
  {
    id: 'sch-term-2568-break2',
    day: 1,
    month: 4,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 1 เมษายน 2569',
    title: 'วันปิดภาคเรียนฤดูร้อน',
    category: 'OTHER',
    colorType: 'ORANGE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'ปิดภาคเรียนสิ้นปีการศึกษา',
  },
  {
    id: 'th-hol-2026-04-06',
    day: 6,
    month: 4,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 6 เมษายน 2569',
    title: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-04-13',
    day: 13,
    month: 4,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 13 เมษายน 2569',
    title: 'วันสงกรานต์',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
    description: 'เทศกาลวันสงกรานต์',
  },
  {
    id: 'th-hol-2026-04-14',
    day: 14,
    month: 4,
    year: 2569,
    fullDateLabel: 'วันอังคารที่ 14 เมษายน 2569',
    title: 'วันสงกรานต์ (วันครอบครัว)',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-04-15',
    day: 15,
    month: 4,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 15 เมษายน 2569',
    title: 'วันสงกรานต์ (วันผู้สูงอายุแห่งชาติ)',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },

  // === พฤษภาคม 2569 ===
  {
    id: 'th-hol-2026-05-01',
    day: 1,
    month: 5,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 1 พฤษภาคม 2569',
    title: 'วันแรงงานแห่งชาติ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-05-04',
    day: 4,
    month: 5,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 4 พฤษภาคม 2569',
    title: 'วันฉัตรมงคล',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-05-11',
    day: 11,
    month: 5,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 11 พฤษภาคม 2569',
    title: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'sch-term-2569-open1',
    day: 16,
    month: 5,
    year: 2569,
    fullDateLabel: 'วันเสาร์ที่ 16 พฤษภาคม 2569',
    title: 'วันเปิดภาคเรียนที่ 1 ปีการศึกษา 2569',
    category: 'ACADEMIC',
    colorType: 'GREEN',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'วันเปิดภาคเรียนที่ 1 ปีการศึกษา 2569 ตามกำหนดการ สพฐ.',
  },

  // === มิถุนายน 2569 ===
  {
    id: 'th-hol-2026-06-01',
    day: 1,
    month: 6,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 1 มิถุนายน 2569',
    title: 'วันหยุดชดเชยวันวิสาขบูชา',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-06-03',
    day: 3,
    month: 6,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 3 มิถุนายน 2569',
    title: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },

  // === กรกฎาคม 2569 ===
  {
    id: 'th-hol-2026-07-28',
    day: 28,
    month: 7,
    year: 2569,
    fullDateLabel: 'วันอังคารที่ 28 กรกฎาคม 2569',
    title: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-07-29',
    day: 29,
    month: 7,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 29 กรกฎาคม 2569',
    title: 'วันอาสาฬหบูชา',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-07-30',
    day: 30,
    month: 7,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 30 กรกฎาคม 2569',
    title: 'วันเข้าพรรษา',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },

  // === สิงหาคม 2569 ===
  {
    id: 'th-hol-2026-08-12',
    day: 12,
    month: 8,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 12 สิงหาคม 2569',
    title: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },

  // === ตุลาคม 2569 ===
  {
    id: 'sch-term-2569-end1',
    day: 10,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันเสาร์ที่ 10 ตุลาคม 2569',
    title: 'วันสิ้นสุดการเรียนการสอน ภาคเรียนที่ 1/2569',
    category: 'ACADEMIC',
    colorType: 'GREEN',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'วันสิ้นสุดการจัดการเรียนรู้ภาคเรียนที่ 1 ตามปฏิทินวิชาการ สพฐ.',
  },
  {
    id: 'sch-term-2569-break1',
    day: 11,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันอาทิตย์ที่ 11 ตุลาคม 2569',
    title: 'วันเริ่มต้นปิดภาคเรียนที่ 1/2569',
    category: 'OTHER',
    colorType: 'ORANGE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'ปิดภาคเรียนระหว่างภาคเรียนที่ 1 และ 2',
  },
  {
    id: 'th-hol-2026-10-13',
    day: 13,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันอังคารที่ 13 ตุลาคม 2569',
    title: 'วันนวมินทรมหาราช',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
    description: 'วันคล้ายวันสวรรคต พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร',
  },
  {
    id: 'th-hol-2026-10-23',
    day: 23,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 23 ตุลาคม 2569',
    title: 'วันปิยมหาราช',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
    description: 'วันคล้ายวันสวรรคต พระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว',
  },
  {
    id: 'sch-term-2569-break1-end',
    day: 31,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันเสาร์ที่ 31 ตุลาคม 2569',
    title: 'วันสิ้นสุดปิดภาคเรียนที่ 1/2569',
    category: 'OTHER',
    colorType: 'ORANGE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'เตรียมความพร้อมก่อนเปิดภาคเรียนที่ 2',
  },

  // === พฤศจิกายน 2569 ===
  {
    id: 'sch-term-2569-open2',
    day: 1,
    month: 11,
    year: 2569,
    fullDateLabel: 'วันอาทิตย์ที่ 1 พฤศจิกายน 2569',
    title: 'วันเปิดภาคเรียนที่ 2 ปีการศึกษา 2569',
    category: 'ACADEMIC',
    colorType: 'GREEN',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'โรงเรียนกุดจับประชาสรรค์',
    description: 'วันเปิดภาคเรียนที่ 2 ปีการศึกษา 2569 ตามกำหนดการ สพฐ.',
  },

  // === ธันวาคม 2569 ===
  {
    id: 'th-hol-2026-12-05',
    day: 5,
    month: 12,
    year: 2569,
    fullDateLabel: 'วันเสาร์ที่ 5 ธันวาคม 2569',
    title: 'วันคล้ายวันพระบรมราชสมภพ ร.9, วันชาติ และวันพ่อแห่งชาติ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-12-07',
    day: 7,
    month: 12,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 7 ธันวาคม 2569',
    title: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9, วันชาติ และวันพ่อแห่งชาติ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-12-10',
    day: 10,
    month: 12,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 10 ธันวาคม 2569',
    title: 'วันรัฐธรรมนูญ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
  {
    id: 'th-hol-2026-12-31',
    day: 31,
    month: 12,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 31 ธันวาคม 2569',
    title: 'วันสิ้นปี',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    isAllDay: true,
    location: 'วันหยุดราชการ',
  },
];

// Helper: ตรวจสอบและกรองข้อมูลจำลอง (Mock Events) ออกทั้งหมด
function isMockEvent(e: Partial<SchoolCalendarEvent>): boolean {
  if (!e || !e.id) return false;
  const id = String(e.id);
  // ตรวจสอบ id ที่ขึ้นต้นด้วย oct- หรือ mock- หรือ temp-
  if (id.startsWith('oct-') || id.startsWith('mock-') || id.startsWith('temp-')) {
    return true;
  }
  // ตรวจสอบชื่อกิจกรรมจำลอง
  const title = e.title || '';
  if (
    title.includes('ค่ายภาษา') ||
    title.includes('แข่งกีฬาสี') ||
    title.includes('จิตอาสา') ||
    title.includes('AI สำหรับการสอน') ||
    title.includes('ซ้อมแผนเผชิญเหตุ') ||
    title.includes('สะเต็มศึกษา') ||
    title.includes('ประชุมเครือข่าย')
  ) {
    return true;
  }
  return false;
}

// Memory cache fallback สำหรับ SSR และ Testing
let inMemoryEvents: SchoolCalendarEvent[] = [...REAL_SCHOOL_AND_PUBLIC_EVENTS_2569];
let inMemoryAnnouncements: SchoolAnnouncement[] = [];

export const schoolCalendarSyncService = {
  // ดึงกิจกรรมปฏิทินทั้งหมด (กรองข้อมูลจำลองออกอัตโนมัติ และผสานวันหยุดราชการจริง)
  getEvents(): SchoolCalendarEvent[] {
    if (typeof window === 'undefined') return inMemoryEvents;
    try {
      const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // ลบข้อมูลจำลองทั้งหมดออก
          const cleaned = parsed.filter((e) => !isMockEvent(e));
          
          // ตรวจสอบว่ามีวันหยุดราชการจริงครบหรือไม่ หากขาดรายการใด ให้เติมเข้าชุดข้อมูล
          const existingIds = new Set(cleaned.map((e) => e.id));
          const merged = [...cleaned];
          for (const ev of REAL_SCHOOL_AND_PUBLIC_EVENTS_2569) {
            if (!existingIds.has(ev.id)) {
              merged.push(ev);
            }
          }
          
          // บันทึกกลับลง localStorage หากมีข้อมูลจำลองถูกกรองทิ้ง หรือมีการเติมวันหยุดจริง
          if (cleaned.length !== parsed.length || merged.length !== cleaned.length) {
            try {
              localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
          }
          return merged;
        }
      }
    } catch (e) {
      console.warn('Failed to parse school calendar events:', e);
    }

    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(REAL_SCHOOL_AND_PUBLIC_EVENTS_2569));
    } catch {}
    return REAL_SCHOOL_AND_PUBLIC_EVENTS_2569;
  },

  // บันทึกกิจกรรมใหม่ หรือแก้ไขกิจกรรมเดิม
  saveEvent(event: SchoolCalendarEvent): SchoolCalendarEvent {
    if (typeof window === 'undefined') {
      const existingIdx = inMemoryEvents.findIndex((e) => e.id === event.id);
      if (existingIdx >= 0) {
        inMemoryEvents[existingIdx] = event;
      } else {
        inMemoryEvents = [event, ...inMemoryEvents];
      }
      return event;
    }
    try {
      const current = this.getEvents();
      const existingIdx = current.findIndex((e) => e.id === event.id);
      let updated: SchoolCalendarEvent[];
      if (existingIdx >= 0) {
        updated = [...current];
        updated[existingIdx] = event;
      } else {
        updated = [event, ...current];
      }
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.error('Failed to save calendar event:', e);
    }
    return event;
  },

  // ลบกิจกรรม
  deleteEvent(id: string): void {
    if (typeof window === 'undefined') {
      inMemoryEvents = inMemoryEvents.filter((e) => e.id !== id);
      return;
    }
    try {
      const current = this.getEvents();
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.error('Failed to delete calendar event:', e);
    }
  },

  // ดึงประกาศข่าวสารทั้งหมด (กรองข้อมูลจำลองออก)
  getAnnouncements(): SchoolAnnouncement[] {
    if (typeof window === 'undefined') return inMemoryAnnouncements;
    try {
      const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // ล้างประกาศจำลองเก่าออกทั้งหมด
          const cleaned = parsed.filter(
            (a) =>
              !a.id?.startsWith('a-') &&
              !a.id?.startsWith('mock-') &&
              !a.id?.startsWith('ann-')
          );
          if (cleaned.length !== parsed.length) {
            try {
              localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(cleaned));
            } catch {}
          }
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Failed to parse school announcements:', e);
    }
    return [];
  },

  // บันทึกประกาศ
  saveAnnouncement(announcement: SchoolAnnouncement): SchoolAnnouncement {
    if (typeof window === 'undefined') {
      inMemoryAnnouncements = [announcement, ...inMemoryAnnouncements];
      return announcement;
    }
    try {
      const current = this.getAnnouncements();
      const updated = [announcement, ...current];
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.error('Failed to save announcement:', e);
    }
    return announcement;
  },

  // ล้างข้อมูลจำลองทั้งหมดแบบเด็ดขาด (Purge all mock data)
  purgeAllMockData(): void {
    if (typeof window === 'undefined') {
      inMemoryEvents = [...REAL_SCHOOL_AND_PUBLIC_EVENTS_2569];
      inMemoryAnnouncements = [];
      return;
    }
    try {
      // ล้างปฏิทินให้เหลือเฉพาะของจริง
      const current = this.getEvents();
      const realOnly = current.filter((e) => !isMockEvent(e));
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(realOnly));
      window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT, { detail: realOnly }));

      // ล้างประกาศจำลอง
      const currentAnn = this.getAnnouncements();
      const realAnn = currentAnn.filter(
        (a) => !a.id?.startsWith('a-') && !a.id?.startsWith('mock-') && !a.id?.startsWith('ann-')
      );
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(realAnn));
      window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_UPDATED_EVENT, { detail: realAnn }));
    } catch (e) {
      console.warn('Failed to purge mock data:', e);
    }
  },

  // ดึงและซิงค์ข้อมูลวันหยุดและวันเรียนพิเศษจากระบบการลา (Holiday Settings ในฐานข้อมูล) เป็นแกนหลัก
  async syncFromLeaveSystemHolidays(yearBE?: number): Promise<SchoolCalendarEvent[]> {
    if (typeof window === 'undefined') return this.getEvents();
    try {
      const { getOfficialSchoolCalendarEvents } = await import('@/app/actions/school-calendar');
      const officialEvents = await getOfficialSchoolCalendarEvents(yearBE);
      if (officialEvents && officialEvents.length > 0) {
        const current = this.getEvents();
        // กรองเอาเฉพาะกิจกรรมที่ผู้ใช้สร้างเอง ไม่ใช่วันหยุดที่ซิงค์มา
        const customEvents = current.filter(
          (e) => !e.id.startsWith('th-hol-') && !e.id.startsWith('hol-db-') && !e.id.startsWith('holiday-')
        );

        // รวมวันหยุดและวันเรียนพิเศษอย่างเป็นทางการจากระบบการลาเข้ากับ custom events
        const officialDayTitles = new Set(officialEvents.map((e) => `${e.year}-${e.month}-${e.day}-${e.title}`));
        const filteredCustom = customEvents.filter(
          (e) => !officialDayTitles.has(`${e.year}-${e.month}-${e.day}-${e.title}`)
        );
        const merged = [...officialEvents, ...filteredCustom];

        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT, { detail: merged }));
        return merged;
      }
    } catch (e) {
      console.warn('Failed to sync holidays from leave system:', e);
    }
    return this.getEvents();
  },
};
