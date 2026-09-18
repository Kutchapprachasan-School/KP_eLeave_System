import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUserEligibleForAppointedDuty,
  AcademicStandingSchema,
  VALID_ACADEMIC_STANDINGS,
  ELIGIBLE_APPOINTEE_POSITIONS,
  validateSubjectGroupNotLegacy,
} from '../../../src/lib/permissions.ts';

describe('Appointee Eligibility & Canonical Invariants', () => {
  test('rejects unapproved users (isApproved: false)', () => {
    const user = {
      id: 'u-1',
      name: 'สมชาย ใจดี',
      position: 'ครู',
      isApproved: false,
    };
    assert.equal(isUserEligibleForAppointedDuty(user), false);
  });

  test('rejects users with empty or whitespace-only name', () => {
    const user1 = {
      id: 'u-2',
      name: '',
      position: 'ครู',
      isApproved: true,
    };
    const user2 = {
      id: 'u-3',
      name: '   ',
      position: 'ครู',
      isApproved: true,
    };
    assert.equal(isUserEligibleForAppointedDuty(user1), false);
    assert.equal(isUserEligibleForAppointedDuty(user2), false);
  });

  test('rejects non-teaching and non-executive positions', () => {
    const ineligiblePositions = [
      'ลูกจ้างประจำ',
      'ลูกจ้างชั่วคราว',
      'นักเรียน',
      'นักศึกษาฝึกประสบการณ์',
      'พนักงานบริการ',
      'ภารโรง',
      'บุคคลภายนอก',
    ];

    for (const pos of ineligiblePositions) {
      const user = {
        id: `u-${pos}`,
        name: 'ทดสอบ',
        position: pos,
        isApproved: true,
      };
      assert.equal(
        isUserEligibleForAppointedDuty(user),
        false,
        `Expected position "${pos}" to be ineligible for appointed duties`
      );
    }
  });

  test('accepts active civil-service teaching and executive positions', () => {
    for (const pos of ELIGIBLE_APPOINTEE_POSITIONS) {
      const user = {
        id: `u-${pos}`,
        name: 'ครูทดสอบ สมมุติ',
        position: pos,
        isApproved: true,
      };
      assert.equal(
        isUserEligibleForAppointedDuty(user),
        true,
        `Expected position "${pos}" with isApproved: true to be eligible`
      );
    }
  });

  test('deduplication safety across candidate list', () => {
    const candidates = [
      { id: 'u-1', name: 'ครูสมชาย', position: 'ครู', isApproved: true },
      { id: 'u-2', name: 'ครูสมศรี', position: 'ครูผู้ช่วย', isApproved: true },
      { id: 'u-1', name: 'ครูสมชาย', position: 'ครู', isApproved: true },
      { id: 'u-3', name: 'ภารโรงสมบัติ', position: 'ลูกจ้างชั่วคราว', isApproved: true },
    ];

    const eligible = candidates.filter(isUserEligibleForAppointedDuty);
    const uniqueIds = new Set(eligible.map(u => u.id));
    const deduplicated = Array.from(uniqueIds).map(id => eligible.find(u => u.id === id));

    assert.equal(deduplicated.length, 2);
    assert.deepEqual(deduplicated.map(u => u.id).sort(), ['u-1', 'u-2']);
  });
});

describe('Academic Standing Schema Validation (ก.ค.ศ.)', () => {
  test('valid pure academic standings pass validation', () => {
    for (const standing of VALID_ACADEMIC_STANDINGS) {
      const parsed = AcademicStandingSchema.parse(standing);
      assert.equal(parsed, standing);
    }
  });

  test('empty, null, or whitespace values normalize to null', () => {
    assert.equal(AcademicStandingSchema.parse(null), null);
    assert.equal(AcademicStandingSchema.parse(''), null);
    assert.equal(AcademicStandingSchema.parse('   '), null);
    assert.equal(AcademicStandingSchema.parse(undefined), undefined);
  });

  test('rejects civil service positions in level field (ครูผู้ช่วย, ครู, etc.)', () => {
    assert.throws(
      () => AcademicStandingSchema.parse('ครูผู้ช่วย'),
      /วิทยฐานะต้องเป็นค่าตามมาตรฐาน ก\.ค\.ศ\./
    );
    assert.throws(
      () => AcademicStandingSchema.parse('ครู'),
      /วิทยฐานะต้องเป็นค่าตามมาตรฐาน ก\.ค\.ศ\./
    );
    assert.throws(
      () => AcademicStandingSchema.parse('ผู้อำนวยการ'),
      /วิทยฐานะต้องเป็นค่าตามมาตรฐาน ก\.ค\.ศ\./
    );
  });

  test('rejects legacy concatenated position+level strings', () => {
    assert.throws(() => AcademicStandingSchema.parse('ครูชำนาญการ'));
    assert.throws(() => AcademicStandingSchema.parse('ครูชำนาญการพิเศษ'));
    assert.throws(() => AcademicStandingSchema.parse('ผู้อำนวยการชำนาญการพิเศษ'));
    assert.throws(() => AcademicStandingSchema.parse('รองผู้อำนวยการชำนาญการ'));
  });
});

describe('Anti-Legacy SubjectGroup Validation', () => {
  test('valid department and executive subject groups pass', () => {
    assert.doesNotThrow(() => validateSubjectGroupNotLegacy('วิทยาศาสตร์และเทคโนโลยี'));
    assert.doesNotThrow(() => validateSubjectGroupNotLegacy('คณิตศาสตร์'));
    assert.doesNotThrow(() => validateSubjectGroupNotLegacy('ผู้อำนวยการโรงเรียน'));
    assert.doesNotThrow(() => validateSubjectGroupNotLegacy('รองผู้อำนวยการโรงเรียน'));
    assert.doesNotThrow(() => validateSubjectGroupNotLegacy(null));
    assert.doesNotThrow(() => validateSubjectGroupNotLegacy(undefined));
  });

  test('rejects legacy แอดมิน / ... strings', () => {
    assert.throws(() => validateSubjectGroupNotLegacy('แอดมิน / ผู้บริหาร'), /กลุ่มสาระ\/ฝ่ายงานไม่สามารถใช้ชื่อแอดมินนำหน้าได้/);
    assert.throws(() => validateSubjectGroupNotLegacy('แอดมิน / ผู้อำนวยการ'), /กลุ่มสาระ\/ฝ่ายงานไม่สามารถใช้ชื่อแอดมินนำหน้าได้/);
    assert.throws(() => validateSubjectGroupNotLegacy('แอดมิน / บุคลากร'), /กลุ่มสาระ\/ฝ่ายงานไม่สามารถใช้ชื่อแอดมินนำหน้าได้/);
  });
});
