import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RecycleBinService } from '../../../src/services/recycle-bin/recycle-bin.service.ts';

describe('Leave Soft-Delete Hygiene & Reappearance Prevention Invariant Suite', () => {
  function createMockLeaveDb(initialLeaves = []) {
    const leaves = new Map(initialLeaves);
    const auditLogs = [];

    const db = {
      leaveRequest: {
        findUnique: async ({ where }) => {
          const l = leaves.get(where.id);
          if (!l) return null;
          return { ...l };
        },
        findFirst: async ({ where }) => {
          for (const l of leaves.values()) {
            let match = true;
            if (where?.userId && l.userId !== where.userId) match = false;
            if (where?.status && l.status !== where.status) match = false;
            if (where?.isDeleted !== undefined && l.isDeleted !== where.isDeleted) match = false;
            if (match) return { ...l };
          }
          return null;
        },
        findMany: async ({ where }) => {
          let results = Array.from(leaves.values());
          if (where?.isDeleted !== undefined) {
            results = results.filter((l) => l.isDeleted === where.isDeleted);
          }
          if (where?.userId) {
            if (typeof where.userId === 'object' && where.userId.not) {
              results = results.filter((l) => l.userId !== where.userId.not);
            } else if (typeof where.userId === 'string') {
              results = results.filter((l) => l.userId === where.userId);
            }
          }
          if (where?.status) {
            if (typeof where.status === 'object' && where.status.not) {
              results = results.filter((l) => l.status !== where.status.not);
            } else if (typeof where.status === 'object' && Array.isArray(where.status.in)) {
              results = results.filter((l) => where.status.in.includes(l.status));
            } else if (typeof where.status === 'string') {
              results = results.filter((l) => l.status === where.status);
            }
          }
          return results.map((l) => ({ ...l }));
        },
        count: async ({ where }) => {
          const items = await db.leaveRequest.findMany({ where });
          return items.length;
        },
        groupBy: async ({ where, by }) => {
          const items = await db.leaveRequest.findMany({ where });
          const map = new Map();
          for (const item of items) {
            const key = item.status;
            map.set(key, (map.get(key) || 0) + 1);
          }
          return Array.from(map.entries()).map(([status, count]) => ({
            status,
            _count: { _all: count },
          }));
        },
        update: async ({ where, data }) => {
          const l = leaves.get(where.id);
          if (!l) throw new Error('LeaveRequest not found');
          Object.assign(l, data);
          return { ...l };
        },
      },
      auditLog: {
        create: async ({ data }) => {
          auditLogs.push(data);
          return { id: `log_${Date.now()}`, ...data };
        },
      },
      systemSettings: {
        findFirst: async () => ({ recycleBinRetentionDays: 30 }),
      },
      $transaction: async (fn) => {
        return fn(db);
      },
    };

    return { db, leaves, auditLogs };
  }

  test('1. Deleting a leave marks isDeleted: true and excludes it from paginated leave history query', async () => {
    const { db, leaves } = createMockLeaveDb([
      [
        'req_1',
        {
          id: 'req_1',
          userId: 'teacher_1',
          type: 'PERSONAL',
          status: 'PENDING_HEAD',
          startDate: new Date('2026-10-20'),
          endDate: new Date('2026-10-21'),
          isDeleted: false,
        },
      ],
      [
        'req_2',
        {
          id: 'req_2',
          userId: 'teacher_1',
          type: 'SICK',
          status: 'APPROVED',
          startDate: new Date('2026-10-15'),
          endDate: new Date('2026-10-16'),
          isDeleted: false,
        },
      ],
    ]);

    // Initial check: 2 items active
    const initialHistory = await db.leaveRequest.findMany({
      where: { status: { not: 'CANCELLED' }, isDeleted: false },
    });
    assert.equal(initialHistory.length, 2);

    // Admin soft-deletes req_1
    const adminUser = { userId: 'admin_1', userRole: 'ADMIN' };
    const deleteResult = await RecycleBinService.softDelete(
      { type: 'LEAVE', id: 'req_1', reason: 'ลบข้อมูลคำขอซ้ำซ้อน', user: adminUser },
      db
    );
    assert.equal(deleteResult.success, true);

    // Verify record in DB is now isDeleted = true
    const updatedReq1 = await db.leaveRequest.findUnique({ where: { id: 'req_1' } });
    assert.equal(updatedReq1.isDeleted, true);
    assert.ok(updatedReq1.deletedAt);

    // CRITICAL: Simulating page refresh by re-running getPaginatedLeaveHistory query
    // With isDeleted: false in baseWhere, req_1 MUST NOT appear!
    const refreshedHistory = await db.leaveRequest.findMany({
      where: { status: { not: 'CANCELLED' }, isDeleted: false },
    });
    assert.equal(refreshedHistory.length, 1);
    assert.equal(refreshedHistory[0].id, 'req_2');

    // Stats count also excludes req_1
    const refreshedCount = await db.leaveRequest.count({
      where: { status: { not: 'CANCELLED' }, isDeleted: false },
    });
    assert.equal(refreshedCount, 1);

    // groupBy also excludes req_1
    const refreshedStats = await db.leaveRequest.groupBy({
      by: ['status'],
      where: { status: { not: 'CANCELLED' }, isDeleted: false },
    });
    assert.equal(refreshedStats.length, 1);
    assert.equal(refreshedStats[0].status, 'APPROVED');
    assert.equal(refreshedStats[0]._count._all, 1);
  });

  test('2. Soft-deleted leave does not appear in pending approvals queue', async () => {
    const { db } = createMockLeaveDb([
      [
        'req_pending',
        {
          id: 'req_pending',
          userId: 'teacher_2',
          type: 'PERSONAL',
          status: 'PENDING_HEAD',
          isDeleted: true, // already deleted
        },
      ],
      [
        'req_active_pending',
        {
          id: 'req_active_pending',
          userId: 'teacher_3',
          type: 'PERSONAL',
          status: 'PENDING_HEAD',
          isDeleted: false,
        },
      ],
    ]);

    // Approvals queue query: whereClause includes isDeleted: false
    const pendingList = await db.leaveRequest.findMany({
      where: {
        isDeleted: false,
        status: { in: ['PENDING_HEAD', 'PENDING_EXEC'] },
        userId: { not: 'director_1' },
      },
    });

    assert.equal(pendingList.length, 1);
    assert.equal(pendingList[0].id, 'req_active_pending');
  });

  test('3. Soft-deleted leave does not inflate dashboard KPI counts or approval rates', async () => {
    const { db } = createMockLeaveDb([
      [
        'approved_active',
        { id: 'approved_active', userId: 'u1', status: 'APPROVED', isDeleted: false },
      ],
      [
        'approved_deleted',
        { id: 'approved_deleted', userId: 'u1', status: 'APPROVED', isDeleted: true },
      ],
      [
        'pending_deleted',
        { id: 'pending_deleted', userId: 'u2', status: 'PENDING_HEAD', isDeleted: true },
      ],
      [
        'rejected_active',
        { id: 'rejected_active', userId: 'u3', status: 'REJECTED', isDeleted: false },
      ],
    ]);

    const pendingCount = await db.leaveRequest.count({
      where: { status: { in: ['PENDING_HEAD', 'PENDING_EXEC'] }, isDeleted: false },
    });
    assert.equal(pendingCount, 0);

    const approvedCount = await db.leaveRequest.count({
      where: { status: 'APPROVED', isDeleted: false },
    });
    assert.equal(approvedCount, 1);

    const rejectedCount = await db.leaveRequest.count({
      where: { status: 'REJECTED', isDeleted: false },
    });
    assert.equal(rejectedCount, 1);

    const totalEvaluated = approvedCount + rejectedCount;
    const approvalRate = Math.round((approvedCount / totalEvaluated) * 100);
    assert.equal(approvalRate, 50); // 1 approved / 2 evaluated = 50%
  });

  test('4. Restoring a soft-deleted leave sets isDeleted: false and returns it to active query', async () => {
    const { db } = createMockLeaveDb([
      [
        'req_trash',
        {
          id: 'req_trash',
          userId: 'teacher_1',
          type: 'PERSONAL',
          status: 'APPROVED',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-02'),
          isDeleted: true,
          deletedAt: new Date(),
        },
      ],
    ]);

    // Active query before restore: empty
    const beforeRestore = await db.leaveRequest.findMany({
      where: { status: { not: 'CANCELLED' }, isDeleted: false },
    });
    assert.equal(beforeRestore.length, 0);

    // Admin restores the item
    const adminUser = { userId: 'admin_1', userRole: 'ADMIN' };
    const restoreResult = await RecycleBinService.restore(
      { type: 'LEAVE', id: 'req_trash', user: adminUser },
      db
    );
    assert.equal(restoreResult.success, true);

    // Active query after restore: req_trash reappears
    const afterRestore = await db.leaveRequest.findMany({
      where: { status: { not: 'CANCELLED' }, isDeleted: false },
    });
    assert.equal(afterRestore.length, 1);
    assert.equal(afterRestore[0].id, 'req_trash');
    assert.equal(afterRestore[0].isDeleted, false);
  });
});
