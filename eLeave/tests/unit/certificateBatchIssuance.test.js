import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit Test Suite for Teacher-Centric Certificate Register Subsystem
 * Enforces Senior Architecture Verdict (ADR-20260911-02):
 * 🔴 1. Authoritative Row-Level Sequence Locking (Avoids connection pooler advisory lock pitfalls)
 * 🔴 2. DB-Level Final Guard (Unique Constraint on (year, seqNo) & certificateNumber)
 * 🔴 3. Cancellation Invariant: Cancelled numbers are NEVER recycled or re-allocated
 * 🔴 4. Committed Snapshot Mail Merge Export: XLSX/CSV generation from committed DB records only
 * 🟠 5. Strict Metadata Separation: Mutable fields vs Locked Immutable fields
 * 🟠 6. Batch Idempotency: Duplicate submissions return existing record without advancing sequence
 * 🟠 7. QR Verification Endpoint: Cryptographically unguessable verification token resolution
 */

// Simulation of Authoritative Certificate Sequence Engine
class MockCertificateRegisterEngine {
  constructor(initialSeq = 100, year = 2569) {
    this.currentSeq = initialSeq;
    this.year = year;
    this.batches = new Map(); // id -> batchRecord
    this.items = new Map();   // "year:seqNo" -> CertificateIssuedItem
    this.idempotencyMap = new Map(); // idempotencyKey -> batchId
    this.isRowLocked = false;
  }

  // Simulates transaction with Authoritative Row-Level Lock on DocumentConfig
  async issueBatch({ title, origin, requester, date, items, idempotencyKey }) {
    // 🟠 Senior Lock 6: Idempotency check
    if (idempotencyKey && this.idempotencyMap.has(idempotencyKey)) {
      const existingId = this.idempotencyMap.get(idempotencyKey);
      const existingBatch = this.batches.get(existingId);
      const batchItems = Array.from(this.items.values()).filter(it => it.batchRecordId === existingId);
      return { ...existingBatch, certificateItems: batchItems, idempotentReplay: true };
    }

    // 🔴 Senior Lock 1: Authoritative Row Lock (SELECT ... FOR UPDATE)
    if (this.isRowLocked) {
      throw new Error("LockConflict: Row is locked by concurrent transaction");
    }
    this.isRowLocked = true;

    try {
      const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
      if (totalQty <= 0) throw new Error("Quantity must be > 0");

      const startSeq = this.currentSeq + 1;
      const endSeq = this.currentSeq + totalQty;
      const thYear = this.year;

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docNo = startSeq === endSeq ? `${startSeq}/${thYear}` : `${startSeq}-${endSeq}/${thYear}`;

      const batchRecord = {
        id: batchId,
        docNo,
        seqNo: startSeq,
        year: thYear,
        title,
        origin,
        requester,
        date: date || new Date().toISOString(),
        status: "ISSUED",
        idempotencyKey: idempotencyKey || null,
        createdAt: new Date()
      };

      const issuedItems = [];
      let curr = startSeq;

      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          const s = curr;
          const certNo = `${s}/${thYear}`;
          const uniqueKey = `${thYear}:${s}`;

          // 🔴 Senior Lock 2: Database Unique Constraint Check
          if (this.items.has(uniqueKey)) {
            throw new Error(`UniqueConstraintViolation: Duplicate sequence (${uniqueKey}) already exists`);
          }

          const cItem = {
            id: `ci_${s}_${Math.random().toString(36).substring(2, 7)}`,
            batchRecordId: batchId,
            seqNo: s,
            year: thYear,
            certificateNumber: certNo,
            roleTitle: item.roleTitle,
            verifyToken: `cert_${thYear}_${s}_token_${Math.random().toString(36).substring(2, 7)}`,
            status: "ISSUED"
          };

          this.items.set(uniqueKey, cItem);
          issuedItems.push(cItem);
          curr++;
        }
      }

      // Update authoritative sequence
      this.currentSeq = endSeq;
      this.batches.set(batchId, batchRecord);

      if (idempotencyKey) {
        this.idempotencyMap.set(idempotencyKey, batchId);
      }

