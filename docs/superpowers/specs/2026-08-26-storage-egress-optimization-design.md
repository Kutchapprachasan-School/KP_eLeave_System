# Technical Design Specification: Supabase Storage & Vector SVG Migration with Real-Time Egress Telemetry Monitor

**Date:** 2026-08-26  
**Status:** DRAFT - PENDING USER APPROVAL  
**Target:** eLeave System (KP e-Leave Platform)  
**Authors:** Senior Cloud Architect & QA Regression Lead

---

## 1. Overview & Goals

This specification details the end-to-end modernization of file storage, signature processing, and real-time data transfer telemetry for the eLeave platform.

### Key Objectives:
1. **Zero Database Bloat & 0 KB Image Egress in Neon:** Eliminate in-database Base64 storage for user signatures and leave attachments by shifting assets to Supabase Storage with CDN caching.
2. **100% Vector Quality Signatures:** Transition signature drawing to mathematical Vector SVG (Bezier curves), achieving infinite print/PDF sharpness at ~1-2 KB file size.
3. **100% Zero-Regression & Backward Compatibility:** Legacy Base64 records and new Supabase CDN URLs must render simultaneously without missing images or broken links.
4. **Resilient Multi-Tier Fallback:** If cloud storage is temporarily unreachable, system falls back to in-DB storage so user leave submissions NEVER fail.
5. **Real-time Egress & Data Transfer Monitor (Option 3):**
   - **Dev Floating Widget:** Real-time per-action payload size (KB) and latency monitor for local testing.
   - **Admin Telemetry Panel:** Aggregated reports in /logs & /settings showing top bandwidth consumers and anomaly alerts (>200 KB).

---

## 2. Architecture & Components

`
+-----------------------------------------------------------------------------------------+
|                                    APPLICATION CLIENT                                   |
|   - Leave Request Form (/request)         - Profile Signature Studio (/profile)         |
|   - Approvals & PDF Capture (/approvals)  - Leave History & Search (/history)          |
|   - Print Layouts (/print/leave/[id])     - Floating Dev Egress Meter (Dev Mode)       |
+--------------------------------------------+--------------------------------------------+
                                             │
                                             ▼
+-----------------------------------------------------------------------------------------+
|                           SERVER LAYER & STORAGE RESOLVER                               |
|   - Multi-Tier Resilient Storage Provider (Supabase -> Cloud Failover -> In-DB Base64)  |
|   - Vector SVG Sanitizer & Exporter (Strict XSS Filtering & Element Whitelist)          |
|   - Polymorphic Storage Resolver (Auto-detects Base64 Data URL vs CDN HTTP URL)        |
|   - Real-time Server Action Telemetry Middleware (Tracks Bytes In/Out & Latency)        |
+--------------------------------------------+--------------------------------------------+
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
+-------------------------------------------+ +-------------------------------------------+
|          SUPABASE OBJECT STORAGE          | |          NEON POSTGRESQL DATABASE         |
|  • Bucket 'signatures' (Public, CDN 1yr)  | |  • User (signatureUrl = "https://...")   |
|  • Bucket 'leave-attachments' (PDF/JPG)   | |  • LeaveRequest (documentUrl = "[...]")   |
|  • File Streaming & Secure Access         | |  • In-Memory Telemetry Ring Buffer        |
+-------------------------------------------+ +-------------------------------------------+
`

---

## 3. Detailed Component Specifications

### 3.1 Storage Provider & Multi-Tier Resilient Fallback
* **Buckets:**
  - signatures: Public read access, immutable cache header (Cache-Control: public, max-age=31536000, immutable).
  - leave-attachments: Private/Public upload for medical certificates and official memorandums.
* **Tier Fallback Flow:**
  - **Tier 1:** Primary Supabase Storage instance.
  - **Tier 2:** Secondary Failover Storage instance (if configured).
  - **Tier 3 (Emergency In-DB Fallback):** If all cloud uploads fail, automatically encodes file as Base64 Data URL and saves directly to PostgreSQL, ensuring the user's leave request is NEVER rejected.
  - **Tier 4 (Async Sync Worker):** Background sync reconciles any Tier 3 records to cloud storage when connection recovers.

### 3.2 Vector SVG Signature Engine
* **Capture:** Canvas records stroke points [{x, y}, ...] and converts to smooth quadratic/cubic Bezier SVG paths (<svg width="W" height="H" viewBox="0 0 W H"><path stroke="#0f172a" fill="none".../></svg>).
* **Security & XSS Prevention:** Server sanitizes all SVG strings, stripping <script>, <foreignObject>, and all on* event handlers.
* **Rendering:** Always rendered via <img src="..." crossOrigin="anonymous" /> which browsers isolate from script execution.

### 3.3 Polymorphic Storage & Attachment Resolver
* Unified resolver parseDocumentUrls(documentUrl) and esolveFileUrl(url):
  - Handles legacy Base64 (data:image/..., data:application/pdf...).
  - Handles new Supabase URLs (https://...supabase.co/...).
  - Handles JSON arrays of { name, url, preview }.
  - Handles comma-separated URL strings.

### 3.4 Automated PDF Generation Safety (Google Drive Sync)
* **Image Loading Waiter:** In src/app/(app)/approvals/page.tsx, the iframe automation awaits HTMLImageElement.complete for all signatures before executing html2canvas, preventing blank signature boxes in Google Drive PDFs.

### 3.5 Real-Time Egress & Data Transfer Monitor (Option 3)
1. **Telemetry Interceptor:** Lightweight Server Action & API wrapper measures response payload sizes (bytes) and execution durations (ms).
2. **Floating Dev Bar Widget (Local & Dev Mode):**
   - Renders at bottom-right corner during testing.
   - Shows live throughput (KB), action name, duration (ms), and color tag (🟢 <50KB, 🟡 50-200KB, 🔴 >200KB).
3. **Admin Telemetry Dashboard (in /logs & /settings):**
   - Top 5 heaviest actions ranked by bandwidth.
   - Real-time Neon Egress gauge meter (e.g. 2.1 GB / 5.0 GB).
   - Filterable request log with payload size breakdown.

---

## 4. Verification & Testing Strategy

1. **Automated Unit Tests:**
   - SVG Path generator & Sanitizer tests.
   - Polymorphic Storage Resolver tests (Base64 vs CDN vs JSON array).
   - Multi-tier fallback simulation tests.
2. **Browser End-to-End Verification:**
   - Draw Vector signature in /profile -> Verify Supabase upload & SVG sharpness.
   - Create leave request with PDF attachment in /request -> Verify Supabase upload & fallback.
   - Approve leave request in /approvals -> Verify Google Drive PDF contains complete crisp signatures.
   - View historical leaves in /history -> Verify legacy Base64 and new Supabase attachments open correctly.
   - Inspect live actions in the new Floating Dev Bar & Admin Telemetry Dashboard.
