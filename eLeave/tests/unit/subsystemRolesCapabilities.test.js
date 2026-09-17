import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserCapabilities,
  mapSubjectGroupToDeptScope,
  SUBJECT_GROUP_TO_DEPT_SCOPE,
  DEPT_SCOPE_TO_SUBJECT_GROUP,
} from '../../../src/lib/permissions.ts';

describe('Subsystem Roles & Capabilities Engine', () => {
  test('fail-closed: legacy synthetic position without active assignment grants zero duty privileges', () => {
    const legacyUser = {
      id: 'legacy-hr-1',
      role: 'TEACHER',
      position: 'หัวหน้างานบุคคล',
      subjectGroup: 'ภาษาไทย',
    };

    const caps = getUserCapabilities(legacyUser, []);
    assert.equal(caps.isHRHead, false);
    assert.equal(caps.isInspector, false);
    assert.equal(caps.canManageUsers, false);
    assert.equal(caps.canInspectLeave, false);
    assert.equal(caps.canApproveLeaveHead, false);
  });

  test('active assignment: teacher with active HR_HEAD assignment receives HR management capabilities', () => {
    const teacher = {
      id: 'teacher-1',
      role: 'TEACHER',
      position: 'ครู',
      subjectGroup: 'คณิตศาสตร์',
    };

    const activeAssignments = [
      {
        dutyType: 'HR_HEAD',
        divisionScope: null,
        departmentScope: null,
        revokedAt: null,
      },
    ];

    const caps = getUserCapabilities(teacher, activeAssignments);
    assert.equal(caps.isHRHead, true);
    assert.equal(caps.canManageUsers, true);
    assert.equal(caps.canApproveLeaveHead, true);
    assert.equal(caps.canManageLeaveQuotas, true);
    assert.equal(caps.isInspector, false);
  });

  test('revoked assignment is ignored (fail-closed)', () => {
    const teacher = {
      id: 'teacher-2',
      role: 'TEACHER',
      position: 'ครู',
    };

    const revokedAssignments = [
      {
        dutyType: 'HR_HEAD',
        divisionScope: null,
        departmentScope: null,
        revokedAt: new Date('2026-09-01'),
      },
    ];

    const caps = getUserCapabilities(teacher, revokedAssignments);
    assert.equal(caps.isHRHead, false);
    assert.equal(caps.canManageUsers, false);
  });

  test('inspector duty assignment grants canInspectLeave', () => {
    const teacher = {
      id: 'inspector-1',
      role: 'TEACHER',
      position: 'ครู',
    };

    const assignments = [
      {
        dutyType: 'INSPECTOR',
        divisionScope: null,
        departmentScope: null,
        revokedAt: null,
      },
    ];

    const caps = getUserCapabilities(teacher, assignments);
    assert.equal(caps.isInspector, true);
    assert.equal(caps.canInspectLeave, true);
    assert.equal(caps.isHRHead, false);
  });

  test('department head assignment binds to specified department scope', () => {
    const teacher = {
      id: 'dept-head-1',
      role: 'TEACHER',
      position: 'ครู',
    };

    const assignments = [
      {
        dutyType: 'DEPT_HEAD',
        divisionScope: null,
        departmentScope: 'MATH',
        revokedAt: null,
      },
    ];

    const caps = getUserCapabilities(teacher, assignments);
    assert.equal(caps.isDeptHead, true);
    assert.deepEqual(caps.deptHeadGroups, ['MATH']);
    assert.equal(caps.canApproveLeaveHead, true);
  });

  test('division head for personnel grants isHRHead', () => {
    const teacher = {
      id: 'div-head-personnel',
      role: 'TEACHER',
      position: 'ครู',
    };

    const assignments = [
      {
        dutyType: 'DIVISION_HEAD',
        divisionScope: 'PERSONNEL',
        departmentScope: null,
        revokedAt: null,
      },
    ];

    const caps = getUserCapabilities(teacher, assignments);
    assert.equal(caps.isHRHead, true);
    assert.deepEqual(caps.divisionRoles, ['PERSONNEL']);
    assert.equal(caps.canManageUsers, true);
  });

  test('admin and director overrides', () => {
    const admin = {
      id: 'admin-1',
      role: 'ADMIN',
      position: 'แอดมิน',
    };

    const adminCaps = getUserCapabilities(admin, []);
    assert.equal(adminCaps.isAdmin, true);
    assert.equal(adminCaps.canInspectLeave, true);
    assert.equal(adminCaps.canManageUsers, true);
    assert.equal(adminCaps.canApproveLeaveHead, true);

    const director = {
      id: 'director-1',
      role: 'TEACHER',
      position: 'ผู้อำนวยการ',
    };

    const directorCaps = getUserCapabilities(director, []);
    assert.equal(directorCaps.isDirector, true);
    assert.equal(directorCaps.canInspectLeave, true);
    assert.equal(directorCaps.canApproveLeaveHead, true);
  });

  test('mapping subject group strings to typed department scopes and vice versa', () => {
    assert.equal(mapSubjectGroupToDeptScope('คณิตศาสตร์'), 'MATH');
    assert.equal(mapSubjectGroupToDeptScope('วิทยาศาสตร์และเทคโนโลยี'), 'SCIENCE');
    assert.equal(mapSubjectGroupToDeptScope('ภาษาไทย'), 'THAI');
    assert.equal(mapSubjectGroupToDeptScope('ไม่ระบุ'), null);
    assert.equal(mapSubjectGroupToDeptScope(null), null);

    assert.equal(DEPT_SCOPE_TO_SUBJECT_GROUP['SCIENCE'], 'วิทยาศาสตร์และเทคโนโลยี');
    assert.equal(DEPT_SCOPE_TO_SUBJECT_GROUP['STUDENT_DEV'], 'กิจกรรมพัฒนาผู้เรียน');
  });
});
