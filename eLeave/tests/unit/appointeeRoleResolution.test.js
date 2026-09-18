import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserRoleKey,
  getUserRoleKeys,
  getUserCapabilities,
} from '../../../src/lib/permissions.ts';

describe('Appointee Role Resolution & Capabilities Parity', () => {
  describe('Teacher appointed as HR_HEAD', () => {
    const teacherAsHR = {
      id: 'user-hr-1',
      name: 'ครูสมศรี มีวินัย',
      position: 'ครู',
      role: 'TEACHER',
      duties: [{ dutyType: 'HR_HEAD', revokedAt: null }],
    };

    test('getUserRoleKey resolves to HR', () => {
      assert.equal(getUserRoleKey(teacherAsHR), 'HR');
    });

    test('getUserRoleKeys includes HR', () => {
      const keys = getUserRoleKeys(teacherAsHR);
      assert.ok(keys.includes('HR'));
    });

    test('getUserCapabilities grants HR head capabilities and leave report/history parity', () => {
      const caps = getUserCapabilities(
        { id: teacherAsHR.id, position: teacherAsHR.position, role: teacherAsHR.role },
        teacherAsHR.duties
      );
      assert.equal(caps.isHRHead, true);
      assert.equal(caps.canViewAllLeaveReports, true);
      assert.equal(caps.canViewAllLeaveHistory, true);
      assert.equal(caps.canManageUsers, true);
      assert.equal(caps.canApproveLeaveHead, true);
      assert.equal(caps.canManageLeaveQuotas, true);
    });
  });

  describe('Teacher appointed as DIVISION_HEAD (PERSONNEL)', () => {
    const teacherDivisionHR = {
      id: 'user-hr-2',
      name: 'ครูวิชัย ฝ่ายบุคคล',
      position: 'ครู',
      role: 'TEACHER',
      duties: [{ dutyType: 'DIVISION_HEAD', divisionScope: 'PERSONNEL', revokedAt: null }],
    };

    test('getUserRoleKey resolves to HR', () => {
      assert.equal(getUserRoleKey(teacherDivisionHR), 'HR');
    });

    test('getUserRoleKeys includes HR', () => {
      const keys = getUserRoleKeys(teacherDivisionHR);
      assert.ok(keys.includes('HR'));
    });

    test('getUserCapabilities grants isHRHead and leave report/history access', () => {
      const caps = getUserCapabilities(
        { id: teacherDivisionHR.id, position: teacherDivisionHR.position, role: teacherDivisionHR.role },
        teacherDivisionHR.duties
      );
      assert.equal(caps.isHRHead, true);
      assert.equal(caps.canViewAllLeaveReports, true);
      assert.equal(caps.canViewAllLeaveHistory, true);
      assert.equal(caps.canManageUsers, true);
    });
  });

  describe('Teacher appointed as INSPECTOR', () => {
    const teacherInspector = {
      id: 'user-insp-1',
      name: 'ครูอำนาจ ตรวจสอบ',
      position: 'ครู',
      role: 'TEACHER',
      duties: [{ dutyType: 'INSPECTOR', revokedAt: null }],
    };

    test('getUserRoleKey resolves to INSPECTOR', () => {
      assert.equal(getUserRoleKey(teacherInspector), 'INSPECTOR');
    });

    test('getUserRoleKeys includes INSPECTOR', () => {
      const keys = getUserRoleKeys(teacherInspector);
      assert.ok(keys.includes('INSPECTOR'));
    });

    test('getUserCapabilities grants inspection and leave view capabilities', () => {
      const caps = getUserCapabilities(
        { id: teacherInspector.id, position: teacherInspector.position, role: teacherInspector.role },
        teacherInspector.duties
      );
      assert.equal(caps.isInspector, true);
      assert.equal(caps.canInspectLeave, true);
      assert.equal(caps.canViewAllLeaveReports, true);
      assert.equal(caps.canViewAllLeaveHistory, true);
      assert.equal(caps.canManageUsers, false);
    });
  });

  describe('Teacher appointed as DEPT_HEAD (MATH)', () => {
    const teacherDeptHead = {
      id: 'user-dept-1',
      name: 'ครูมานะ หัวหน้าหมวด',
      position: 'ครู',
      role: 'TEACHER',
      duties: [{ dutyType: 'DEPT_HEAD', departmentScope: 'MATH', revokedAt: null }],
    };

    test('getUserRoleKey resolves to DEPT_HEAD', () => {
      assert.equal(getUserRoleKey(teacherDeptHead), 'DEPT_HEAD');
    });

    test('getUserCapabilities grants dept head approval', () => {
      const caps = getUserCapabilities(
        { id: teacherDeptHead.id, position: teacherDeptHead.position, role: teacherDeptHead.role },
        teacherDeptHead.duties
      );
      assert.equal(caps.isDeptHead, true);
      assert.deepEqual(caps.deptHeadGroups, ['MATH']);
      assert.equal(caps.canApproveLeaveHead, true);
      assert.equal(caps.canViewAllLeaveReports, false);
    });
  });

  describe('Teacher holding multiple active duties (HR_HEAD + INSPECTOR)', () => {
    const multiDutyUser = {
      id: 'user-multi-1',
      name: 'ครูสุวรรณ หลายหน้าที่',
      position: 'ครู',
      role: 'TEACHER',
      duties: [
        { dutyType: 'HR_HEAD', revokedAt: null },
        { dutyType: 'INSPECTOR', revokedAt: null },
      ],
    };

    test('getUserRoleKeys returns all active roles', () => {
      const keys = getUserRoleKeys(multiDutyUser);
      assert.ok(keys.includes('HR'));
      assert.ok(keys.includes('INSPECTOR'));
    });

    test('getUserRoleKey prioritizes HR over INSPECTOR', () => {
      assert.equal(getUserRoleKey(multiDutyUser), 'HR');
    });
  });

  describe('Plain regular teacher without appointed duties', () => {
    const plainTeacher = {
      id: 'user-plain-1',
      name: 'ครูธรรมดา สอนดี',
      position: 'ครู',
      role: 'TEACHER',
      duties: [],
    };

    test('getUserRoleKey resolves to TEACHER', () => {
      assert.equal(getUserRoleKey(plainTeacher), 'TEACHER');
    });

    test('getUserRoleKeys is [TEACHER]', () => {
      assert.deepEqual(getUserRoleKeys(plainTeacher), ['TEACHER']);
    });

    test('getUserCapabilities restricts elevated permissions (fail-closed)', () => {
      const caps = getUserCapabilities(
        { id: plainTeacher.id, position: plainTeacher.position, role: plainTeacher.role },
        []
      );
      assert.equal(caps.isHRHead, false);
      assert.equal(caps.isInspector, false);
      assert.equal(caps.isDeptHead, false);
      assert.equal(caps.canViewAllLeaveReports, false);
      assert.equal(caps.canViewAllLeaveHistory, false);
      assert.equal(caps.canManageUsers, false);
    });
  });

  describe('Revoked duty assignment enforcement (Fail-Closed)', () => {
    const revokedUser = {
      id: 'user-revoked-1',
      name: 'ครูหมดวาระ',
      position: 'ครู',
      role: 'TEACHER',
      duties: [{ dutyType: 'HR_HEAD', revokedAt: new Date() }],
    };

    test('getUserRoleKey treats revoked duties as inactive', () => {
      assert.equal(getUserRoleKey(revokedUser), 'TEACHER');
      assert.deepEqual(getUserRoleKeys(revokedUser), ['TEACHER']);
    });

    test('getUserCapabilities ignores revoked assignments', () => {
      const caps = getUserCapabilities(
        { id: revokedUser.id, position: revokedUser.position, role: revokedUser.role },
        revokedUser.duties
      );
      assert.equal(caps.isHRHead, false);
      assert.equal(caps.canViewAllLeaveReports, false);
      assert.equal(caps.canViewAllLeaveHistory, false);
      assert.equal(caps.canManageUsers, false);
    });
  });

  describe('Legacy position and final approver compatibility', () => {
    test('legacy position หัวหน้างานบุคคล resolves to HR', () => {
      const legacyHR = { id: 'leg-1', position: 'หัวหน้างานบุคคล', role: 'USER' };
      assert.equal(getUserRoleKey(legacyHR), 'HR');
    });

    test('legacy position ผู้ตรวจสอบ resolves to INSPECTOR', () => {
      const legacyInsp = { id: 'leg-2', position: 'ผู้ตรวจสอบ', role: 'USER' };
      assert.equal(getUserRoleKey(legacyInsp), 'INSPECTOR');
    });

    test('final approver ID resolves to DIRECTOR', () => {
      const teacherApprover = { id: 'user-exec-1', position: 'ครู', role: 'TEACHER' };
      assert.equal(getUserRoleKey(teacherApprover, true), 'DIRECTOR');
    });
  });

  describe('Client Approvals Matrix & canApproveThisItem logic', () => {
    function computeCanApproveItem(effectiveUser, item, settings = {}) {
      const isFinalApprover = settings?.finalApproverUserIds
        ?.split(',')
        ?.map(id => id.trim())
        ?.includes(effectiveUser.id);
      const userRoles = getUserRoleKeys(effectiveUser, isFinalApprover);
      const isUserAdmin = userRoles.includes('ADMIN');
      const isDirector = userRoles.includes('DIRECTOR');
      const isDeputyDirector = userRoles.includes('DEPUTY_DIRECTOR');
      const isHRHead = userRoles.includes('HR');
      const isDeptHead = userRoles.includes('DEPT_HEAD');

      const canApproveFinal = isDirector || isDeputyDirector || isFinalApprover || isUserAdmin;

      let canApproveHead = isHRHead || isUserAdmin || canApproveFinal;
      if (!canApproveHead && isDeptHead) {
        const activeDuties = (effectiveUser.duties || []).filter(d => !d.revokedAt);
        const deptScopes = activeDuties
          .filter(d => d.dutyType === 'DEPT_HEAD' && d.departmentScope)
          .map(d => d.departmentScope);
        const requestDept = item.user?.subjectGroup === 'คณิตศาสตร์' ? 'MATH' : null;
        if (requestDept && deptScopes.includes(requestDept)) {
          canApproveHead = true;
        }
      }

      return (
        (item.status === 'PENDING_HEAD' && canApproveHead) ||
        (item.status === 'PENDING_EXEC' && canApproveFinal)
      );
    }

    test('HR Head teacher can approve PENDING_HEAD requests', () => {
      const hrTeacher = {
        id: 'u-hr',
        position: 'ครู',
        role: 'TEACHER',
        duties: [{ dutyType: 'HR_HEAD', revokedAt: null }],
      };
      const pendingHeadItem = { id: 'req-1', status: 'PENDING_HEAD', user: { subjectGroup: 'ภาษาไทย' } };
      assert.equal(computeCanApproveItem(hrTeacher, pendingHeadItem), true);
    });

    test('HR Head teacher cannot approve PENDING_EXEC requests (reserved for Director)', () => {
      const hrTeacher = {
        id: 'u-hr',
        position: 'ครู',
        role: 'TEACHER',
        duties: [{ dutyType: 'HR_HEAD', revokedAt: null }],
      };
      const pendingExecItem = { id: 'req-2', status: 'PENDING_EXEC', user: { subjectGroup: 'ภาษาไทย' } };
      assert.equal(computeCanApproveItem(hrTeacher, pendingExecItem), false);
    });

    test('Director can approve both PENDING_HEAD and PENDING_EXEC requests', () => {
      const director = { id: 'u-dir', position: 'ผู้อำนวยการ', role: 'DIRECTOR', duties: [] };
      const pendingHeadItem = { id: 'req-1', status: 'PENDING_HEAD', user: { subjectGroup: 'ภาษาไทย' } };
      const pendingExecItem = { id: 'req-2', status: 'PENDING_EXEC', user: { subjectGroup: 'ภาษาไทย' } };
      assert.equal(computeCanApproveItem(director, pendingHeadItem), true);
      assert.equal(computeCanApproveItem(director, pendingExecItem), true);
    });

    test('Regular teacher cannot approve PENDING_HEAD or PENDING_EXEC requests', () => {
      const plainTeacher = { id: 'u-plain', position: 'ครู', role: 'TEACHER', duties: [] };
      const pendingHeadItem = { id: 'req-1', status: 'PENDING_HEAD', user: { subjectGroup: 'ภาษาไทย' } };
      const pendingExecItem = { id: 'req-2', status: 'PENDING_EXEC', user: { subjectGroup: 'ภาษาไทย' } };
      assert.equal(computeCanApproveItem(plainTeacher, pendingHeadItem), false);
      assert.equal(computeCanApproveItem(plainTeacher, pendingExecItem), false);
    });
  });
});

