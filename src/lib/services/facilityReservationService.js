/**
 * Unified Resource Reservation & Facility Platform Service (SROP Generic Resource)
 * Manages School Facilities (Labs, Rooms, Projectors, Vehicles) and Overlap Conflict Detection
 */

export class FacilityReservationService {
  constructor() {
    this.facilities = [
      { id: "res-lab-1", name: "ห้องปฏิบัติการวิทยาศาสตร์ 1 (แล็บวิทย์)", type: "LAB", location: "อาคาร 3 ชั้น 2", capacity: 40, isAvailable: true },
      { id: "res-lab-comp", name: "ห้องปฏิบัติการคอมพิวเตอร์ 1", type: "LAB", location: "อาคาร 2 ชั้น 3", capacity: 45, isAvailable: true },
      { id: "res-room-audi", name: "หอประชุมใหญ่โรงเรียน", type: "ROOM", location: "อาคารอเนกประสงค์", capacity: 300, isAvailable: true },
      { id: "res-eq-proj", name: "ชุดโปรเจคเตอร์เคลื่อนที่ 1", type: "EQUIPMENT", location: "ห้องโสตทัศนูปกรณ์", capacity: 1, isAvailable: true },
      { id: "res-veh-bus", name: "รถบัสโรงเรียน (กข-1234)", type: "VEHICLE", location: "ลานจอดรถโรงเรียน", capacity: 45, isAvailable: true }
    ];

    this.reservations = [
      {
        reservationId: "RES-2026-001",
        resourceId: "res-lab-1",
        resourceName: "ห้องปฏิบัติการวิทยาศาสตร์ 1 (แล็บวิทย์)",
        reservedByTeacher: "ครูสมชาย สายวิทย์",
        purpose: "การทดลองเรื่องพันธุศาสตร์ ม.3/1",
        startTime: "2026-08-04T09:20:00Z",
        endTime: "2026-08-04T10:10:00Z",
        status: "APPROVED"
      }
    ];
  }

  getFacilityList() {
    return this.facilities;
  }

  getReservations() {
    return this.reservations;
  }

  checkConflict(resourceId, startTime, endTime) {
    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);

    return this.reservations.some(r => {
      if (r.resourceId !== resourceId) return false;
      const resStart = new Date(r.startTime);
      const resEnd = new Date(r.endTime);
      return reqStart < resEnd && reqEnd > resStart;
    });
  }

  createReservation(reservation) {
    if (this.checkConflict(reservation.resourceId, reservation.startTime, reservation.endTime)) {
      throw new Error("ทรัพยากรถูกจองในช่วงเวลาดังกล่าวแล้ว");
    }

    const newRes = {
      reservationId: `RES-2026-${String(this.reservations.length + 1).padStart(3, "0")}`,
      status: "APPROVED",
      ...reservation
    };

    this.reservations.push(newRes);
    return newRes;
  }
}
