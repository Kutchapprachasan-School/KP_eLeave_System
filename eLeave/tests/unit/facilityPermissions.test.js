import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getFacilityRole, 
  hasFacilityPermission, 
  assertFacilityPermission 
} from '../../../src/lib/permissions.js';

test('FacilityPermissions - correctly resolves roles from user attributes', () => {
  assert.equal(getFacilityRole({ role: 'ADMIN' }), 'ADMIN');
  assert.equal(getFacilityRole({ position: 'แอดมิน' }), 'ADMIN');
  assert.equal(getFacilityRole({ role: 'DIRECTOR' }), 'DIRECTOR');
  assert.equal(getFacilityRole({ position: 'ผู้อำนวยการโรงเรียน' }), 'DIRECTOR');
  assert.equal(getFacilityRole({ position: 'หัวหน้างานยานพาหนะ' }), 'HEAD_VEHICLE');
  assert.equal(getFacilityRole({ position: 'หัวหน้าฝ่ายอาคารสถานที่' }), 'HEAD_FACILITY');
  assert.equal(getFacilityRole({ position: 'พนักงานขับรถ' }), 'DRIVER');
  assert.equal(getFacilityRole({ position: 'ครูผู้สอน' }), 'TEACHER');
  assert.equal(getFacilityRole(null), 'TEACHER');
});

test('FacilityPermissions - enforces capability matrix boundaries', () => {
  const teacher = { role: 'TEACHER', position: 'ครู คศ.1' };
  const headVehicle = { role: 'HEAD_VEHICLE', position: 'หัวหน้างานยานพาหนะ' };
  const headFacility = { role: 'HEAD_FACILITY', position: 'หัวหน้างานอาคารสถานที่' };
  const director = { role: 'DIRECTOR', position: 'ผู้อำนวยการ' };
  const driver = { role: 'DRIVER', position: 'พนักงานขับรถ' };
  const admin = { role: 'ADMIN' };

  // Teacher permissions
  assert.equal(hasFacilityPermission(teacher, 'facility:create'), true);
  assert.equal(hasFacilityPermission(teacher, 'facility:view.own'), true);
  assert.equal(hasFacilityPermission(teacher, 'facility:vehicle.manage'), false);
  assert.equal(hasFacilityPermission(teacher, 'facility:approve.director'), false);
  assert.equal(hasFacilityPermission(teacher, 'facility:emergency.cancel'), false);

  // Head Vehicle permissions
  assert.equal(hasFacilityPermission(headVehicle, 'facility:vehicle.manage'), true);
  assert.equal(hasFacilityPermission(headVehicle, 'facility:driver.assign'), true);
  assert.equal(hasFacilityPermission(headVehicle, 'facility:room.manage'), false);
  assert.equal(hasFacilityPermission(headVehicle, 'facility:approve.director'), false);

  // Head Facility permissions
  assert.equal(hasFacilityPermission(headFacility, 'facility:room.manage'), true);
  assert.equal(hasFacilityPermission(headFacility, 'facility:vehicle.manage'), false);
  assert.equal(hasFacilityPermission(headFacility, 'facility:driver.assign'), false);

  // Director permissions
  assert.equal(hasFacilityPermission(director, 'facility:approve.director'), true);
  assert.equal(hasFacilityPermission(director, 'facility:vehicle.manage'), false);

  // Driver permissions
  assert.equal(hasFacilityPermission(driver, 'facility:trip.complete'), true);
  assert.equal(hasFacilityPermission(driver, 'facility:create'), false);

  // Admin permissions (Full)
  assert.equal(hasFacilityPermission(admin, 'facility:create'), true);
  assert.equal(hasFacilityPermission(admin, 'facility:vehicle.manage'), true);
  assert.equal(hasFacilityPermission(admin, 'facility:room.manage'), true);
  assert.equal(hasFacilityPermission(admin, 'facility:driver.assign'), true);
  assert.equal(hasFacilityPermission(admin, 'facility:approve.director'), true);
  assert.equal(hasFacilityPermission(admin, 'facility:emergency.cancel'), true);
});

test('FacilityPermissions - assertFacilityPermission throws when forbidden', () => {
  const teacher = { role: 'TEACHER', position: 'ครู' };
  
  assert.doesNotThrow(() => {
    assertFacilityPermission(teacher, 'facility:create');
  });

  assert.throws(() => {
    assertFacilityPermission(teacher, 'facility:approve.director');
  }, /ไม่มีสิทธิ์ดำเนินการนี้/);
});
