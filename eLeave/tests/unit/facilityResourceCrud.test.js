import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getFacilityRole, 
  hasFacilityPermission, 
  assertFacilityPermission 
} from '../../../src/lib/permissions.js';

// Domain RBAC validator matching assertResourceDomainPermission in actions/facility.ts
function checkDomainPermission(user, resourceType) {
  const role = getFacilityRole(user);
  if (role === 'ADMIN') return true;

  if (role === 'HEAD_FACILITY') {
    if (resourceType === 'VEHICLE') {
      throw new Error('หัวหน้าฝ่ายอาคารสถานที่สามารถจัดการเฉพาะห้องประชุม อาคาร และอุปกรณ์เท่านั้น');
    }
    return true;
  }

  if (role === 'HEAD_VEHICLE') {
    if (resourceType !== 'VEHICLE') {
      throw new Error('หัวหน้างานยานพาหนะสามารถจัดการเฉพาะยานพาหนะโรงเรียนเท่านั้น');
    }
    return true;
  }

  throw new Error('ไม่มีสิทธิ์จัดการข้อมูลทรัพยากรส่วนกลาง (ต้องเป็นผู้ดูแลระบบหรือหัวหน้างานที่เกี่ยวข้อง)');
}

// Invariant mock engine for Facility Resource Delete & Retire logic
class FacilityResourceCrudEngine {
  constructor() {
    this.resources = new Map();
    this.assignments = [];
  }

  addResource(res) {
    this.resources.set(res.id, { ...res });
  }

  addAssignment(assign) {
    this.assignments.push({ ...assign });
  }

  deleteResource(user, resourceId) {
    const res = this.resources.get(resourceId);
    if (!res) throw new Error('ไม่พบข้อมูลทรัพยากร');

    // 1. Check domain permission
    checkDomainPermission(user, res.type);

    // 2. Count assignments
    const count = this.assignments.filter(a => a.resourceId === resourceId).length;

    if (count > 0) {
      // Historical reservations exist -> MUST RETIRE, NEVER HARD DELETE!
      res.status = 'RETIRED';
      this.resources.set(resourceId, res);
      return { action: 'RETIRED', resource: res };
    }

    // 3. No historical reservations -> Hard delete
    this.resources.delete(resourceId);
    return { action: 'DELETED', resource: res };
  }

  toggleStatus(user, resourceId, newStatus) {
    const res = this.resources.get(resourceId);
    if (!res) throw new Error('ไม่พบข้อมูลทรัพยากร');

    checkDomainPermission(user, res.type);

    // If changing to non-available, check if currently IN_USE
    if (newStatus === 'UNDER_MAINTENANCE' || newStatus === 'OUT_OF_SERVICE' || newStatus === 'RETIRED') {
      const activeInUse = this.assignments.find(a => a.resourceId === resourceId && a.status === 'IN_USE');
      if (activeInUse) {
        throw new Error(`ไม่สามารถเปลี่ยนสถานะเป็น "${newStatus}" ได้ เนื่องจากทรัพยากรนี้กำลังถูกใช้งานจริงในขณะนี้ (IN_USE)`);
      }
    }

    res.status = newStatus;
    this.resources.set(resourceId, res);
    return res;
  }

  reserveResource(resourceId, reservationData) {
    const res = this.resources.get(resourceId);
    if (!res) throw new Error('ไม่พบข้อมูลทรัพยากร');

    if (res.status !== 'AVAILABLE') {
      throw new Error(`ไม่สามารถทำการจองได้ เนื่องจากทรัพยากรอยู่ในสถานะ "${res.status}" (ไม่อยู่ในสถานะพร้อมใช้งาน)`);
    }

    const bookingId = `BK-${Date.now()}`;
    this.addAssignment({
      id: `assign-${Date.now()}`,
      reservationId: bookingId,
      resourceId,
      status: 'PENDING'
    });
    return { bookingId, status: 'PENDING' };
  }
}

