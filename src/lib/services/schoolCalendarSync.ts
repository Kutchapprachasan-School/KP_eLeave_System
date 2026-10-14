// src/lib/services/schoolCalendarSync.ts
// บริการข้อมูลปฏิทินกิจกรรมและประกาศโรงเรียน เชื่อมโยงข้อมูลชุดเดียวกันกับระบบจัดการชั้นเรียน (Classroom Management)
// Single Source of Truth ผ่าน localStorage keys: 'kp_school_calendar_events_v2' และ 'kp_school_announcements_v2'

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

// ข้อมูลปฏิทินจริงของโรงเรียนกุดจับประชาสรรค์ ปีการศึกษา 2569 (ชุดเดียวกับระบบจัดการชั้นเรียน)
export const INITIAL_SCHOOL_EVENTS: SchoolCalendarEvent[] = [
  {
    id: 'oct-1a',
    day: 1,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 1 ตุลาคม 2569',
    time: '08:00',
    title: 'ประชุมครูประจำเดือน',
    category: 'MEETING',
    colorType: 'BLUE',
    targetRole: 'TEACHER',
    location: 'ห้องประชุมใหญ่',
    description: 'ประชุมชี้แจงภาระงานประจำเดือนและเตรียมความพร้อมสอบกลางภาค',
  },
  {
    id: 'oct-1b',
    day: 1,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 1 ตุลาคม 2569',
    time: '13:00',
    title: 'ส่งรายงานผลการสอน',
    category: 'ACADEMIC',
    colorType: 'GREEN',
    targetRole: 'TEACHER',
    location: 'กลุ่มบริหารวิชาการ',
    description: 'ส่งรายงานบันทึกหลังสอนและสถิติการเข้าเรียนประจำเดือน',
  },
  {
    id: 'oct-2a',
    day: 2,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 2 ตุลาคม 2569',
    time: '08:30',
    title: 'ประชุมฝ่ายวิชาการ',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'TEACHER',
    location: 'ห้องประชุมโรงเรียน',
    description: 'ประชุมคณะทำงานขับเคลื่อนผลสัมฤทธิ์ทางการเรียนและการประเมิน SAR',
  },
  {
    id: 'oct-2b',
    day: 2,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 2 ตุลาคม 2569',
    time: '10:00',
    title: 'กิจกรรมวันครู / ยกย่องเชิดชูเกียรติ',
    category: 'SUBMISSION',
    colorType: 'ORANGE',
    targetRole: 'TEACHER',
    location: 'หอประชุมศุภชลาศัย',
    description: 'พิธีมอบรางวัลครูดีเด่นและกิจกรรมสานสัมพันธ์คณะครู',
  },
  {
    id: 'oct-2c',
    day: 2,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 2 ตุลาคม 2569',
    time: '15:00',
    title: 'ส่งคะแนนกลางภาคเรียนที่ 1/2569',
    category: 'ACADEMIC',
    colorType: 'GREEN',
    targetRole: 'TEACHER',
    location: 'ระบบออนไลน์ SGS',
    description: 'บันทึกคะแนนเก็บระหว่างภาคและคะแนนสอบกลางภาคลงระบบ SGS',
  },
  {
    id: 'oct-3',
    day: 3,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 3 ตุลาคม 2569',
    title: 'กิจกรรมค่ายภาษา (นักเรียน ม.1-ม.3)',
    category: 'STUDENT',
    colorType: 'RED',
    targetRole: 'STUDENT',
    location: 'สนามกีฬา',
    description: 'กิจกรรมเข้าค่ายเสริมทักษะภาษาต่างประเทศเพื่อการสื่อสาร',
  },
  {
    id: 'oct-4',
    day: 4,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันเสาร์ที่ 4 ตุลาคม 2569',
    title: 'การแข่งขันกีฬาสีภายใน (นักเรียน)',
    category: 'STUDENT',
    colorType: 'BLUE',
    targetRole: 'STUDENT',
    location: 'สนามกีฬาโรงเรียน',
    description: 'การแข่งขันกีฬาภายในรอบชิงชนะเลิศและพิธีปิดการแข่งขัน',
  },
  {
    id: 'oct-9',
    day: 9,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพฤหัสบดีที่ 9 ตุลาคม 2569',
    title: 'วันหยุดพิเศษสถานศึกษา',
    category: 'SUBMISSION',
    colorType: 'ORANGE',
    targetRole: 'ALL',
    location: 'วันหยุดราชการ / โรงเรียน',
    isAllDay: true,
  },
  {
    id: 'oct-10',
    day: 10,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 10 ตุลาคม 2569',
    title: 'กิจกรรมจิตอาสาพัฒนาโรงเรียน',
    category: 'STUDENT',
    colorType: 'RED',
    targetRole: 'STUDENT',
    location: 'บริเวณโรงเรียน',
  },
  {
    id: 'oct-13',
    day: 13,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันจันทร์ที่ 13 ตุลาคม 2569',
    title: 'วันนวมินทรมหาราช (วันหยุดราชการ)',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    location: 'วันหยุดราชการ',
    isAllDay: true,
    description: 'วันคล้ายวันสวรรคต พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร',
  },
  {
    id: 'oct-15',
    day: 15,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันพุธที่ 15 ตุลาคม 2569',
    title: 'ประชุมกลุ่มสาระการเรียนรู้',
    category: 'MEETING',
    colorType: 'BLUE',
    targetRole: 'TEACHER',
    location: 'ห้องกลุ่มสาระฯ',
  },
  {
    id: 'oct-23',
    day: 23,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 23 ตุลาคม 2569',
    title: 'วันปิยมหาราช (วันหยุดราชการ)',
    category: 'OTHER',
    colorType: 'PURPLE',
    targetRole: 'ALL',
    location: 'วันหยุดราชการ',
    isAllDay: true,
  },
  {
    id: 'oct-31',
    day: 31,
    month: 10,
    year: 2569,
    fullDateLabel: 'วันศุกร์ที่ 31 ตุลาคม 2569',
    title: 'สรุปผลการเรียนและอนุมัติผลการประเมิน (ครู)',
    category: 'SUBMISSION',
    colorType: 'ORANGE',
    targetRole: 'TEACHER',
    location: 'งานวัดและประเมินผล',
  },
];

