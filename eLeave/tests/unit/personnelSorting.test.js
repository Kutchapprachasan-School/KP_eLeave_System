const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  POSITION_RANK,
  ACADEMIC_LEVEL_SCORES,
  getAcademicLevelScore,
  normalizePosition,
  getPersonnelTier,
  normalizeThaiName,
  comparePersonnelDeterministic,
  sanitizeFontSize,
  FONT_MIN,
  FONT_MAX,
  FONT_DEFAULT
} = require("../../../src/lib/report-export.ts");

describe("Personnel Deterministic Sorting & Sanitization (Stream A Invariants)", () => {
  describe("A1. Official Rank Priority vs Academic Level", () => {
    test("Position rank MUST take precedence over academic level: Director ranks above Teacher regardless of level", () => {
      const directorNormal = {
        userId: "u_dir",
        userName: "นายสมชาย ยิ่งยศ",
        position: "ผู้อำนวยการ",
        level: "",
        subjectGroup: "ผู้อำนวยการ / ผู้บริหาร",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const teacherExpert = {
        userId: "u_teach",
        userName: "นายทรงคุณ เชี่ยวชาญ",
        position: "ครู",
        level: "เชี่ยวชาญ", // Level 5
        subjectGroup: "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      // Director MUST rank higher (compare < 0) than Teacher even if Teacher has high academic level
      const cmp = comparePersonnelDeterministic(directorNormal, teacherExpert);
      assert.ok(cmp < 0, "Director (Rank 1) must sort before Teacher (Rank 3) regardless of academic level");
    });

    test("Deputy Director ranks above Teacher and Assistant Teacher", () => {
      const deputy = {
        userId: "u_deputy",
        userName: "นางสาวปราณี ช่วยงาน",
        position: "รองผู้อำนวยการ",
        level: "ชำนาญการพิเศษ",
        subjectGroup: "ผู้อำนวยการ / ผู้บริหาร",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const teacher = {
        userId: "u_teacher",
        userName: "นางสาวกานดา สอนดี",
        position: "ครู",
        level: "เชี่ยวชาญพิเศษ",
        subjectGroup: "กลุ่มสาระการเรียนรู้ภาษาไทย",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const cmp = comparePersonnelDeterministic(deputy, teacher);
      assert.ok(cmp < 0, "Deputy Director (Rank 2) must sort before Teacher (Rank 3)");
    });

    test("Teacher ranks above Assistant Teacher within Tier 1", () => {
      const teacher = {
        userId: "u_teach",
        userName: "นายเอกชัย สอนดี",
        position: "ครู",
        level: "ชำนาญการ",
        subjectGroup: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const assistantTeacher = {
        userId: "u_asst",
        userName: "นายสมศักดิ์ เริ่มต้น",
        position: "ครูผู้ช่วย",
        level: "ครูผู้ช่วย",
        subjectGroup: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const cmp = comparePersonnelDeterministic(teacher, assistantTeacher);
      assert.ok(cmp < 0, "Teacher (Rank 3) must sort before Assistant Teacher (Rank 4)");
    });

    test("Within the SAME position rank, academic level breaks the tie (High -> Low)", () => {
      const teacherSpecialist = {
        userId: "u_teach_spec",
        userName: "นายเชี่ยวชาญ สดใส",
        position: "ครู",
        level: "เชี่ยวชาญพิเศษ", // Score 6
        subjectGroup: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const teacherSenior = {
        userId: "u_teach_sen",
        userName: "นายกิตติ มานะ",
        position: "ครู",
        level: "ชำนาญการพิเศษ", // Score 4
        subjectGroup: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const cmp = comparePersonnelDeterministic(teacherSpecialist, teacherSenior);
      assert.ok(cmp < 0, "Higher academic level (Specialist 6) must sort before lower (Senior 4) within same position");
    });
  });

  describe("A2. Thai Name Prefix Normalization", () => {
    test("Strips common Thai prefixes (นาย, นาง, นางสาว, ดร., ว่าที่ร้อยตรี, etc.)", () => {
      assert.equal(normalizeThaiName("นายกิตติ"), "กิตติ");
      assert.equal(normalizeThaiName("นางสมศรี"), "สมศรี");
      assert.equal(normalizeThaiName("นางสาวกาญจนา"), "กาญจนา");
      assert.equal(normalizeThaiName("ว่าที่ร้อยตรี นพดล"), "นพดล");
      assert.equal(normalizeThaiName("ว่าที่ ร.ต. นพดล"), "นพดล");
      assert.equal(normalizeThaiName("ดร. สมชาย"), "สมชาย");
      assert.equal(normalizeThaiName("ผศ. วิโรจน์"), "วิโรจน์");
    });

    test("Sorts by actual first name rather than title prefix", () => {
      // "นางสาวกาญจนา" (starts with ก) should sort BEFORE "นายกิตติ" (ก + ิ) -> กา comes before กิ
      // If prefix is not stripped, "นางสาว" (น) vs "นาย" (น) would compare differently
      const user1 = {
        userId: "u1",
        userName: "นางสาวกาญจนา สุขใจ",
        position: "ครู",
        level: "ชำนาญการ",
        subjectGroup: "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const user2 = {
        userId: "u2",
        userName: "นายกิตติ ตั้งใจ",
        position: "ครู",
        level: "ชำนาญการ",
        subjectGroup: "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const cmp = comparePersonnelDeterministic(user1, user2);
      assert.ok(cmp < 0, "'นางสาวกาญจนา' (กา) must sort before 'นายกิตติ' (กิ)");
    });
  });

  describe("A3. Personnel Tier Classification (Tiers 1..6)", () => {
    test("Tier 1: Government Civil Servants (ผอ., รอง ผอ., ครู, ครูผู้ช่วย)", () => {
      assert.equal(getPersonnelTier("ผู้อำนวยการ"), 1);
      assert.equal(getPersonnelTier("รองผู้อำนวยการ"), 1);
      assert.equal(getPersonnelTier("ครู"), 1);
      assert.equal(getPersonnelTier("ครูผู้ช่วย"), 1);
    });

    test("Tier 2: Government Employees (พนักงานราชการ)", () => {
      assert.equal(getPersonnelTier("พนักงานราชการ"), 2);
      assert.equal(getPersonnelTier("พนักงานราชการ (สอน)"), 2);
    });

    test("Tier 3: Permanent Employees (ลูกจ้างประจำ)", () => {
      assert.equal(getPersonnelTier("ลูกจ้างประจำ"), 3);
    });

    test("Tier 4: Temporary / Contract Employees (ลูกจ้างชั่วคราว, ครูอัตราจ้าง, จ้างเหมา)", () => {
      assert.equal(getPersonnelTier("ลูกจ้างชั่วคราว"), 4);
      assert.equal(getPersonnelTier("ครูอัตราจ้าง"), 4);
      assert.equal(getPersonnelTier("จ้างเหมาบริการ"), 4);
    });

    test("Tier 5: General Support Staff (เจ้าหน้าที่ธุรการ, สารบรรณ, etc.)", () => {
      assert.equal(getPersonnelTier("เจ้าหน้าที่ธุรการ / งานสารบรรณ"), 5);
      assert.equal(getPersonnelTier("เจ้าหน้าที่บุคคล"), 5);
    });

    test("Tier 6: Trainees / Interns (ฝึกสอน, ฝึกประสบการณ์, นักศึกษา) ALWAYS at the very bottom", () => {
      assert.equal(getPersonnelTier("นักศึกษาฝึกประสบการณ์"), 6);
      assert.equal(getPersonnelTier("นักศึกษาฝึกสอน"), 6);
      assert.equal(getPersonnelTier("นักศึกษา"), 6);
      assert.equal(getPersonnelTier("ฝึกประสบการณ์วิชาชีพ"), 6);
    });
  });

  describe("A4. NaN-Safe Font Size Sanitizer", () => {
    test("Clamps valid numbers within 8-32 px", () => {
      assert.equal(sanitizeFontSize(8), 8);
      assert.equal(sanitizeFontSize(13), 13);
      assert.equal(sanitizeFontSize(16), 16);
      assert.equal(sanitizeFontSize(32), 32);
      assert.equal(sanitizeFontSize(12.6), 13); // rounds
    });

    test("Clamps out-of-bounds numbers to MIN or MAX", () => {
      assert.equal(sanitizeFontSize(4), 8); // clamped to MIN
      assert.equal(sanitizeFontSize(-10), 8);
      assert.equal(sanitizeFontSize(50), 32); // clamped to MAX
      assert.equal(sanitizeFontSize(999), 32);
    });

    test("Parses numeric string representations correctly", () => {
      assert.equal(sanitizeFontSize("14"), 14);
      assert.equal(sanitizeFontSize(" 16 "), 16);
      assert.equal(sanitizeFontSize("8"), 8);
    });

    test("Gracefully falls back to default (13) for NaN, Infinity, non-numeric strings, and bad types", () => {
      assert.equal(sanitizeFontSize(NaN), FONT_DEFAULT);
      assert.equal(sanitizeFontSize(Infinity), FONT_DEFAULT);
      assert.equal(sanitizeFontSize(-Infinity), FONT_DEFAULT);
      assert.equal(sanitizeFontSize("abc"), FONT_DEFAULT);
      assert.equal(sanitizeFontSize(""), FONT_DEFAULT);
      assert.equal(sanitizeFontSize(null), FONT_DEFAULT);
      assert.equal(sanitizeFontSize(undefined), FONT_DEFAULT);
      assert.equal(sanitizeFontSize({}), FONT_DEFAULT);
    });
  });

  describe("A5. Deterministic Tie-Breaking", () => {
    test("Falls back to userId comparison when Tier, Rank, Level, and Name are identical", () => {
      const userA = {
        userId: "user_001",
        userName: "นายสมใจ ดีงาม",
        position: "ครู",
        level: "ชำนาญการ",
        subjectGroup: "คณิตศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const userB = {
        userId: "user_002",
        userName: "นายสมใจ ดีงาม",
        position: "ครู",
        level: "ชำนาญการ",
        subjectGroup: "คณิตศาสตร์",
        totalTimes: 0,
        totalDays: 0,
        byType: {}
      };

      const cmp = comparePersonnelDeterministic(userA, userB);
      assert.ok(cmp < 0, "Tie breaks on userId: user_001 comes before user_002");
    });
  });
});
