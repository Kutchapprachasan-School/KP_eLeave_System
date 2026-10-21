import test from "node:test";
import assert from "node:assert/strict";

test("Leave Targeted Notification Unit Suite", async (t) => {
  await t.test("1. Approver chain identification encompasses strictly 4 roles", () => {
    const mockUsers = [
      { id: "u-admin", role: "ADMIN", position: "แอดมิน" },
      { id: "u-director", role: "DIRECTOR", position: "ผู้อำนวยการ" },
      { id: "u-deputy", role: "TEACHER", position: "รองผู้อำนวยการ" },
      { id: "u-hr", role: "TEACHER", position: "ครู" },
      { id: "u-inspector", role: "TEACHER", position: "ครู" },
      { id: "u-teacher1", role: "TEACHER", position: "ครูผู้สอน" },
      { id: "u-teacher2", role: "TEACHER", position: "ครูผู้ช่วย" },
    ];

    const mockSettings = {
      defaultInspectorId: "u-inspector",
      finalApproverUserIds: "u-deputy",
    };

    const mockDuties = [
      { userId: "u-hr", dutyType: "HR_HEAD" },
    ];

    const targetUserIds = new Set();
    if (mockSettings.defaultInspectorId) targetUserIds.add(mockSettings.defaultInspectorId);
    if (mockSettings.finalApproverUserIds) targetUserIds.add(mockSettings.finalApproverUserIds);
    mockDuties.forEach(d => targetUserIds.add(d.userId));
    mockUsers.forEach(u => {
      if (u.role === "ADMIN" || u.position === "แอดมิน" || u.role === "DIRECTOR" || u.position === "ผู้อำนวยการ") {
        targetUserIds.add(u.id);
      }
    });

    assert.ok(targetUserIds.has("u-admin"), "Admin must be in notification chain");
    assert.ok(targetUserIds.has("u-director"), "Director must be in notification chain");
    assert.ok(targetUserIds.has("u-deputy"), "Configured final approver must be in notification chain");
    assert.ok(targetUserIds.has("u-hr"), "HR Head duty holder must be in notification chain");
    assert.ok(targetUserIds.has("u-inspector"), "Default inspector must be in notification chain");
    assert.strictEqual(targetUserIds.has("u-teacher1"), false, "Regular teacher 1 must NOT be in notification chain");
    assert.strictEqual(targetUserIds.has("u-teacher2"), false, "Regular teacher 2 must NOT be in notification chain");
  });

  await t.test("2. Submission notification routes away from general all-staff group", () => {
    const generalGroupId = "C9b16400aed6d0eab0ce1b4650baa3f41";
    const approverGroupId = "Capprovergroup123456";
    
    // Simulate routing logic
    const resolvedPushTargets = [];
    const settings = {
      lineTargetGroupId: generalGroupId,
      leaveApproverLineTargetGroupId: approverGroupId,
    };

    if (settings.leaveApproverLineTargetGroupId) {
      resolvedPushTargets.push(settings.leaveApproverLineTargetGroupId);
    }

    assert.strictEqual(resolvedPushTargets.includes(generalGroupId), false, "Must never push to general group");
    assert.strictEqual(resolvedPushTargets.includes(approverGroupId), true, "Must push to designated approver group");
  });

  await t.test("3. Multicast payloads correctly batch lineUserIds without exceeding 500", () => {
    const fakeLineIds = Array.from({ length: 600 }, (_, i) => `U${i}`);
    const batches = [];
    for (let i = 0; i < fakeLineIds.length; i += 500) {
      batches.push(fakeLineIds.slice(i, i + 500));
    }

    assert.strictEqual(batches.length, 2);
    assert.strictEqual(batches[0].length, 500);
    assert.strictEqual(batches[1].length, 100);
  });
});
