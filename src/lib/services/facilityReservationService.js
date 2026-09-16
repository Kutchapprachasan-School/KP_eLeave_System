/**
 * Unified Resource Reservation & Facility Platform Service (SROP Generic Resource)
 * Manages School Facilities (Labs, Meeting Rooms, Equipment, Vehicles) and Overlap Conflict Detection
 */

export class FacilityReservationService {
  constructor() {
    this.facilities = [
      { 
        id: "res-lab-1", 
        code: "LAB-01", 
        name: "ห้องปฏิบัติการวิทยาศาสตร์ 1 (แล็บวิทย์)", 
        type: "LABORATORY", 
        location: "อาคาร 3 ชั้น 2", 
        capacity: 40, 
        isAvailable: true, 
        status: "AVAILABLE",
        roomProfile: { floor: "ชั้น 2", hasProjector: true, hasSoundSystem: true }
      },
      { 
        id: "res-lab-comp", 
        code: "LAB-02", 
        name: "ห้องปฏิบัติการคอมพิวเตอร์ 1", 
        type: "LABORATORY", 
        location: "อาคาร 2 ชั้น 3", 
        capacity: 45, 
        isAvailable: true, 
        status: "AVAILABLE",
        roomProfile: { floor: "ชั้น 3", hasProjector: true, hasSoundSystem: true }
      },
      { 
        id: "res-room-audi", 
        code: "ROOM-01", 
        name: "หอประชุมใหญ่โรงเรียน", 
        type: "MEETING_ROOM", 
        location: "อาคารอเนกประสงค์", 
        capacity: 300, 
        isAvailable: true, 
        status: "AVAILABLE",
        roomProfile: { floor: "ชั้น 1", hasProjector: true, hasSoundSystem: true, hasVideoConference: true }
      },
      { 
        id: "res-eq-proj", 
        code: "EQ-01", 
        name: "ชุดโปรเจคเตอร์เคลื่อนที่ 1", 
        type: "EQUIPMENT", 
        location: "ห้องโสตทัศนูปกรณ์", 
        capacity: 1, 
        isAvailable: true, 
        status: "AVAILABLE" 
      },
      { 
        id: "res-veh-bus", 
        code: "BUS-01", 
        name: "รถบัสโรงเรียน (กข-1234)", 
        type: "VEHICLE", 
        location: "ลานจอดรถโรงเรียน", 
        capacity: 45, 
        isAvailable: true, 
        status: "AVAILABLE",
        vehicleProfile: { licensePlate: "กข-1234 อุดรธานี", brand: "Hino", fuelType: "DIESEL", seatCapacity: 45 }
      }
    ];

    this.reservations = [
      {
        reservationId: "RES-2026-001",
        bookingNumber: "FR-2026-0001",
        resourceId: "res-lab-1",
        resourceName: "ห้องปฏิบัติการวิทยาศาสตร์ 1 (แล็บวิทย์)",
        reservedByTeacher: "ครูสมชาย สายวิทย์",
        purpose: "การทดลองเรื่องพันธุศาสตร์ ม.3/1",
        startAt: "2026-08-04T09:20:00Z",
        endAt: "2026-08-04T10:10:00Z",
        startTime: "2026-08-04T09:20:00Z",
        endTime: "2026-08-04T10:10:00Z",
        status: "APPROVED",
        currentStep: 2,
        totalSteps: 2,
        assignments: [
          {
            targetType: "RESOURCE",
            resourceId: "res-lab-1",
            startAt: "2026-08-04T09:20:00Z",
            endAt: "2026-08-04T10:10:00Z",
            status: "APPROVED"
          }
        ]
      }
    ];
  }

  getFacilityList() {
    return this.facilities;
  }

  getReservations() {
    return this.reservations;
  }

