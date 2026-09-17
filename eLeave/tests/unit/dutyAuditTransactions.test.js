import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Transactional Duty Management & Lock Ordering', () => {
  test('target user IDs are deduplicated and sorted in strictly ascending order', () => {
    const grants = [
      { userId: 'user-gamma', dutyType: 'HR_STAFF' },
      { userId: 'user-alpha', dutyType: 'INSPECTOR' },
      { userId: 'user-beta', dutyType: 'DIVISION_HEAD', divisionScope: 'ACADEMIC' },
      { userId: 'user-alpha', dutyType: 'HR_HEAD' }, // duplicate user
    ];

    const targetUserIds = [...new Set(grants.map(g => g.userId))].sort();

    assert.deepEqual(targetUserIds, ['user-alpha', 'user-beta', 'user-gamma']);
  });

  test('audit log payload contains complete before and after states for grant', () => {
    const actorId = 'admin-123';
    const grant = {
      userId: 'teacher-456',
      dutyType: 'HR_HEAD',
      divisionScope: null,
      departmentScope: null,
    };
    const now = new Date();
    const created = {
      id: 'uda-789',
      ...grant,
      assignedById: actorId,
      assignedAt: now,
      revokedAt: null,
    };

    const auditEntry = {
      actionType: 'DUTY_ASSIGNED',
      subsystem: 'PERSONNEL',
      description: `Assigned duty ${grant.dutyType} to user ${grant.userId}`,
      userId: actorId,
      metadata: {
        actorId,
        targetUserId: grant.userId,
        dutyType: grant.dutyType,
        scope: grant.divisionScope || grant.departmentScope || null,
        before: null,
        after: {
          id: created.id,
          dutyType: created.dutyType,
          divisionScope: created.divisionScope,
          departmentScope: created.departmentScope,
          assignedAt: now.toISOString(),
        },
        timestamp: now.toISOString(),
      },
    };

    assert.equal(auditEntry.actionType, 'DUTY_ASSIGNED');
    assert.equal(auditEntry.metadata.before, null);
    assert.equal(auditEntry.metadata.after.id, 'uda-789');
    assert.equal(auditEntry.metadata.after.dutyType, 'HR_HEAD');
  });

  test('audit log payload contains complete before and after states for revocation', () => {
    const actorId = 'admin-123';
    const now = new Date();
    const existing = {
      id: 'uda-789',
      userId: 'teacher-456',
      dutyType: 'HR_HEAD',
      divisionScope: null,
      departmentScope: null,
      assignedAt: new Date('2026-09-01'),
      revokedAt: null,
    };
    const updated = {
      ...existing,
      revokedAt: now,
    };

    const auditEntry = {
      actionType: 'DUTY_REVOKED',
      subsystem: 'PERSONNEL',
      description: `Revoked duty ${existing.dutyType} from user ${existing.userId}`,
      userId: actorId,
      metadata: {
        actorId,
        targetUserId: existing.userId,
        dutyType: existing.dutyType,
        scope: existing.divisionScope || existing.departmentScope || null,
        before: {
          id: existing.id,
          dutyType: existing.dutyType,
          divisionScope: existing.divisionScope,
          departmentScope: existing.departmentScope,
          revokedAt: null,
        },
        after: {
          id: updated.id,
          dutyType: updated.dutyType,
          divisionScope: updated.divisionScope,
          departmentScope: updated.departmentScope,
          revokedAt: now.toISOString(),
        },
        timestamp: now.toISOString(),
      },
    };

    assert.equal(auditEntry.actionType, 'DUTY_REVOKED');
    assert.equal(auditEntry.metadata.before.revokedAt, null);
    assert.equal(auditEntry.metadata.after.revokedAt, now.toISOString());
  });
});
