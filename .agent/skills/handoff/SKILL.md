---
name: handoff
description: Use when ending a work session or transferring context, architecture decisions, database changes, user guidelines, and outstanding tasks to a new agent session.
---

# Handoff & Session Continuation Skill

## Overview
This skill provides a structured framework for summarizing a completed work session, recording prompt rules, technical conventions, database schema updates, UI/UX guidelines, and instructions for future AI pair programmers.

## When to Use
- When completing a complex feature implementation, bugfix iteration, or system refactoring.
- When generating session summaries, prompt rules, or architecture briefs for the next chat session.
- When handing off work to another agent or continuing in a fresh context window.

## Core Checklist for Handoff Summaries

### 1. Architectural & Database Conventions
- Document any new database fields or model changes in `prisma/schema.prisma`.
- Record raw SQL migration strategies used for production database compatibility.
- Note any specific transaction rules or query requirements (e.g. Exact `docType` queries vs array `in` queries).

### 2. Domain & Formatting Rules
- Document specific string formatting rules (e.g., Thai numerals vs Arabic, year format `TH_BE` vs `NONE`, circular prefix `ว` handling).
- Record exact visual constraints (e.g. section tag color fills, exact matching between settings preview and actual generated document numbers).

### 3. Verification & Safety Standards
- Always run `npm run build` to verify that all routes compile cleanly.
- Always commit and push changes to both remotes (`origin/main` and `school/main`).
- Never make unverified assertions of task completion without empirical log or build evidence.

---

## Handoff Summary Template

```markdown
# Session Handoff & Prompt Rules

## 1. Summary of Work Accomplished
- Detailed bullet points of key features, bug fixes, and refactorings.

## 2. Strict User Directives & Rules (Prompt Rules)
- Verbatim or distilled rules explicitly requested by the user.

## 3. Database & System Architecture Updates
- Model changes, migrations, server actions, and query constraints.

## 4. Key Code Locations & Formatting Engines
- Primary files modified and important functions.

## 5. Verification & Deployment Status
- Build status and git remote sync details.
```