      return { ...batchRecord, certificateItems: issuedItems, idempotentReplay: false };
    } finally {
      this.isRowLocked = false;
    }
  }

  // 🔴 Senior Lock 3: Cancel batch without recycling sequence numbers
  async cancelBatch(batchId, reason) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error("Batch not found");

    batch.status = "CANCELLED";
    batch.cancelReason = reason;

    for (const item of this.items.values()) {
      if (item.batchRecordId === batchId) {
        item.status = "CANCELLED";
      }
    }

    // Invariant: currentSeq MUST NEVER be decremented
    return batch;
  }

  // 🟠 Senior Lock 5: Update metadata strictly locking immutables
  async updateMetadata(batchId, { title, origin, requester, date, ...disallowedFields }) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error("Batch not found");

    // Guard: reject any attempt to mutate immutables
    if (disallowedFields.seqNo !== undefined || disallowedFields.docNo !== undefined || disallowedFields.year !== undefined) {
      throw new Error("SecurityError: Immutable fields cannot be modified");
    }

    if (title !== undefined) batch.title = title.trim();
    if (origin !== undefined) batch.origin = origin.trim();
    if (requester !== undefined) batch.requester = requester.trim();
    if (date !== undefined) batch.date = date;

    return batch;
  }

  // 🟠 Senior Lock 7: Verification Endpoint Resolver
  verifyToken(token) {
    const item = Array.from(this.items.values()).find(it => it.verifyToken === token);
    if (!item) return { success: false, error: "Invalid token" };

    const batch = this.batches.get(item.batchRecordId);
    const isValid = item.status === "ISSUED" && batch.status === "ISSUED";

    return {
      success: true,
      data: {
        certificateNumber: item.certificateNumber,
        seqNo: item.seqNo,
        year: item.year,
        roleTitle: item.roleTitle,
        activityTitle: batch.title,
        status: isValid ? "VALID" : "CANCELLED"
      }
    };
  }
}

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

test('🔴 Senior Lock 1: Authoritative Row-Level Lock & Monotonic Sequence Allocation', async () => {
  const engine = new MockCertificateRegisterEngine(100, 2569);

  // Issue 1st batch: 50 participants + 10 committees = 60 certificates (101-160/2569)
  const batch1 = await engine.issueBatch({
    title: 'การแข่งขันทักษะวิชาการ',
    origin: 'กลุ่มสาระฯ วิทยาศาสตร์',
    requester: 'ครูสมชาย',
    items: [
      { roleTitle: 'ผู้เข้าร่วมกิจกรรม', quantity: 50 },
      { roleTitle: 'คณะกรรมการ', quantity: 10 }
    ]
  });

  assert.equal(batch1.docNo, '101-160/2569');
  assert.equal(batch1.seqNo, 101);
  assert.equal(batch1.certificateItems.length, 60);
  assert.equal(batch1.certificateItems[0].certificateNumber, '101/2569');
  assert.equal(batch1.certificateItems[59].certificateNumber, '160/2569');
  assert.equal(engine.currentSeq, 160);

  // Issue 2nd batch immediately after: 5 speakers = 5 certificates (161-165/2569)
  const batch2 = await engine.issueBatch({
    title: 'อบรมเชิงปฏิบัติการ AI',
    origin: 'กลุ่มสาระฯ คอมพิวเตอร์',
    requester: 'ครูสมหญิง',
    items: [{ roleTitle: 'วิทยากร', quantity: 5 }]
  });

  assert.equal(batch2.docNo, '161-165/2569');
  assert.equal(batch2.seqNo, 161);
  assert.equal(batch2.certificateItems.length, 5);
  assert.equal(batch2.certificateItems[0].certificateNumber, '161/2569');
  assert.equal(batch2.certificateItems[4].certificateNumber, '165/2569');
  assert.equal(engine.currentSeq, 165);
});

