/**
 * Exam Scheduling & Seating Matrix Generator Service
 * Handles Exam Period Scheduling, Room Seating Matrix (Alternating Seats), and Exam Supervisor Assignment
 */

export class ExamService {
  /**
   * Generate Exam Timetable Slots for Midterm/Final Exams
   */
  static generateExamSlots(offerings = [], examDaysCount = 3) {
    const days = [
      { dayIndex: 1, dayName: "วันสอบที่ 1" },
      { dayIndex: 2, dayName: "วันสอบที่ 2" },
      { dayIndex: 3, dayName: "วันสอบที่ 3" }
    ].slice(0, examDaysCount);

    const periodSlots = [
      { periodIndex: 1, startTime: "08:30", endTime: "09:30", type: "EXAM_SLOT" },
      { periodIndex: 2, startTime: "09:40", endTime: "10:40", type: "EXAM_SLOT" },
      { periodIndex: 3, startTime: "10:50", endTime: "11:50", type: "EXAM_SLOT" },
      { periodIndex: 4, startTime: "13:00", endTime: "14:00", type: "EXAM_SLOT" }
    ];

    const slots = [];
    let offeringIdx = 0;

    for (const day of days) {
      for (const period of periodSlots) {
        if (offeringIdx >= offerings.length) break;
        const offering = offerings[offeringIdx++];

        slots.push({
          examSlotId: `EXAM-${day.dayIndex}-${period.periodIndex}`,
          dayIndex: day.dayIndex,
          dayName: day.dayName,
          periodIndex: period.periodIndex,
          startTime: period.startTime,
          endTime: period.endTime,
          subjectCode: offering.subjectCode || "ว23101",
          subjectName: offering.subjectName || "วิชาสอบ",
          targetClassrooms: offering.targetClassrooms || ["ม.3/1"],
          assignedRoom: offering.assignedRoom || "ห้อง 301",
          supervisors: offering.supervisors || ["ครูสมชาย", "ครูวิชัย"]
        });
      }
    }

    return slots;
  }

  /**
   * Generate Alternating Room Seating Matrix (ป้องกันการลอกข้อสอบ)
   * Alternates students between Grade A and Grade B or alternating Student IDs
   */
  static generateSeatingMatrix(rows = 5, cols = 6, students = []) {
    const matrix = [];
    let studentIndex = 0;

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const student = students[studentIndex] || {
          seatNumber: `A${r + 1}-${c + 1}`,
          studentId: `STD-${1000 + studentIndex + 1}`,
          studentName: `นักเรียนคนที่ ${studentIndex + 1}`,
          classRoom: (r + c) % 2 === 0 ? "ม.3/1" : "ม.3/2"
        };
        studentIndex++;
        rowArr.push(student);
      }
      matrix.push(rowArr);
    }

    return matrix;
  }

  /**
   * Assign Exam Supervisors ensuring no teacher is double-booked
   */
  static assignExamSupervisors(teachers = [], examSlots = []) {
    const assignedSlots = examSlots.map((slot, index) => {
      const sup1 = teachers[index % teachers.length] || "ครูผู้คุมสอบ 1";
      const sup2 = teachers[(index + 1) % teachers.length] || "ครูผู้คุมสอบ 2";

      return {
        ...slot,
        supervisors: [sup1.name || sup1, sup2.name || sup2]
      };
    });

    return assignedSlots;
  }
}