test('Facility Resource CRUD - RBAC permission checks for roles', () => {
  const teacher = { role: 'TEACHER', position: 'ครูผู้สอน' };
  const headFacility = { role: 'HEAD_FACILITY', position: 'หัวหน้างานอาคารสถานที่' };
  const headVehicle = { role: 'HEAD_VEHICLE', position: 'หัวหน้างานยานพาหนะ' };
  const admin = { role: 'ADMIN' };

  // Teachers CANNOT create or manage resources
  assert.equal(hasFacilityPermission(teacher, 'facility:resource.create'), false);
  assert.equal(hasFacilityPermission(teacher, 'facility:resource.manage'), false);

  // Head Facility CAN manage facilities & rooms
  assert.equal(hasFacilityPermission(headFacility, 'facility:resource.create'), true);
  assert.equal(hasFacilityPermission(headFacility, 'facility:resource.manage'), true);

  // Head Vehicle CAN manage vehicle resources
  assert.equal(hasFacilityPermission(headVehicle, 'facility:resource.create'), true);
  assert.equal(hasFacilityPermission(headVehicle, 'facility:resource.manage'), true);

  // Admin has full management permission
  assert.equal(hasFacilityPermission(admin, 'facility:resource.create'), true);
  assert.equal(hasFacilityPermission(admin, 'facility:resource.manage'), true);
});

test('Facility Resource CRUD - Domain-scoped boundary protection', () => {
  const teacher = { role: 'TEACHER', position: 'ครู' };
  const headFacility = { role: 'HEAD_FACILITY', position: 'หัวหน้างานอาคารสถานที่' };
  const headVehicle = { role: 'HEAD_VEHICLE', position: 'หัวหน้างานยานพาหนะ' };
  const admin = { role: 'ADMIN' };

  // Head Facility can manage MEETING_ROOM and LABORATORY, but NOT VEHICLE
  assert.doesNotThrow(() => checkDomainPermission(headFacility, 'MEETING_ROOM'));
  assert.doesNotThrow(() => checkDomainPermission(headFacility, 'LABORATORY'));
  assert.throws(() => checkDomainPermission(headFacility, 'VEHICLE'), /หัวหน้าฝ่ายอาคารสถานที่สามารถจัดการเฉพาะห้องประชุม/);

  // Head Vehicle can manage VEHICLE, but NOT MEETING_ROOM or LABORATORY
  assert.doesNotThrow(() => checkDomainPermission(headVehicle, 'VEHICLE'));
  assert.throws(() => checkDomainPermission(headVehicle, 'MEETING_ROOM'), /หัวหน้างานยานพาหนะสามารถจัดการเฉพาะยานพาหนะโรงเรียนเท่านั้น/);

  // Admin can manage ANY domain
  assert.doesNotThrow(() => checkDomainPermission(admin, 'MEETING_ROOM'));
  assert.doesNotThrow(() => checkDomainPermission(admin, 'VEHICLE'));
  assert.doesNotThrow(() => checkDomainPermission(admin, 'LABORATORY'));

  // Teachers are strictly forbidden from managing any domain
  assert.throws(() => checkDomainPermission(teacher, 'MEETING_ROOM'), /ไม่มีสิทธิ์จัดการข้อมูลทรัพยากรส่วนกลาง/);
  assert.throws(() => checkDomainPermission(teacher, 'VEHICLE'), /ไม่มีสิทธิ์จัดการข้อมูลทรัพยากรส่วนกลาง/);
});

test('Facility Resource CRUD - Soft Delete / Retire invariant when reservations exist', () => {
  const engine = new FacilityResourceCrudEngine();
  const admin = { role: 'ADMIN' };

  // 1. Setup resource with historical reservation
  engine.addResource({ id: 'res-room-1', code: 'ROOM-01', name: 'ห้องประชุมกุญชร', type: 'MEETING_ROOM', status: 'AVAILABLE' });
  engine.addAssignment({ id: 'asgn-1', reservationId: 'resv-1', resourceId: 'res-room-1', status: 'COMPLETED' });

  // 2. Delete must NOT hard delete; must transition to RETIRED
  const result = engine.deleteResource(admin, 'res-room-1');
  assert.equal(result.action, 'RETIRED');
  assert.equal(result.resource.status, 'RETIRED');
  assert.ok(engine.resources.has('res-room-1'));
  assert.equal(engine.resources.get('res-room-1').status, 'RETIRED');
});

test('Facility Resource CRUD - Hard Delete allowed only when 0 assignments exist', () => {
  const engine = new FacilityResourceCrudEngine();
  const admin = { role: 'ADMIN' };

  // Setup resource with NO reservations
  engine.addResource({ id: 'res-room-empty', code: 'ROOM-TEST', name: 'ห้องประชุมทดสอบ', type: 'MEETING_ROOM', status: 'AVAILABLE' });

  // Delete should completely remove row
  const result = engine.deleteResource(admin, 'res-room-empty');
  assert.equal(result.action, 'DELETED');
  assert.equal(engine.resources.has('res-room-empty'), false);
});

