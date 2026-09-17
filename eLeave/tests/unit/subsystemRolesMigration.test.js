import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmbiguityResolutions, planMigration } from '../../../src/lib/roles-migration.ts';

describe('Idempotent Migration Engine', () => {
  test('validates ambiguous resolution allowlist strictly', () => {
    assert.throws(() => parseAmbiguityResolutions('u1:InvalidPosition'), /Invalid position/);
    const valid = parseAmbiguityResolutions('u1:ครู,u2:ลูกจ้างประจำ');
    assert.equal(valid.u1, 'ครู');
    assert.equal(valid.u2, 'ลูกจ้างประจำ');
  });

  test('normalizes หัวหน้างานบุคคล and ผู้ตรวจสอบ to ครู and creates duties', () => {
    const users = [
      { id: 'u1', position: 'หัวหน้างานบุคคล' },
      { id: 'u2', position: 'ผู้ตรวจสอบ' },
      { id: 'u3', position: 'ครู' } // regular, ignored
    ];
    const plan = planMigration(users, []);
    assert.equal(plan.summary.migrated, 2);
    assert.equal(plan.summary.ambiguous, 0);
    assert.equal(plan.summary.skipped, 0);

    const posAction1 = plan.actions.find(a => a.action === 'NORMALIZE_POSITION' && a.userId === 'u1');
    assert.equal(posAction1.newPosition, 'ครู');
    const posAction2 = plan.actions.find(a => a.action === 'NORMALIZE_POSITION' && a.userId === 'u2');
    assert.equal(posAction2.newPosition, 'ครู');
  });

  test('flags ambiguous staff when unresolved and resolves with resolution map', () => {
    const users = [{ id: 'u3', position: 'เจ้าหน้าที่บุคคล' }];
    const planUnresolved = planMigration(users, []);
    assert.equal(planUnresolved.summary.ambiguous, 1);
    assert.equal(planUnresolved.summary.migrated, 0);

    const planResolved = planMigration(users, [], { u3: 'เจ้าหน้าที่' });
    assert.equal(planResolved.summary.ambiguous, 0);
    assert.equal(planResolved.summary.migrated, 1);
  });

  test('is idempotent: skips users already having active assignment', () => {
    const users = [{ id: 'u1', position: 'หัวหน้างานบุคคล' }];
    const existing = [{ userId: 'u1', dutyType: 'HR_HEAD', revokedAt: null }];
    const plan = planMigration(users, existing);
    assert.equal(plan.summary.skipped, 1);
    assert.equal(plan.summary.migrated, 0);
  });
});
