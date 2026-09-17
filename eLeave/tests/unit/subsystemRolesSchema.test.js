import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export const VALID_DIVISIONS = ['ACADEMIC', 'PERSONNEL', 'GENERAL', 'BUDGET'];

export const VALID_DEPTS = [
  'THAI', 'MATH', 'SCIENCE', 'FOREIGN_LANG',
  'SOCIAL', 'HEALTH_PE', 'ART', 'CAREER', 'STUDENT_DEV'
];

export const VALID_DUTIES = [
  'INSPECTOR', 'HR_HEAD', 'HR_STAFF', 'DIVISION_HEAD', 'DEPT_HEAD'
];

describe('Subsystem Roles Schema & Domain Types', () => {
  test('validates division domain allowlist strictly', () => {
    assert.equal(VALID_DIVISIONS.length, 4);
    assert.ok(VALID_DIVISIONS.includes('ACADEMIC'));
    assert.ok(VALID_DIVISIONS.includes('PERSONNEL'));
    assert.ok(VALID_DIVISIONS.includes('GENERAL'));
    assert.ok(VALID_DIVISIONS.includes('BUDGET'));
  });

  test('validates 8+1 learning areas allowlist strictly', () => {
    assert.equal(VALID_DEPTS.length, 9);
    assert.ok(VALID_DEPTS.includes('THAI'));
    assert.ok(VALID_DEPTS.includes('MATH'));
    assert.ok(VALID_DEPTS.includes('SCIENCE'));
    assert.ok(VALID_DEPTS.includes('FOREIGN_LANG'));
    assert.ok(VALID_DEPTS.includes('SOCIAL'));
    assert.ok(VALID_DEPTS.includes('HEALTH_PE'));
    assert.ok(VALID_DEPTS.includes('ART'));
    assert.ok(VALID_DEPTS.includes('CAREER'));
    assert.ok(VALID_DEPTS.includes('STUDENT_DEV'));
  });

  test('validates duty types allowlist strictly', () => {
    assert.equal(VALID_DUTIES.length, 5);
    assert.ok(VALID_DUTIES.includes('INSPECTOR'));
    assert.ok(VALID_DUTIES.includes('HR_HEAD'));
    assert.ok(VALID_DUTIES.includes('HR_STAFF'));
    assert.ok(VALID_DUTIES.includes('DIVISION_HEAD'));
    assert.ok(VALID_DUTIES.includes('DEPT_HEAD'));
  });

  test('enforces bi-directional scope validity logic matching DB check constraint', () => {
    function isValidScopeCombination(dutyType, divisionScope, departmentScope) {
      if (dutyType === 'DIVISION_HEAD') {
        return divisionScope !== null && departmentScope === null;
      }
      if (dutyType === 'DEPT_HEAD') {
        return departmentScope !== null && divisionScope === null;
      }
      if (['INSPECTOR', 'HR_HEAD', 'HR_STAFF'].includes(dutyType)) {
        return divisionScope === null && departmentScope === null;
      }
      return false;
    }

    assert.equal(isValidScopeCombination('DIVISION_HEAD', 'ACADEMIC', null), true);
    assert.equal(isValidScopeCombination('DIVISION_HEAD', null, 'MATH'), false);
    assert.equal(isValidScopeCombination('DIVISION_HEAD', 'ACADEMIC', 'MATH'), false);

    assert.equal(isValidScopeCombination('DEPT_HEAD', null, 'MATH'), true);
    assert.equal(isValidScopeCombination('DEPT_HEAD', 'ACADEMIC', null), false);
    assert.equal(isValidScopeCombination('DEPT_HEAD', 'ACADEMIC', 'MATH'), false);

    assert.equal(isValidScopeCombination('INSPECTOR', null, null), true);
    assert.equal(isValidScopeCombination('INSPECTOR', 'ACADEMIC', null), false);
    assert.equal(isValidScopeCombination('HR_HEAD', null, null), true);
    assert.equal(isValidScopeCombination('HR_HEAD', null, 'MATH'), false);
    assert.equal(isValidScopeCombination('HR_STAFF', null, null), true);
  });
});
