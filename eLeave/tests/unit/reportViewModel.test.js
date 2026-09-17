const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { buildExportViewModel } = require("../../../src/lib/report-export.ts");


describe("Report View Model Logic & Invariants", () => {
  const mockReport = {
    fiscalYear: 2569,
    cycle: "current",
    cycleLabelTh: "รอบปัจจุบัน ปีงบประมาณ 2569",
    staffCount: 3,
    canonicalTypes: [
      { type: "SICK", name: "ลาป่วย" },
      { type: "PERSONAL", name: "ลากิจส่วนตัว" },
      { type: "VACATION", name: "ลาพักผ่อน" },
      { type: "MATERNITY", name: "ลาคลอดบุตร" }
    ],
    users: [
      {
        userId: "u1",
        userName: "นาย ก. ขยันยิ่ง",
        position: "ครู",
        subjectGroup: "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
        totalTimes: 2,
        totalDays: 4,
        byType: {
          SICK: { times: 2, days: 4 },
          PERSONAL: { times: 0, days: 0 },
          VACATION: { times: 0, days: 0 },
          MATERNITY: { times: 0, days: 0 }
        }
      },
      {
        userId: "u2",
        userName: "นางสาว ข. ใจดี",
        position: "ครู",
        subjectGroup: "กลุ่มสาระการเรียนรู้ภาษาไทย",
        totalTimes: 0,
        totalDays: 0,
        byType: {
          SICK: { times: 0, days: 0 },
          PERSONAL: { times: 0, days: 0 },
          VACATION: { times: 0, days: 0 },
          MATERNITY: { times: 0, days: 0 }
        }
      },
      {
        userId: "u3",
        userName: "นาย ค. สดใส",
        position: "ครู",
        subjectGroup: "", // should fallback
        totalTimes: 1,
        totalDays: 2,
        byType: {
          SICK: { times: 0, days: 0 },
          PERSONAL: { times: 1, days: 2 },
          VACATION: { times: 0, days: 0 },
          MATERNITY: { times: 0, days: 0 }
        }
      }
    ]
  };

  test("Scope 'all' includes all staff with deterministic index", () => {
    const vm = buildExportViewModel(mockReport, {
      scope: "all",
      groupByGroup: false,
      hideUnusedTypes: false
    });
    assert.equal(vm.displayRows.length, 3);
    assert.equal(vm.totals.totalUsers, 3);
    assert.equal(vm.totals.totalTimes, 3);
    assert.equal(vm.totals.totalDays, 6);
    assert.equal(vm.visibleTypes.length, 4);
  });

  test("Scope 'only_leavers' filters out staff with 0 totalTimes", () => {
    const vm = buildExportViewModel(mockReport, {
      scope: "only_leavers",
      groupByGroup: false,
      hideUnusedTypes: false
    });
    assert.equal(vm.displayRows.length, 2);
    assert.equal(vm.totals.totalUsers, 2);
    assert.equal(vm.displayRows.some(u => u.userId === "u2"), false);
    assert.equal(vm.totals.totalTimes, 3);
    assert.equal(vm.totals.totalDays, 6);
  });

  test("Hide unused leave types removes VACATION & MATERNITY (where times === 0 across scope)", () => {
    const vm = buildExportViewModel(mockReport, {
      scope: "all",
      groupByGroup: false,
      hideUnusedTypes: true
    });
    assert.equal(vm.visibleTypes.length, 2);
    assert.deepEqual(vm.visibleTypes.map(t => t.type), ["SICK", "PERSONAL"]);
    assert.equal(vm.totals.byType.SICK.times, 2);
    assert.equal(vm.totals.byType.SICK.days, 4);
    assert.equal(vm.totals.byType.PERSONAL.times, 1);
    assert.equal(vm.totals.byType.PERSONAL.days, 2);
    assert.equal(vm.totals.byType.VACATION, undefined);
  });

  test("Grouping by subjectGroup sorts defined groups first and puts fallback group last", () => {
    const vm = buildExportViewModel(mockReport, {
      scope: "all",
      groupByGroup: true,
      hideUnusedTypes: true
    });
    assert.equal(vm.groupedRows.length, 3);
    assert.equal(vm.groupedRows[0].groupName, "กลุ่มสาระการเรียนรู้คณิตศาสตร์");
    assert.equal(vm.groupedRows[1].groupName, "กลุ่มสาระการเรียนรู้ภาษาไทย");
    assert.equal(vm.groupedRows[2].groupName, "ไม่ระบุกลุ่มสาระ/ฝ่ายงาน");
    assert.equal(vm.groupedRows[2].rows[0].userName, "นาย ค. สดใส");
  });

  test("Totals parity: sums in totals match sums in displayRows exactly", () => {
    const vm = buildExportViewModel(mockReport, {
      scope: "only_leavers",
      groupByGroup: true,
      hideUnusedTypes: true
    });
    const calculatedSumTimes = vm.displayRows.reduce((acc, r) => acc + r.totalTimes, 0);
    const calculatedSumDays = vm.displayRows.reduce((acc, r) => acc + r.totalDays, 0);
    assert.equal(vm.totals.totalTimes, calculatedSumTimes);
    assert.equal(vm.totals.totalDays, calculatedSumDays);
  });

  test("Excel Merges & AOA dimensions match visibleColumns dynamically", () => {
    const vm = buildExportViewModel(mockReport, {
      scope: "all",
      groupByGroup: false,
      hideUnusedTypes: true // 2 visible types (SICK, PERSONAL)
    });
    const totalCols = 4 + vm.visibleTypes.length * 2 + 2; // 4 + 4 + 2 = 10 cols
    assert.equal(totalCols, 10);

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
    ];
    for (let i = 0; i < vm.visibleTypes.length; i++) {
      const c = 4 + i * 2;
      merges.push({ s: { r: 3, c }, e: { r: 3, c: c + 1 } });
    }
    const grandTotalCol = 4 + vm.visibleTypes.length * 2;
    merges.push({ s: { r: 3, c: grandTotalCol }, e: { r: 3, c: grandTotalCol + 1 } });
    const summaryRowIdx = 5 + vm.displayRows.length;
    merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 3 } });

    assert.equal(merges.length, 6 + 2 + 1 + 1); // 10 merge ranges
    assert.equal(merges[merges.length - 1].e.c, 3);
  });
});