  checkConflict(resourceId, startTime, endTime, excludeReservationId, statuses = ["PENDING", "APPROVED", "IN_USE"]) {
    const reqStart = new Date(startTime).getTime();
    const reqEnd = new Date(endTime).getTime();

    if (reqEnd <= reqStart) {
      throw new Error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น");
    }

    return this.reservations.some(r => {
      if (excludeReservationId && (r.reservationId === excludeReservationId || r.id === excludeReservationId)) {
        return false;
      }
      if (r.resourceId !== resourceId) return false;
      if (!statuses.includes(r.status)) return false;

      const resStart = new Date(r.startAt || r.startTime).getTime();
      const resEnd = new Date(r.endAt || r.endTime).getTime();

      // Half-open interval overlap: [reqStart, reqEnd) && [resStart, resEnd)
      return reqStart < resEnd && reqEnd > resStart;
    });
  }

  checkDriverConflict(driverProfileId, startTime, endTime, excludeReservationId, statuses = ["PENDING", "APPROVED", "IN_USE"]) {
    if (!driverProfileId) return false;

    const reqStart = new Date(startTime).getTime();
    const reqEnd = new Date(endTime).getTime();

    return this.reservations.some(r => {
      if (excludeReservationId && (r.reservationId === excludeReservationId || r.id === excludeReservationId)) {
        return false;
      }
      if (!statuses.includes(r.status)) return false;
      
      const assignedDriver = r.vehicleDetails?.driverProfileId || (r.assignments?.find(a => a.targetType === "DRIVER")?.driverProfileId);
      if (assignedDriver !== driverProfileId) return false;

      const resStart = new Date(r.startAt || r.startTime).getTime();
      const resEnd = new Date(r.endAt || r.endTime).getTime();

      return reqStart < resEnd && reqEnd > resStart;
    });
  }

  calculateSlaExpiry(createdAt, startAt, moduleType = "MEETING_ROOM") {
    const slaHours = moduleType === "VEHICLE" ? 48 : 24;
    const bufferHours = 6;

    const slaTarget = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
    const bufferTarget = new Date(startAt.getTime() - bufferHours * 60 * 60 * 1000);

    return bufferTarget < slaTarget ? bufferTarget : slaTarget;
  }

  createReservation(reservation) {
    const startAt = reservation.startAt || reservation.startTime;
    const endAt = reservation.endAt || reservation.endTime;

    if (!startAt || !endAt) {
      throw new Error("Missing startAt or endAt");
    }

    if (this.checkConflict(reservation.resourceId, startAt, endAt)) {
      throw new Error("ทรัพยากรถูกจองในช่วงเวลาดังกล่าวแล้ว");
    }

    if (reservation.vehicleDetails?.driverProfileId) {
      if (this.checkDriverConflict(reservation.vehicleDetails.driverProfileId, startAt, endAt)) {
        throw new Error("พนักงานขับรถท่านนี้มีภารกิจขับรถคันอื่นในช่วงเวลาดังกล่าวแล้ว");
      }
    }

    const now = new Date();
    const expiresAt = reservation.expiresAt || this.calculateSlaExpiry(now, new Date(startAt), reservation.consumerModule === "VEHICLE" ? "VEHICLE" : "MEETING_ROOM").toISOString();

    const isLegacy = Boolean(reservation.startTime && !reservation.startAt);
    const initialStatus = reservation.status || (isLegacy ? "APPROVED" : "PENDING");
    const isDirectApproved = initialStatus === "APPROVED";
    const prefix = reservation.consumerModule === "VEHICLE" ? "FV" : "FR";
    const bookingNumber = `${prefix}-2026-${String(this.reservations.length + 1).padStart(4, "0")}`;

    const newRes = {
      reservationId: `RES-2026-${String(this.reservations.length + 1).padStart(3, "0")}`,
      bookingNumber,
      status: initialStatus,
      currentStep: isDirectApproved ? 2 : 1,
      totalSteps: 2,
      startAt,
      endAt,
      startTime: startAt,
      endTime: endAt,
      expiresAt,
      assignments: [
        {
          targetType: "RESOURCE",
          resourceId: reservation.resourceId,
          startAt,
          endAt,
          status: initialStatus
        },
        ...(reservation.vehicleDetails?.driverProfileId ? [{
          targetType: "DRIVER",
          driverProfileId: reservation.vehicleDetails.driverProfileId,
          startAt,
          endAt,
          status: initialStatus
        }] : [])
      ],
      approvalSteps: [
        {
          stepNo: 1,
          roleRequired: reservation.consumerModule === "VEHICLE" ? "HEAD_VEHICLE" : "HEAD_FACILITY",
          title: reservation.consumerModule === "VEHICLE" ? "การจัดสรรรถและพนักงานขับรถ" : "การตรวจสอบสถานที่และโสตฯ",
          status: isDirectApproved ? "APPROVED" : "PENDING"
        },
        {
          stepNo: 2,
          roleRequired: "DIRECTOR",
          title: "การอนุมัติขั้นสุดท้ายของผู้อำนวยการโรงเรียน",
          status: isDirectApproved ? "APPROVED" : "PENDING"
        }
      ],
      ...reservation
    };

    this.reservations.push(newRes);
    return newRes;
  }