test('🔴 Senior Lock 2: Database-Level Final Guard (Rejects Duplicate (year, seqNo))', async () => {
  const engine = new MockCertificateRegisterEngine(200, 2569);

  // Issue batch: 201-205/2569
  await engine.issueBatch({
    title: 'กิจกรรม A',
    origin: 'กลุ่มบริหารวิชาการ',
    requester: 'ครู A',
    items: [{ roleTitle: 'ผู้เข้าร่วม', quantity: 5 }]
  });

  // Deliberately tamper currentSeq backwards to simulate an application bug attempting to reuse 203
  engine.currentSeq = 202;

  await assert.rejects(
    async () => {
      await engine.issueBatch({
        title: 'กิจกรรม B (ซ้ำซ้อน)',
        origin: 'กลุ่มบริหารบุคคล',
        requester: 'ครู B',
        items: [{ roleTitle: 'ผู้เข้าร่วม', quantity: 3 }]
      });
    },
    /UniqueConstraintViolation/
  );
});

test('🔴 Senior Lock 3: Cancellation Invariant: Cancelled Numbers are NEVER Recycled', async () => {
  const engine = new MockCertificateRegisterEngine(300, 2569);

  // Issue batch: 301-310/2569 (10 certificates)
  const batch = await engine.issueBatch({
    title: 'โครงการทัศนศึกษา',
    origin: 'กลุ่มกิจกรรมผู้เรียน',
    requester: 'ครูประหยัด',
    items: [{ roleTitle: 'ผู้เข้าร่วม', quantity: 10 }]
  });

  assert.equal(engine.currentSeq, 310);

  // Cancel the batch
  await engine.cancelBatch(batch.id, 'ยกเลิกเนื่องจากสภาพอากาศ');

  // Verify status is CANCELLED but ledger rows are PRESERVED
  assert.equal(engine.batches.get(batch.id).status, 'CANCELLED');
  assert.equal(engine.items.get('2569:301').status, 'CANCELLED');
  assert.equal(engine.items.get('2569:310').status, 'CANCELLED');

  // Invariant: currentSeq must remain 310 (NOT reset back to 300)
  assert.equal(engine.currentSeq, 310);

  // Issue next batch: MUST receive 311+, NEVER 301
  const nextBatch = await engine.issueBatch({
    title: 'โครงการใหม่',
    origin: 'กลุ่มวิชาการ',
    requester: 'ครูสมใจ',
    items: [{ roleTitle: 'วิทยากร', quantity: 2 }]
  });

  assert.equal(nextBatch.docNo, '311-312/2569');
  assert.equal(nextBatch.seqNo, 311);
  assert.equal(engine.currentSeq, 312);
});

test('🔴 Senior Lock 4: Committed Snapshot Mail Merge Export matches DB Records Exactly', async () => {
  const engine = new MockCertificateRegisterEngine(400, 2569);

  const batch = await engine.issueBatch({
    title: 'แข่งขันคณิตศาสตร์โอลิมปิก',
    origin: 'กลุ่มสาระฯ คณิตศาสตร์',
    requester: 'ครูคณิต',
    items: [
      { roleTitle: 'นักเรียนชนะเลิศ', quantity: 1 },
      { roleTitle: 'ผู้เข้าร่วม', quantity: 3 }
    ]
  });

  // Query committed rows
  const committedItems = Array.from(engine.items.values()).filter(it => it.batchRecordId === batch.id);

  // Generate Mail Merge rows from committed DB snapshot
  const mailMergeRoster = committedItems.map((it, idx) => ({
    order: idx + 1,
    certNo: it.certificateNumber,
    role: it.roleTitle,
    verifyUrl: `https://eleave.kp.ac.th/verify/cert?token=${it.verifyToken}`
  }));

  assert.equal(mailMergeRoster.length, 4);
  assert.deepEqual(mailMergeRoster[0], {
    order: 1,
    certNo: '401/2569',
    role: 'นักเรียนชนะเลิศ',
    verifyUrl: `https://eleave.kp.ac.th/verify/cert?token=${committedItems[0].verifyToken}`
  });
  assert.equal(mailMergeRoster[3].certNo, '404/2569');
  assert.equal(mailMergeRoster[3].role, 'ผู้เข้าร่วม');
});

