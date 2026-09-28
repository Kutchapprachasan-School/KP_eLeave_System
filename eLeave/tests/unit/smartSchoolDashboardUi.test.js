import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("Smart School Dashboard UI Invariants", async (t) => {
  await t.test("DashboardShell has Smart School Hero Banner and Segmented Navigation", () => {
    const shellPath = path.join(
      rootDir,
      "src/app/(app)/dashboard/_components/DashboardShell.tsx"
    );
    const content = fs.readFileSync(shellPath, "utf-8");

    // 1. Hero Welcome Banner
    assert.match(
      content,
      /ระบบบริหารจัดการสถานศึกษาอัจฉริยะ · Smart School/,
      "Hero banner must include Smart School badge"
    );
    assert.match(
      content,
      /ยินดีต้อนรับสู่/,
      "Hero banner must include welcome heading"
    );
    assert.match(
      content,
      /วิสัยทัศน์สถานศึกษา/,
      "Hero banner must include school vision section"
    );
    assert.match(
      content,
      /การศึกษา คือ รากฐานของอนาคตที่มั่นคง/,
      "Hero banner must include educational motto"
    );

    // 2. Quick action shortcuts
    assert.match(
      content,
      /href="\/request"/,
      "Hero banner must include quick link to leave request"
    );
    assert.match(
      content,
      /href="\/history"/,
      "Hero banner must include quick link to leave history"
    );
    assert.match(
      content,
      /href="\/reports"/,
      "Hero banner must include quick link to reports"
    );

    // 3. Segmented Subsystem Switcher Tabs
    assert.match(
      content,
      /SYSTEM_ICONS/,
      "DashboardShell must declare subsystem icons"
    );
    assert.match(
      content,
      /handleSystemChange/,
      "DashboardShell must handle smooth subsystem view switching"
    );
  });

  await t.test("LeaveDashboardClient includes Smart School KPI Cards & Subsystem Grid", () => {
    const clientPath = path.join(
      rootDir,
      "src/app/(app)/dashboard/_components/LeaveDashboardClient.tsx"
    );
    const content = fs.readFileSync(clientPath, "utf-8");

    // 1. KPI Cards layer
    assert.match(
      content,
      /KPI Cards Layer - Modern Smart School Style/,
      "LeaveDashboardClient must include upgraded KPI cards layer"
    );
    assert.match(
      content,
      /badgeStyle/,
      "KPI cards must support colored status badges"
    );
    assert.match(
      content,
      /iconBg/,
      "KPI cards must have icon squircle styling"
    );

    // 2. Subsystem Overview Cards
    assert.match(
      content,
      /โมดูลบริการส่วนกลางของโรงเรียน/,
      "Dashboard must include School Subsystem Overview section"
    );
    assert.match(
      content,
      /href="\/history"/,
      "Subsystem grid must link to leave module"
    );
    assert.match(
      content,
      /href="\/document"/,
      "Subsystem grid must link to document module"
    );
    assert.match(
      content,
      /href="\/facility"/,
      "Subsystem grid must link to facility module"
    );
    assert.match(
      content,
      /href="\/repair"/,
      "Subsystem grid must link to repair module"
    );
  });

  await t.test("Dashboard page passes schoolInfo and user props safely to DashboardShell", () => {
    const pagePath = path.join(
      rootDir,
      "src/app/(app)/dashboard/page.tsx"
    );
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.match(
      content,
      /schoolInfo=\{\{/,
      "DashboardPage must pass schoolInfo to DashboardShell"
    );
    assert.match(
      content,
      /user=\{\{/,
      "DashboardPage must pass user to DashboardShell"
    );
  });
});