// ข้อมูลประกาศจริงของโรงเรียนกุดจับประชาสรรค์ (ชุดเดียวกับระบบจัดการชั้นเรียน)
export const INITIAL_SCHOOL_ANNOUNCEMENTS: SchoolAnnouncement[] = [
  {
    id: 'a-1',
    title: 'ประกาศ : กำหนดการกิจกรรมวันภาษาอังกฤษและค่ายอาเซียน (2 ต.ค. 2569)',
    date: '2 ต.ค. 2569',
    category: 'academic',
    dotColor: 'bg-emerald-500',
    timestamp: 'เมื่อวานนี้ 16:30',
    content: 'ขอเชิญครูและนักเรียนเข้าร่วมกิจกรรม ณ ลานกิจกรรมอาคาร 2',
  },
  {
    id: 'a-2',
    title: 'แจ้งคณะครู : บันทึกคะแนนสอบกลางภาคและส่งผลการประเมิน SGS',
    date: '1 ต.ค. 2569',
    category: 'academic',
    dotColor: 'bg-blue-500',
    timestamp: '1 ต.ค. 2569 10:15',
    content: 'เปิดระบบบันทึกคะแนนกลางภาคเรียนที่ 1/2569 ถึงวันที่ 10 ต.ค. 2569',
  },
  {
    id: 'a-3',
    title: 'ประกาศวันปิดภาคเรียนที่ 1/2569 และกำหนดการเปิดภาคเรียนที่ 2',
    date: '25 ส.ค. 2569',
    category: 'general',
    dotColor: 'bg-rose-500',
    timestamp: '25 ส.ค. 2569 09:00',
    content: 'ปิดภาคเรียนที่ 1/2569 ตั้งแต่วันที่ 11 ต.ค. 2569 และเปิดภาคเรียนที่ 2 วันที่ 1 พ.ย. 2569',
  },
  {
    id: 'a-4',
    title: 'แจ้งซ่อมบำรุงเครือข่ายอินเทอร์เน็ตและระบบไฟฟ้าอาคารเรียน 3',
    date: '10 ส.ค. 2569',
    category: 'system',
    dotColor: 'bg-amber-500',
    timestamp: '10 ส.ค. 2569 14:00',
    content: 'งานเทคโนโลยีและสารสนเทศดำเนินการปรับปรุงสัญญาณ Wi-Fi ความเร็วสูง',
  },
];

let inMemoryEvents: SchoolCalendarEvent[] = [...INITIAL_SCHOOL_EVENTS];
let inMemoryAnnouncements: SchoolAnnouncement[] = [...INITIAL_SCHOOL_ANNOUNCEMENTS];

export const schoolCalendarSyncService = {
  // ดึงกิจกรรมปฏิทินทั้งหมด (เชื่อมโยงกับ localStorage ของระบบจัดการชั้นเรียน)
  getEvents(): SchoolCalendarEvent[] {
    if (typeof window === 'undefined') return inMemoryEvents;
    try {
      const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse school calendar events:', e);
    }
    // ถ้ายังไม่มีใน localStorage ให้บันทึกชุดมาตรฐานลงไป
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(INITIAL_SCHOOL_EVENTS));
    } catch {}
    return INITIAL_SCHOOL_EVENTS;
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

  // ดึงประกาศข่าวสารทั้งหมด
  getAnnouncements(): SchoolAnnouncement[] {
    if (typeof window === 'undefined') return inMemoryAnnouncements;
    try {
      const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse school announcements:', e);
    }
    try {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(INITIAL_SCHOOL_ANNOUNCEMENTS));
    } catch {}
    return INITIAL_SCHOOL_ANNOUNCEMENTS;
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
};
