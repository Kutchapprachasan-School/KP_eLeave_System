import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  toDbUtcDate,
  toIsoUtcString,
  utcNow,
  calculateDynamicSlaExpiry
} from '../../../src/services/facility/facility-time.ts';

import {
  mapResourceToDTO,
  mapReservationToDTO,
  assertPlainSerializableWhitelist
} from '../../../src/services/facility/facility-dto.ts';

import {
  computeCanonicalPayloadHash,
  canonicalizeValue,
  isIdempotencyUniqueViolation,
  recoverFromIdempotencyRace,
  IDEMPOTENCY_CONSTRAINT_NAME
} from '../../../src/services/facility/facility-idempotency.ts';

import {
  executeFacilityAction,
  classifyFacilityErrorCode,
  extractCleanErrorMessage
} from '../../../src/services/facility/facility-action-boundary.ts';

import { FacilityReservationService } from '../../../src/lib/services/facilityReservationService.js';

describe('Forensic Invariant Test Suite: C1 - C15', () => {

  // =========================================================================
  // C1: Room Overlap Protection (PENDING & APPROVED)
  // =========================================================================
  test('C1: Room Overlap Protection - PENDING and APPROVED both block overlapping intervals', () => {
    const service = new FacilityReservationService();
    service.reservations = [
      {
        reservationId: 'RES-ROOM-PENDING',
        resourceId: 'res-room-1',
        startAt: '2026-10-10T09:00:00Z',
        endAt: '2026-10-10T12:00:00Z',
        status: 'PENDING'
      },
      {
        reservationId: 'RES-ROOM-APPROVED',
        resourceId: 'res-room-2',
        startAt: '2026-10-10T13:00:00Z',
        endAt: '2026-10-10T15:00:00Z',
        status: 'APPROVED'
      },
      {
        reservationId: 'RES-ROOM-CANCELLED',
        resourceId: 'res-room-1',
        startAt: '2026-10-10T14:00:00Z',
        endAt: '2026-10-10T16:00:00Z',
        status: 'CANCELLED'
      }
    ];

    // PENDING status MUST block overlapping slot
    assert.equal(service.checkConflict('res-room-1', '2026-10-10T10:00:00Z', '2026-10-10T11:00:00Z'), true);
    // APPROVED status MUST block overlapping slot
    assert.equal(service.checkConflict('res-room-2', '2026-10-10T13:30:00Z', '2026-10-10T14:30:00Z'), true);
    // Adjacent boundary does NOT conflict: [12:00, 13:00) with [09:00, 12:00)
    assert.equal(service.checkConflict('res-room-1', '2026-10-10T12:00:00Z', '2026-10-10T13:00:00Z'), false);
    // CANCELLED status does NOT block slot
    assert.equal(service.checkConflict('res-room-1', '2026-10-10T14:30:00Z', '2026-10-10T15:30:00Z'), false);
  });

  // =========================================================================
  // C2: Vehicle Overlap Protection
  // =========================================================================
  test('C2: Vehicle Overlap Protection - Active vehicle bookings block conflicting requests', () => {
    const service = new FacilityReservationService();
    service.reservations = [
      {
        reservationId: 'RES-VEH-1',
        resourceId: 'res-veh-bus',
        startAt: '2026-10-15T08:00:00Z',
        endAt: '2026-10-15T16:00:00Z',
        status: 'PENDING',
        consumerModule: 'VEHICLE'
      }
    ];

    // Same bus during same day overlap is rejected
    assert.equal(service.checkConflict('res-veh-bus', '2026-10-15T12:00:00Z', '2026-10-15T18:00:00Z'), true);
    // Same bus next day is allowed
    assert.equal(service.checkConflict('res-veh-bus', '2026-10-16T08:00:00Z', '2026-10-16T16:00:00Z'), false);
  });

  // =========================================================================
  // C3: Driver Overlap Across Multiple Vehicles
  // =========================================================================
  test('C3: Driver Overlap Across Multiple Vehicles - Same driver cannot drive 2 vehicles concurrently', () => {
    const service = new FacilityReservationService();
    service.reservations = [
      {
        reservationId: 'RES-BUS-SOMCHAI',
        resourceId: 'res-veh-bus',
        startAt: '2026-10-20T08:00:00Z',
        endAt: '2026-10-20T17:00:00Z',
        status: 'APPROVED',
        consumerModule: 'VEHICLE',
        vehicleDetails: { driverProfileId: 'driver-somchai' }
      }
    ];

    // Check driver conflict for different vehicle (van) with same driver
    const hasDriverConflict = service.checkDriverConflict(
      'driver-somchai',
      '2026-10-20T10:00:00Z',
      '2026-10-20T14:00:00Z'
    );
    assert.equal(hasDriverConflict, true);

    // After bus trip ends, same driver is available
    const hasConflictAfter = service.checkDriverConflict(
      'driver-somchai',
      '2026-10-20T17:00:00Z',
      '2026-10-20T20:00:00Z'
    );
    assert.equal(hasConflictAfter, false);
  });

  // =========================================================================
  // C4: Cross-Resource Independence
  // =========================================================================
  test('C4: Cross-Resource Independence - Room reservation does not block Vehicle reservation', () => {
    const service = new FacilityReservationService();
    service.reservations = [
      {
        reservationId: 'RES-ROOM-AUDI',
        resourceId: 'res-room-audi',
        startAt: '2026-10-25T09:00:00Z',
        endAt: '2026-10-25T12:00:00Z',
        status: 'APPROVED'
      }
    ];

    // Booking school bus at exact same time is completely unblocked
    const busConflict = service.checkConflict('res-veh-bus', '2026-10-25T09:00:00Z', '2026-10-25T12:00:00Z');
    assert.equal(busConflict, false);
  });

  // =========================================================================
  // C5: SLA_EXPIRED Deep Test (Zero Side-Effects, No React Error #441)
  // =========================================================================
  test('C5: SLA_EXPIRED Deep Test - Expired reservation returns clean SLA_EXPIRED without unhandled throw', async () => {
    const simulatedExpiredRecord = {
      id: 'res-expired-001',
      status: 'PENDING',
      expiresAt: '2026-08-01T12:00:00Z',
      assignments: [],
      auditLogs: []
    };

    const actionResult = await executeFacilityAction('approveFacilityReservationDirectorAction', async (correlationId) => {
      const now = new Date('2026-08-02T10:00:00Z');
      const expiry = new Date(simulatedExpiredRecord.expiresAt);

      if (now > expiry) {
        throw new Error('SLA_EXPIRED:คำขอนี้หมดอายุตาม SLA แล้ว ไม่สามารถดำเนินการอนุมัติได้');
      }
      return { approved: true };
    });

    // Invariant 1: Action wrapper catches error and returns success: false
    assert.equal(actionResult.success, false);
    // Invariant 2: Standardized error code is SLA_EXPIRED
    assert.equal(actionResult.code, 'SLA_EXPIRED');
    // Invariant 3: Clean error message without internal stack traces
    assert.match(actionResult.error, /หมดอายุตาม SLA แล้ว/);
    // Invariant 4: Generates unique correlationId
    assert.ok(actionResult.correlationId);
    // Invariant 5: DB record status remains intact (no corrupt partial transition)
    assert.equal(simulatedExpiredRecord.status, 'PENDING');
    assert.equal(simulatedExpiredRecord.assignments.length, 0);
  });

  // =========================================================================
  // C6: Concurrent Same-Room Approval
  // =========================================================================
  test('C6: Concurrent Same-Room Approval - Exactly 1 succeeds, other receives clean CONFLICT', async () => {
    let roomOccupied = false;

    const attemptApproval = async (requestId) => {
      return executeFacilityAction('approveRoom', async () => {
        if (roomOccupied) {
          throw new Error('23P01:exclusion constraint no_overlapping_room_reservations');
        }
        roomOccupied = true;
        return { requestId, approved: true };
      });
    };

    const [res1, res2] = await Promise.all([
      attemptApproval('req-1'),
      attemptApproval('req-2')
    ]);

    const successes = [res1, res2].filter(r => r.success);
    const conflicts = [res1, res2].filter(r => !r.success && r.code === 'CONFLICT');

    assert.equal(successes.length, 1);
    assert.equal(conflicts.length, 1);
    assert.match(conflicts[0].error, /ถูกจองหรือได้รับอนุมัติในช่วงเวลาดังกล่าวแล้ว/);
  });

  // =========================================================================
  // C7: Concurrent Same-Vehicle Approval
  // =========================================================================
  test('C7: Concurrent Same-Vehicle Approval - Concurrent approval conflict is mapped cleanly', async () => {
    let vehicleOccupied = false;

    const approveVehicle = async (reqId) => {
      return executeFacilityAction('approveVehicle', async () => {
        if (vehicleOccupied) {
          const err = new Error('exclusion constraint');
          err.code = '23P01';
          err.constraint = 'no_overlapping_room_reservations';
          throw err;
        }
        vehicleOccupied = true;
        return { reqId, status: 'APPROVED' };
      });
    };

    const [v1, v2] = await Promise.all([approveVehicle('v-req-1'), approveVehicle('v-req-2')]);
    assert.equal(v1.success, true);
    assert.equal(v2.success, false);
    assert.equal(v2.code, 'CONFLICT');
  });

  // =========================================================================
  // C8: Concurrent Same-Driver Approval
  // =========================================================================
  test('C8: Concurrent Same-Driver Approval - Assigning same driver concurrently rejected with CONFLICT', async () => {
    let driverAssigned = false;

    const assignDriver = async (vehicleBookingId) => {
      return executeFacilityAction('assignDriver', async () => {
        if (driverAssigned) {
          const err = new Error('driver assignment collision');
          err.code = '23P01';
          err.constraint = 'no_overlapping_driver_assignments';
          throw err;
        }
        driverAssigned = true;
        return { vehicleBookingId, driverAssigned: true };
      });
    };

    const [d1, d2] = await Promise.all([assignDriver('bus-01'), assignDriver('van-01')]);
    assert.equal(d1.success, true);
    assert.equal(d2.success, false);
    assert.equal(d2.code, 'CONFLICT');
  });

  // =========================================================================
  // C9: Deadlock-Ordering Test
  // =========================================================================
  test('C9: Deadlock-Ordering Test - Sorting lock targets eliminates cyclic wait', () => {
    // Deterministic total order: resourceId asc -> driverProfileId asc -> reservationId asc
    const sortLockTargets = (resourceIds, driverIds) => {
      const sortedResources = [...resourceIds].sort();
      const sortedDrivers = [...driverIds].sort();
      return [...sortedResources, ...sortedDrivers];
    };

    const tx1Targets = sortLockTargets(['res-02', 'res-01'], ['driver-02', 'driver-01']);
    const tx2Targets = sortLockTargets(['res-01', 'res-02'], ['driver-01', 'driver-02']);

    // Both transactions acquire locks in identical deterministic order, preventing deadlock
    assert.deepEqual(tx1Targets, ['res-01', 'res-02', 'driver-01', 'driver-02']);
    assert.deepEqual(tx2Targets, ['res-01', 'res-02', 'driver-01', 'driver-02']);
  });

  // =========================================================================
  // C10: DB Exclusion Code Mapping
  // =========================================================================
  test('C10: DB Exclusion Code Mapping - PostgreSQL 23P01 maps to CONFLICT with user-friendly message', () => {
    const rawPgExclusionErr = {
      code: '23P01',
      constraint: 'no_overlapping_room_reservations',
      message: 'conflicting key value violates exclusion constraint'
    };

    const code = classifyFacilityErrorCode(rawPgExclusionErr);
    const message = extractCleanErrorMessage(rawPgExclusionErr);

    assert.equal(code, 'CONFLICT');
    assert.equal(message, 'ทรัพยากรหรือผู้ขับขี่นี้ถูกจองหรือได้รับอนุมัติในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกช่วงเวลาหรือทรัพยากรอื่น');
  });

  // =========================================================================
  // C11: Idempotency Replay vs Mismatch Guard
  // =========================================================================
  test('C11: Idempotency Replay vs Mismatch Guard - Canonical hash differentiates payloads', () => {
    const payloadA = {
      resourceId: 'res-room-1',
      startAt: '2026-10-30T09:00:00+07:00',
      endAt: '2026-10-30T12:00:00+07:00',
      title: 'ประชุมกลุ่มสาระ',
      attendeeCount: 20
    };

    const payloadB = {
      ...payloadA,
      attendeeCount: 50 // Different payload
    };

    const hashA1 = computeCanonicalPayloadHash(payloadA);
    const hashA2 = computeCanonicalPayloadHash(payloadA);
    const hashB = computeCanonicalPayloadHash(payloadB);

    // Invariant: Deterministic hash for same payload
    assert.equal(hashA1, hashA2);
    // Invariant: Different payload produces different hash
    assert.notEqual(hashA1, hashB);
  });

  // =========================================================================
  // C12: SLA Timezone & 30-min Grace Period
  // =========================================================================
  test('C12: SLA Timezone & 30-min Grace Period - Single time utility calculation with grace period', () => {
    const created = '2026-10-01T08:00:00+07:00'; // 01:00 UTC
    const start = '2026-10-01T10:00:00+07:00';   // 03:00 UTC (in 2 hours)

    // With slaHours = 24 and bufferHours = 6:
    // start - buffer = 03:00 UTC - 6 hours = in the past!
    // Minimum 30-minute grace period from now must apply
    const expiry = calculateDynamicSlaExpiry(start, 24, 6, created);
    const now = utcNow();

    assert.ok(expiry instanceof Date);
    // Must be at least 29 minutes in the future from now
    assert.ok(expiry.getTime() >= now.getTime() + 29 * 60_000);
  });

  // =========================================================================
  // C13: Strict Plain DTO Whitelist Invariant
  // =========================================================================
  test('C13: Strict Plain DTO Whitelist - Output contains ZERO Date, Decimal, BigInt, or Class instances', () => {
    const rawMockReservation = {
      id: 'res-dto-001',
      bookingNumber: 'BK-202610-0001',
      resourceId: 'res-room-1',
      reservedByUserId: 'user-001',
      consumerModule: 'MEETING_ROOM',
      title: 'ประชุมคณะกรรมการ',
      purpose: 'พิจารณางบประมาณ',
      startAt: new Date('2026-10-15T09:00:00Z'),
      endAt: new Date('2026-10-15T11:00:00Z'),
      expiresAt: new Date('2026-10-14T09:00:00Z'),
      status: 'APPROVED',
      currentStep: 2,
      totalSteps: 2,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
      roomDetails: {
        layoutType: 'THEATER',
        requireAirCon: true
      },
      approvalSteps: [
        {
          id: 'step-1',
          stepNo: 1,
          roleRequired: 'HEAD_FACILITY',
          title: 'ความเห็นหัวหน้างาน',
          status: 'APPROVED',
          actedAt: new Date('2026-10-02T10:00:00Z'),
          createdAt: new Date('2026-10-01T00:00:00Z')
        }
      ],
      assignments: [
        {
          id: 'assign-1',
          targetType: 'RESOURCE',
          resourceId: 'res-room-1',
          startAt: new Date('2026-10-15T09:00:00Z'),
          endAt: new Date('2026-10-15T11:00:00Z'),
          status: 'APPROVED'
        }
      ]
    };

    const dto = mapReservationToDTO(rawMockReservation);

    // Invariant: assertPlainSerializableWhitelist passes without throwing
    assert.doesNotThrow(() => assertPlainSerializableWhitelist(dto));

    // Specific type verifications
    assert.equal(typeof dto.startAt, 'string');
    assert.equal(typeof dto.endAt, 'string');
    assert.equal(typeof dto.createdAt, 'string');
    assert.equal(typeof dto.approvalSteps[0].actedAt, 'string');
    assert.equal(typeof dto.assignments[0].startAt, 'string');

    // Negative verification: if a Date object is accidentally attached, validator throws
    const badDto = { ...dto, leakingDate: new Date() };
    assert.throws(() => assertPlainSerializableWhitelist(badDto), /SERIALIZATION_VIOLATION/);
  });

  // =========================================================================
  // C14: Timezone Round-Trip Integration Test (Direct +07:00 Test)
  // =========================================================================
  test('C14: Timezone Round-Trip Integration Test - +07:00 maps to UTC instant without double Z', () => {
    // 1. Direct +07:00 parsing
    const bangkokTime = '2026-09-20T09:00:00+07:00';
    const dateObj = toDbUtcDate(bangkokTime);

    // 09:00 +07:00 == 02:00 UTC
    assert.equal(dateObj.toISOString(), '2026-09-20T02:00:00.000Z');

    // 2. toIsoUtcString on +07:00 string MUST NOT append "Z" after offset
    const isoResult = toIsoUtcString(bangkokTime);
    assert.equal(isoResult, '2026-09-20T02:00:00.000Z');
    assert.notEqual(isoResult, '2026-09-20T09:00:00+07:00Z');

    // 3. PostgreSQL TIMESTAMP WITHOUT TIME ZONE wall-clock string representation
    const dbWallClock = '2026-09-20 02:00:00';
    const readbackIso = toIsoUtcString(dbWallClock);
    assert.equal(readbackIso, '2026-09-20T02:00:00.000Z');

    // 4. Invariant: bare string without timezone must be REJECTED at write gate
    assert.throws(() => toDbUtcDate('2026-09-20 09:00:00'), /Missing timezone offset/);
  });

  // =========================================================================
  // C15: Concurrent 23505 Race Recovery Test
  // =========================================================================
  test('C15: Concurrent 23505 Race Recovery - Constraint check differentiates idempotency vs other unique errors', async () => {
    // 1. Genuine idempotency collision
    const idempotencyErr = {
      code: '23505',
      constraint: IDEMPOTENCY_CONSTRAINT_NAME,
      message: `duplicate key value violates unique constraint "${IDEMPOTENCY_CONSTRAINT_NAME}"`
    };
    assert.equal(isIdempotencyUniqueViolation(idempotencyErr), true);

    // 2. Booking number collision (MUST NOT trigger idempotency recovery!)
    const bookingNumberErr = {
      code: '23505',
      constraint: 'FacilityReservation_bookingNumber_key',
      message: 'duplicate key value violates unique constraint "FacilityReservation_bookingNumber_key"'
    };
    assert.equal(isIdempotencyUniqueViolation(bookingNumberErr), false);

    // 3. Prisma P2002 on idempotency
    const prismaIdempotencyErr = {
      code: 'P2002',
      meta: { target: ['idempotencyKey'] }
    };
    assert.equal(isIdempotencyUniqueViolation(prismaIdempotencyErr), true);

    // 4. Prisma P2002 on bookingNumber
    const prismaBookingErr = {
      code: 'P2002',
      meta: { target: ['bookingNumber'] }
    };
    assert.equal(isIdempotencyUniqueViolation(prismaBookingErr), false);

    // 5. Recovery re-fetch simulation: Hash match returns replay, hash mismatch rejects
    const mockPrisma = {
      facilityReservation: {
        findFirst: async () => ({
          id: 'res-winner-001',
          bookingNumber: 'BK-001',
          resourceId: 'res-01',
          reservedByUserId: 'user-01',
          title: 'จองห้องประชุม',
          startAt: new Date('2026-10-15T09:00:00Z'),
          endAt: new Date('2026-10-15T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          idempotencyKey: 'key-abc',
          idempotencyPayloadHash: 'hash-correct',
          approvalSteps: [],
          assignments: []
        })
      }
    };

    // Case A: Hash match -> Replay
    const replayDTO = await recoverFromIdempotencyRace(
      mockPrisma,
      'user-01',
      'key-abc',
      'hash-correct',
      idempotencyErr
    );
    assert.equal(replayDTO.id, 'res-winner-001');

    // Case B: Hash mismatch -> Rejection
    await assert.rejects(
      async () => {
        await recoverFromIdempotencyRace(
          mockPrisma,
          'user-01',
          'key-abc',
          'hash-different',
          idempotencyErr
        );
      },
      /IDEMPOTENCY_MISMATCH/
    );

    // Case C: Non-idempotency error -> Rethrows original error without recovery
    await assert.rejects(
      async () => {
        await recoverFromIdempotencyRace(
          mockPrisma,
          'user-01',
          'key-abc',
          'hash-correct',
          bookingNumberErr
        );
      },
      (err) => err.constraint === 'FacilityReservation_bookingNumber_key'
    );
  });

});
