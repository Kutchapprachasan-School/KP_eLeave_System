import { NextResponse } from "next/server";
import {
  cleanupOrphanedAttachments,
  cleanupStaleUploads,
} from "@/services/storage/attachment-lifecycle.service";

/**
 * Invariant AG: Durable Scheduled Cleanup Worker.
 *
 * Called periodically (e.g. by Vercel Cron or external scheduler).
 * Protected via CRON_SECRET authorization header.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Process orphaned / stale leased attachments
    const orphanStats = await cleanupOrphanedAttachments();

    // 2. Process stale incomplete uploads
    const staleStats = await cleanupStaleUploads();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      orphans: orphanStats,
      staleUploads: staleStats,
    });
  } catch (error: any) {
    console.error("[AttachmentCleanupCron] Error during scheduled cleanup:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