  reviewByHead(reservationId, details) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");
    if (res.status !== "PENDING") throw new Error("คำขอนี้ไม่ได้อยู่ในสถานะรอพิจารณา");

    if (details.driverProfileId) {
      if (this.checkDriverConflict(details.driverProfileId, res.startAt, res.endAt, res.reservationId)) {
        throw new Error("พนักงานขับรถท่านนี้มีภารกิจอื่นในช่วงเวลาดังกล่าวแล้ว");
      }
      res.vehicleDetails = {
        ...res.vehicleDetails,
        driverProfileId: details.driverProfileId
      };
      
      res.assignments = res.assignments?.filter(a => a.targetType !== "DRIVER") || [];
      res.assignments.push({
        targetType: "DRIVER",
        driverProfileId: details.driverProfileId,
        startAt: res.startAt,
        endAt: res.endAt,
        status: res.status
      });
    }

    if (details.layoutNotes || details.audioVisualNotes) {
      res.roomDetails = {
        ...res.roomDetails,
        layoutNotes: details.layoutNotes || res.roomDetails?.layoutNotes,
        audioVisualNotes: details.audioVisualNotes || res.roomDetails?.audioVisualNotes
      };
    }

    const step1 = res.approvalSteps?.find(s => s.stepNo === 1);
    if (step1) {
      step1.status = "APPROVED";
      step1.approverUserId = details.approverUserId || "head-reviewer";
      step1.comment = details.comment;
      step1.actedAt = new Date().toISOString();
    }

