import test from 'node:test';
import assert from 'node:assert/strict';
import { FacilityReservationService } from '../../../src/lib/services/facilityReservationService.js';

test('FacilityReservationService - lists facilities and checks overlap conflicts correctly', () => {
  const service = new FacilityReservationService();
  const list = service.getFacilityList();

  assert.equal(list.length, 5);
  assert.equal(list[0].id, 'res-lab-1');

  // Existing mock reservation is 2026-08-04T09:20:00Z to 10:10:00Z
  const hasConflict = service.checkConflict('res-lab-1', '2026-08-04T09:30:00Z', '2026-08-04T10:00:00Z');
  assert.equal(hasConflict, true);
});

test('FacilityReservationService - creates new reservation and prevents double booking', () => {
  const service = new FacilityReservationService();

  const newRes = service.createReservation({
    resourceId: 'res-lab-comp',
    resourceName: 'ห้องปฏิบัติการคอมพิวเตอร์ 1',
    reservedByTeacher: 'ครูสมหญิง',
    purpose: 'สอนคอมพิวเตอร์ ม.1/1',
    startTime: '2026-08-05T09:00:00Z',
    endTime: '2026-08-05T10:00:00Z'
  });

  assert.ok(newRes.reservationId.startsWith('RES-2026-'));
  assert.equal(newRes.status, 'APPROVED');

  assert.throws(() => {
    service.createReservation({
      resourceId: 'res-lab-comp',
      startTime: '2026-08-05T09:30:00Z',
      endTime: '2026-08-05T10:30:00Z'
    });
  }, /ทรัพยากรถูกจองในช่วงเวลาดังกล่าวแล้ว/);
});