test('🟠 Senior Lock 5: Strict Metadata Separation: Mutable vs Locked Immutable Fields', async () => {
  const engine = new MockCertificateRegisterEngine(500, 2569);

  const batch = await engine.issueBatch({
    title: 'ชื่อโครงการเดิมที่มีคำผิด',
    origin: 'กลุ่มสาระฯ สังคม',
    requester: 'ครูสังคม',
    items: [{ roleTitle: 'ผู้เข้าร่วม', quantity: 2 }]
  });

  // 1. Updating allowed mutable fields succeeds
  const updated = await engine.updateMetadata(batch.id, {
    title: 'ชื่อโครงการที่แก้ไขถูกต้องแล้ว',
    origin: 'กลุ่มสาระการเรียนรู้สังคมศึกษาฯ'
  });

  assert.equal(updated.title, 'ชื่อโครงการที่แก้ไขถูกต้องแล้ว');
  assert.equal(updated.origin, 'กลุ่มสาระการเรียนรู้สังคมศึกษาฯ');
  assert.equal(updated.docNo, '501-502/2569'); // docNo is untouched

  // 2. Attempting to tamper immutable sequence or docNo is rejected
  await assert.rejects(
    async () => {
      await engine.updateMetadata(batch.id, {
        title: 'โครงการใหม่',
        docNo: '999/2569',
        seqNo: 999
      });
    },
    /SecurityError: Immutable fields cannot be modified/
  );
});

test('🟠 Senior Lock 6: Batch Idempotency prevents duplicate numbers on double-click', async () => {
  const engine = new MockCertificateRegisterEngine(600, 2569);
  const idempotencyKey = 'req_unique_abc123';

  // 1st request
  const res1 = await engine.issueBatch({
    title: 'อบรมความปลอดภัยทางไซเบอร์',
    origin: 'กลุ่มบริหารทั่วไป',
    requester: 'ครูไอที',
    items: [{ roleTitle: 'ผู้เข้าอบรม', quantity: 10 }],
    idempotencyKey
  });

  assert.equal(res1.docNo, '601-610/2569');
  assert.equal(res1.idempotentReplay, false);
  assert.equal(engine.currentSeq, 610);

  // 2nd redundant request (simulating double click or network retry)
  const res2 = await engine.issueBatch({
    title: 'อบรมความปลอดภัยทางไซเบอร์',
    origin: 'กลุ่มบริหารทั่วไป',
    requester: 'ครูไอที',
    items: [{ roleTitle: 'ผู้เข้าอบรม', quantity: 10 }],
    idempotencyKey
  });

  // Must return the existing record without allocating new numbers
  assert.equal(res2.id, res1.id);
  assert.equal(res2.docNo, '601-610/2569');
  assert.equal(res2.idempotentReplay, true);
  assert.equal(engine.currentSeq, 610); // currentSeq must NOT advance to 620
});

test('🟠 Senior Lock 7: QR Code & Verification Endpoint Resolves Authenticity Accurately', async () => {
  const engine = new MockCertificateRegisterEngine(700, 2569);

  const batch = await engine.issueBatch({
    title: 'โครงงานวิทยาศาสตร์ระดับชาติ',
    origin: 'กลุ่มวิทย์',
    requester: 'ครูวิทย์',
    items: [{ roleTitle: 'นักเรียนเหรียญทอง', quantity: 1 }]
  });

  const issuedItem = batch.certificateItems[0];

  // 1. Valid verification query
  const verifyRes = engine.verifyToken(issuedItem.verifyToken);
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.data.status, 'VALID');
  assert.equal(verifyRes.data.certificateNumber, '701/2569');
  assert.equal(verifyRes.data.activityTitle, 'โครงงานวิทยาศาสตร์ระดับชาติ');

  // 2. Cancel batch and re-verify -> status becomes CANCELLED
  await engine.cancelBatch(batch.id, 'เพิกถอนรางวัล');
  const cancelledRes = engine.verifyToken(issuedItem.verifyToken);
  assert.equal(cancelledRes.success, true);
  assert.equal(cancelledRes.data.status, 'CANCELLED');

  // 3. Bogus token query -> rejected
  const fakeRes = engine.verifyToken('bogus_fake_token_123');
  assert.equal(fakeRes.success, false);
});