    res.currentStep = 2;
    return res;
  }

  approveByDirector(reservationId, options = {}) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");
    if (res.status !== "PENDING") throw new Error("คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ");

    if (res.expiresAt && new Date() > new Date(res.expiresAt)) {
      throw new Error("คำขอนี้หมดอายุตาม SLA แล้ว ไม่สามารถอนุมัติได้");
    }

    if (this.checkConflict(res.resourceId, res.startAt, res.endAt, res.reservationId, ["APPROVED", "IN_USE"])) {
      throw new Error("ไม่สามารถอนุมัติได้ เนื่องจากทรัพยากรถูกอนุมัติให้รายการอื่นในช่วงเวลาเดียวกันไปแล้ว");
    }

    const driverId = res.vehicleDetails?.driverProfileId;
    if (driverId && this.checkDriverConflict(driverId, res.startAt, res.endAt, res.reservationId, ["APPROVED", "IN_USE"])) {
      throw new Error("ไม่สามารถอนุมัติได้ เนื่องจากพนักงานขับรถถูกมอบหมายให้รายการอื่นไปแล้ว");
    }

    const step2 = res.approvalSteps?.find(s => s.stepNo === 2);
    if (step2) {
      step2.status = "APPROVED";
      step2.approverUserId = options.approverUserId || "director-approver";
      step2.comment = options.comment;
      step2.actedAt = new Date().toISOString();
    }

    res.status = "APPROVED";
    res.currentStep = 2;
    res.assignments?.forEach(a => { a.status = "APPROVED"; });

    return res;
  }

  rejectReservation(reservationId, reason, approverUserId) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");
    if (res.status !== "PENDING") throw new Error("สามารถปฏิเสธได้เฉพาะคำขอที่รออนุมัติเท่านั้น");

    res.status = "REJECTED";
    res.rejectionReason = reason;
    res.assignments?.forEach(a => { a.status = "REJECTED"; });

    const activeStep = res.approvalSteps?.find(s => s.status === "PENDING");
    if (activeStep) {
      activeStep.status = "REJECTED";
      activeStep.comment = reason;
      activeStep.approverUserId = approverUserId;
      activeStep.actedAt = new Date().toISOString();
    }

    return res;
  }

  cancelReservation(reservationId, user) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");

    if (res.status === "COMPLETED" || res.status === "REJECTED") {
      throw new Error("รายการนี้เสร็จสิ้นหรือถูกปฏิเสธแล้ว ไม่สามารถยกเลิกได้ (Immutable Record)");
    }

    if (res.status === "IN_USE" && user.role !== "ADMIN") {
      throw new Error("ภารกิจกำลังดำเนินการอยู่ เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถยกเลิกฉุกเฉินได้");
    }

    const isOwner = res.reservedByUserId === user.id || res.reservedByTeacher === user.id;
    const isAdmin = user.role === "ADMIN";

    if (res.status === "APPROVED" && isOwner && !isAdmin) {
      const oneHourBefore = new Date(new Date(res.startAt).getTime() - 60 * 60 * 1000);
      if (new Date() > oneHourBefore) {
        throw new Error("ไม่อนุญาตให้ยกเลิกล่วงหน้าน้อยกว่า 1 ชั่วโมงก่อนถึงเวลาเริ่มใช้งาน");
      }
    }

    res.status = "CANCELLED";
    res.assignments?.forEach(a => { a.status = "CANCELLED"; });
    return res;
  }

  cleanupExpiredPending(now = new Date()) {
    let count = 0;
    for (const r of this.reservations) {
      if (r.status === "PENDING" && r.expiresAt && now >= new Date(r.expiresAt)) {
        r.status = "CANCELLED";
        r.rejectionReason = "หมดเวลาการพิจารณาอนุมัติตาม SLA อัตโนมัติ (SLA Timeout Auto-Cancelled)";
        r.assignments?.forEach(a => { a.status = "CANCELLED"; });
        count++;
      }
    }
    return { cancelledCount: count };
  }

  /**
   * Resubmits a rejected reservation under a new revision with immutable snapshot preservation.
   */
  resubmitRevision(reservationId, options = {}) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");
    if (res.status !== "REJECTED") throw new Error("สามารถส่งใหม่ (Re-submit) ได้เฉพาะคำขอที่ถูกปฏิเสธแล้วเท่านั้น");

    if (!res.revisions) res.revisions = [];

    // 1. Snapshot previous revision
    const currentRevNo = res.revisionNo || 1;
    res.revisions.push({
      id: `rev-${res.reservationId}-${currentRevNo}`,
      reservationId: res.reservationId,
      revisionNo: currentRevNo,
      snapshotPayload: JSON.parse(JSON.stringify(res)),
      submittedByUserId: options.submittedByUserId || res.reservedByUserId,
      submittedAt: new Date().toISOString(),
      revisionReason: options.revisionReason || "แก้ไขรายละเอียดตามข้อเสนอแนะและส่งใหม่"
    });

    // 2. Increment revision
    res.revisionNo = currentRevNo + 1;
    res.status = "PENDING";
    res.currentStep = 1;
    res.rejectionReason = null;

    if (options.newStartAt) res.startAt = options.newStartAt;
    if (options.newEndAt) res.endAt = options.newEndAt;

    // 3. Reset approval steps for new revision
    res.approvalSteps = [
      {
        stepNo: 1,
        revisionNo: res.revisionNo,
        roleRequired: res.consumerModule === "VEHICLE" ? "HEAD_VEHICLE" : "HEAD_FACILITY",
        title: res.consumerModule === "VEHICLE" ? "การจัดสรรรถและพนักงานขับรถ" : "การตรวจสอบสถานที่และโสตฯ",
        status: "PENDING"
      },
      {
        stepNo: 2,
        revisionNo: res.revisionNo,
        roleRequired: "DIRECTOR",
        title: "การอนุมัติขั้นสุดท้ายของผู้อำนวยการโรงเรียน",
        status: "PENDING"
      }
    ];

    res.assignments?.forEach(a => {
      a.status = "PENDING";
      if (options.newStartAt) a.startAt = options.newStartAt;
      if (options.newEndAt) a.endAt = options.newEndAt;
    });

    return res;
  }

  /**
   * Atomic CAS with in-transaction RBAC verification.
   */
  approveStepWithRbacCas(options) {
    const { reservationId, expectedRevisionNo, stepNo, actorUserId, actorRole, idempotencyKey, comment } = options;
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");

    // 1. Enforce Revision Consistency
    if (expectedRevisionNo !== (res.revisionNo || 1)) {
      throw new Error(`Revision mismatch: expected ${expectedRevisionNo}, found ${res.revisionNo || 1}`);
    }

    // 2. Enforce Step Consistency
    if (res.currentStep !== stepNo) {
      throw new Error(`Step mismatch: current step is ${res.currentStep}, requested step ${stepNo}`);
    }

    const step = res.approvalSteps?.find(s => s.stepNo === stepNo && (s.revisionNo || 1) === (res.revisionNo || 1));
    if (!step || step.status !== "PENDING") {
      throw new Error(`Step ${stepNo} is not in PENDING status for revision ${res.revisionNo || 1}`);
    }

    // 3. In-Transaction RBAC Verification
    if (stepNo === 1) {
      const allowedRoles = ["HEAD_FACILITY", "HEAD_VEHICLE", "ADMIN"];
      if (!allowedRoles.includes(actorRole)) {
        throw new Error("HTTP 403: Forbidden - Insufficient permissions to review Step 1");
      }
    } else if (stepNo === 2) {
      const allowedRoles = ["DIRECTOR", "ADMIN"];
      if (!allowedRoles.includes(actorRole)) {
        throw new Error("HTTP 403: Forbidden - Insufficient permissions to approve Step 2");
      }
    }

    // 4. Execute CAS Update
    step.status = "APPROVED";
    step.approverUserId = actorUserId;
    step.comment = comment;
    step.actedAt = new Date().toISOString();
    step.idempotencyKey = idempotencyKey;

    if (stepNo === 1) {
      res.currentStep = 2;
    } else if (stepNo === 2) {
      res.status = "APPROVED";
      res.assignments?.forEach(a => { a.status = "APPROVED"; });
    }

    return res;
  }

  /**
   * Centralized Core Fields Guard on COMPLETED reservations.
   */
  updateReservationCore(reservationId, updates) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");

    if (res.status === "COMPLETED") {
      const coreFields = ["resourceId", "startAt", "endAt", "reservedByUserId", "consumerModule", "title", "purpose", "revisionNo"];
      const touchesCore = Object.keys(updates).some(k => coreFields.includes(k));
      if (touchesCore) {
        throw new Error("Core fields of COMPLETED reservations are strictly immutable. Post-mission records must be appended via FacilityPostMissionReport.");
      }
    }

    Object.assign(res, updates);
    return res;
  }

  /**
   * Submits decoupled Post-Mission report for a completed or returning mission.
   */
  submitPostMissionReport(reservationId, reportData) {
    const res = this.reservations.find(r => r.reservationId === reservationId || r.id === reservationId);
    if (!res) throw new Error("ไม่พบคำขอจอง");

    res.postMissionReport = {
      id: `pmr-${res.reservationId}`,
      reservationId: res.reservationId,
      startMileage: reportData.startMileage,
      endMileage: reportData.endMileage,
      distanceKm: reportData.endMileage && reportData.startMileage ? reportData.endMileage - reportData.startMileage : null,
      fuelCost: reportData.fuelCost,
      fuelReceiptKey: reportData.fuelReceiptKey,
      incidentNotes: reportData.incidentNotes,
      reportedByUserId: reportData.reportedByUserId,
      reportedAt: new Date().toISOString()
    };

    if (res.status === "IN_USE" || res.status === "APPROVED") {
      res.status = "COMPLETED";
      res.assignments?.forEach(a => { a.status = "COMPLETED"; });
    }

    return res;
  }
}

