#!/usr/bin/env node

/**
 * 🛡️ Automated Scope & Content Gatekeeper (School Operations Design System)
 * Strictly verifies that UI modifications are confined to the 4 whitelisted subsystems
 * and that no protected legacy modules (/leave, /attendance, /admin/users) are touched or imported.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ALLOWED_PREFIXES = [
  "src/components/shared-ui/school-ops/",
  "src/app/(app)/document/",
  "src/app/verify/cert/",
  "src/app/(app)/facility/",
  "src/app/supervision/",
  "src/app/(app)/academic/supervision/",
  "src/app/(app)/budget/",
  "eLeave/tests/unit/schoolOpsDesignSystem.test.js",
  "scripts/verify-ui-scope.mjs",
  "package.json",
  "docs/",
];

const FORBIDDEN_PREFIXES = [
  "src/app/(app)/leave/",
  "src/app/(app)/attendance/",
  "src/app/(app)/dashboard/",
  "src/app/(app)/admin/",
  "src/components/ui/",
  "prisma/",
];

const FORBIDDEN_IMPORT_PATTERNS = [
  /@\/app\/\(app\)\/leave/,
  /@\/app\/\(app\)\/attendance/,
  /@\/app\/\(app\)\/admin\/users/,
];

function normalizePath(p) {
  return p.replace(/\\/g, "/").trim();
}

function getChangedFiles(baseRef = "HEAD") {
  try {
    const output = execSync(`git diff --name-only ${baseRef}`, { encoding: "utf8" });
    const untracked = execSync(`git status --porcelain -u`, { encoding: "utf8" });
    
    const diffFiles = output.split("\n").map(normalizePath).filter(Boolean);
    const untrackedFiles = untracked
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("??"))
      .map((line) => normalizePath(line.substring(3).trim()));

    return [...new Set([...diffFiles, ...untrackedFiles])];
  } catch (err) {
    console.warn("⚠️ Git diff warning:", err.message);
    return [];
  }
}

function verifyScope(files) {
  console.log("🔍 Checking modified file paths against Senior Whitelist...\n");
  let hasViolations = false;

  for (const file of files) {
    if (!file) continue;

    // Check explicit forbidden prefixes
    const isForbidden = FORBIDDEN_PREFIXES.some((prefix) => file.startsWith(prefix));
    if (isForbidden) {
      console.error(`❌ [FORBIDDEN PATH VIOLATION]: ${file}`);
      console.error(`   This path is strictly protected and must NOT be touched by the Unified Design System.\n`);
      hasViolations = true;
      continue;
    }

    // Check allowlist
    const isAllowed = ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix));
    if (!isAllowed) {
      console.error(`❌ [UNAUTHORIZED PATH]: ${file}`);
      console.error(`   File is outside the 4 Whitelisted subsystems.\n`);
      hasViolations = true;
    } else {
      console.log(`  ✅ ${file}`);
    }
  }

  if (hasViolations) {
    console.error("\n💥 Scope verification FAILED! Revert unauthorized changes before proceeding.");
    process.exit(1);
  } else {
    console.log("\n🟢 [PASS] All modified files are strictly within allowed School-Ops boundaries.");
  }
}

function verifyDeepAudit(targetDirs = ["src/components/shared-ui/school-ops"]) {
  console.log("\n🔍 Running Content-Level Deep Audit (forbidden imports check)...");
  let hasImportViolations = false;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(tsx|ts|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
          if (pattern.test(content)) {
            console.error(`❌ [FORBIDDEN IMPORT DETECTED]: ${normalizePath(fullPath)} matches ${pattern}`);
            hasImportViolations = true;
          }
        }
      }
    }
  }

  for (const dir of targetDirs) {
    scanDir(dir);
  }

  if (hasImportViolations) {
    console.error("\n💥 Deep Audit FAILED! Remove forbidden imports.");
    process.exit(1);
  } else {
    console.log("🟢 [PASS] Zero forbidden legacy imports detected in target components.");
  }
}

// Execution
const isDeepAudit = process.argv.includes("--deep-audit");
const baseRef = process.argv.find((arg) => arg.startsWith("--base="))?.split("=")[1] || "HEAD";

const modifiedFiles = getChangedFiles(baseRef);
if (modifiedFiles.length === 0) {
  console.log("ℹ️ No modified files detected in current working tree.");
} else {
  verifyScope(modifiedFiles);
}

if (isDeepAudit) {
  verifyDeepAudit();
}
