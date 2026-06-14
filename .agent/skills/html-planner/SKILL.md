---
name: html-planner
description: Skill for generating HTML plans with a multi-agent review workflow.
---

# HTML Planner Skill

This skill enforces planning in HTML instead of Markdown, implementing a rigorous multi-agent review loop to catch critical issues and gaps before any code is written.

## Workflow Instructions

### 1. Draft the Initial HTML Plan
Create a file named `implementation_plan.html` inside the brain directory (or workspace). The HTML plan MUST be structured into two main sections:
1. **Section 1: สำหรับคนอ่าน (Human Reader Section):**
   - High-level visual explanation of features.
   - Flow and UI/UX impact.
   - Formatted using modern web design principles (clean CSS, harmonized colors, structured tables/lists) to be easily readable.
2. **Section 2: Technical/Implementation Plan (Technical Section):**
   - File-by-file changes.
   - Code logic to modify, add, or delete.
   - Verification and testing steps.

### 2. Spawn Reviewer Agents
Spawn 1-2 sub-agents using `invoke_subagent` (e.g. `PlanReviewer`) to critique the draft HTML plan.
- **Reviewer 1 (Logic & Edge Cases):** Focuses on logical flow, database constraints, error handling, performance issues, and general code architecture.
- **Reviewer 2 (Security & Concurrency/Parallelism):** Focuses on role access control, security vulnerabilities, database transactions, and identifying parts of the plan that can be run in parallel during implementation.

### 3. Review Process
- The sub-agents will read `implementation_plan.html` and reply with critical comments, gaps, or security issues they found.
- Each reviewer must evaluate:
  - Where the plan is lacking details.
  - What edge cases are unhandled (e.g. error boundary cases, invalid input formats, unverified roles).
  - Parallelism potential (which files can be modified concurrently without logical overlap).

### 4. Refinement & Fix Reporting
- The planner (you) compiles their feedback.
- Modify `implementation_plan.html` with fixes for all identified issues.
- Document exactly what was found and what was fixed in a summary.
- Output the finalized HTML plan (e.g. embedded or as a link) and the summary of changes to the user for approval.