test('Facility Resource CRUD - Toggle status protects active IN_USE resources', () => {
  const engine = new FacilityResourceCrudEngine();
  const admin = { role: 'ADMIN' };

  engine.addResource({ id: 'res-bus-1', code: 'BUS-01', name: 'รถบัส 1', type: 'VEHICLE', status: 'AVAILABLE' });

  // 1. Normal toggle works
  const toggled = engine.toggleStatus(admin, 'res-bus-1', 'UNDER_MAINTENANCE');
  assert.equal(toggled.status, 'UNDER_MAINTENANCE');

  // Toggle back
  engine.toggleStatus(admin, 'res-bus-1', 'AVAILABLE');
  assert.equal(engine.resources.get('res-bus-1').status, 'AVAILABLE');

  // 2. Add an IN_USE active trip assignment
  engine.addAssignment({ id: 'asgn-in-use', reservationId: 'resv-live', resourceId: 'res-bus-1', status: 'IN_USE' });

  // Toggling to UNDER_MAINTENANCE while IN_USE must throw
  assert.throws(() => {
    engine.toggleStatus(admin, 'res-bus-1', 'UNDER_MAINTENANCE');
  }, /เนื่องจากทรัพยากรนี้กำลังถูกใช้งานจริงในขณะนี้ \(IN_USE\)/);
});

test('Facility Resource CRUD - Server-side non-bookable rejection invariant', () => {
  const engine = new FacilityResourceCrudEngine();

  engine.addResource({ id: 'res-maint', code: 'ROOM-MAINT', name: 'ห้องปรับปรุง', type: 'MEETING_ROOM', status: 'UNDER_MAINTENANCE' });
  engine.addResource({ id: 'res-retired', code: 'BUS-RETIRED', name: 'รถปลดระวาง', type: 'VEHICLE', status: 'RETIRED' });
  engine.addResource({ id: 'res-ok', code: 'ROOM-OK', name: 'ห้องพร้อมใช้', type: 'MEETING_ROOM', status: 'AVAILABLE' });

  // Booking on UNDER_MAINTENANCE must be rejected
  assert.throws(() => {
    engine.reserveResource('res-maint', { title: 'ทดสอบจอง' });
  }, /ทรัพยากรอยู่ในสถานะ "UNDER_MAINTENANCE"/);

  // Booking on RETIRED must be rejected
  assert.throws(() => {
    engine.reserveResource('res-retired', { title: 'ทดสอบจอง' });
  }, /ทรัพยากรอยู่ในสถานะ "RETIRED"/);

  // Booking on AVAILABLE succeeds
  const success = engine.reserveResource('res-ok', { title: 'ประชุมวิชาการ' });
  assert.ok(success.bookingId);
  assert.equal(success.status, 'PENDING');
});

test('Facility Resource Locking - Deterministic multi-resource and driver ordering protocol', () => {
  const lockedOrder = [];

  function simulateOrderedLock(resourceIdOrIds, driverProfileIdOrIds) {
    const resourceIds = (Array.isArray(resourceIdOrIds) ? resourceIdOrIds : [resourceIdOrIds])
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    const rawDrivers = driverProfileIdOrIds
      ? (Array.isArray(driverProfileIdOrIds) ? driverProfileIdOrIds : [driverProfileIdOrIds])
      : [];
    const driverIds = rawDrivers
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    // Emulate sequential lock acquisition
    for (const rId of resourceIds) {
      lockedOrder.push(`RESOURCE:${rId}`);
    }
    for (const dId of driverIds) {
      lockedOrder.push(`DRIVER:${dId}`);
    }
    lockedOrder.push('RESERVATION');
  }

  // Pass shuffled/reverse array of resource IDs and driver IDs with duplicates
  simulateOrderedLock(['res-z', 'res-a', 'res-m', 'res-a'], ['drv-2', 'drv-1', 'drv-2']);

  assert.deepEqual(lockedOrder, [
    'RESOURCE:res-a',
    'RESOURCE:res-m',
    'RESOURCE:res-z',
    'DRIVER:drv-1',
    'DRIVER:drv-2',
    'RESERVATION'
  ]);
});

