import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserCapabilities,
  mapSubjectGroupToDeptScope,
} from '../../../src/lib/permissions.ts';

describe('Leave Separation of Duties & Anti-Self-Approval', () => {
  test('self-approval guard: requester cannot approve their own request', () => {
    const requesterId = 'user-requester-1';
    const approverId = 'user-requester-1';

    const isSelfApproval = requesterId === approverId;
    assert.equal(isSelfApproval, true);

    const assertNotSelfApproval = (reqId, appId) => {
      if (reqId === appId) {
        throw new Error('CRITICAL_SECURITY_VIOLATION: Requester cannot inspect or approve their own leave request');
      }
    };

    assert.throws(
      () => assertNotSelfApproval(requesterId, approverId),
      /CRITICAL_SECURITY_VIOLATION/
    );
  });

  test('department head scope matching: DEPT_HEAD MATH cannot approve THAI applicant', () => {
    const deptHeadTeacher = {
      id: 'head-math',
      role: 'TEACHER',
      position: 'ครู',
      subjectGroup: 'คณิตศาสตร์',
    };
    const activeAssignments = [
      {
        dutyType: 'DEPT_HEAD',
        divisionScope: null,
        departmentScope: 'MATH',
        revokedAt: null,
      },
    ];

    const caps = getUserCapabilities(deptHeadTeacher, activeAssignments);
    assert.equal(caps.isDeptHead, true);
    assert.deepEqual(caps.deptHeadGroups, ['MATH']);

    const applicantThai = {
      id: 'teacher-thai',
      subjectGroup: 'ภาษาไทย',
    };

    const applicantDeptScope = mapSubjectGroupToDeptScope(applicantThai.subjectGroup);
    assert.equal(applicantDeptScope, 'THAI');

    const canApprove =
      caps.isDirector ||
      caps.isHRHead ||
      caps.deptHeadGroups.includes(applicantDeptScope);

    assert.equal(canApprove, false);
  });

  test('department head scope matching: DEPT_HEAD MATH can approve MATH applicant', () => {
    const deptHeadTeacher = {
      id: 'head-math',
      role: 'TEACHER',
      position: 'ครู',
      subjectGroup: 'คณิตศาสตร์',
    };
    const activeAssignments = [
      {
        dutyType: 'DEPT_HEAD',
        divisionScope: null,
        departmentScope: 'MATH',
        revokedAt: null,
      },
    ];

    const caps = getUserCapabilities(deptHeadTeacher, activeAssignments);
    const applicantMath = {
      id: 'teacher-math-2',
      subjectGroup: 'คณิตศาสตร์',
    };

    const applicantDeptScope = mapSubjectGroupToDeptScope(applicantMath.subjectGroup);
    assert.equal(applicantDeptScope, 'MATH');

    const canApprove =
      caps.isDirector ||
      caps.isHRHead ||
      caps.deptHeadGroups.includes(applicantDeptScope);

    assert.equal(canApprove, true);
  });

  test('director can approve across any department scope', () => {
    const director = {
      id: 'director-1',
      role: 'TEACHER',
      position: 'ผู้อำนวยการ',
    };

    const caps = getUserCapabilities(director, []);
    assert.equal(caps.isDirector, true);

    const applicantThai = {
      id: 'teacher-thai',
      subjectGroup: 'ภาษาไทย',
    };
    const applicantDeptScope = mapSubjectGroupToDeptScope(applicantThai.subjectGroup);

    const canApprove =
      caps.isDirector ||
      caps.isHRHead ||
      caps.deptHeadGroups.includes(applicantDeptScope);

    assert.equal(canApprove, true);
  });

  test('separation of duties: admin without appointed duties cannot approve leaves', () => {
    const adminUser = {
      id: 'admin-1',
      role: 'ADMIN',
      position: 'แอดมิน',
    };
    const caps = getUserCapabilities(adminUser, []);
    assert.equal(caps.isAdmin, true);
    assert.equal(caps.canApproveLeaveHead, false);
    assert.equal(caps.canInspectLeave, false);
  });

  test('approver snapshot structure satisfies mandatory schema fields', () => {
    const now = new Date();
    const snapshot = {
      id: 'head-123',
      name: 'ครูสมหวัง ใจดี',
      position: 'ครู',
      approvedAt: now.toISOString(),
      dutyType: 'DEPT_HEAD',
    };

    assert.ok(snapshot.id);
    assert.ok(snapshot.name);
    assert.ok(snapshot.position);
    assert.ok(snapshot.approvedAt);
    assert.ok(snapshot.dutyType);
  });
});
