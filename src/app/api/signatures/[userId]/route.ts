import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface CachedSignature {
  buffer: Buffer;
  mimeType: string;
  etag: string;
  timestamp: number;
}

// In-Memory Fast Cache (Ultra-fast < 1ms response for Batch PDF print & normal views)
const signatureMemoryCache = new Map<string, CachedSignature>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getSupabaseClient() {
  const supaUrl = process.env.SUPABASE_URL || process.env.SUPABASE_FAILOVER_0_URL || "";
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_FAILOVER_0_KEY || "";
  if (!supaUrl || !supaKey) return null;
  return createClient(supaUrl, supaKey);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  if (!userId) {
    return new NextResponse("Bad Request: Missing userId", { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedKey = searchParams.get("key");
  const versionParam = searchParams.get("v") || "";

  const cacheKey = `${userId}:${requestedKey || "default"}:${versionParam}`;

  // 1. Check Fast Memory Cache
  const cached = signatureMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const clientEtag = request.headers.get("if-none-match");
    if (clientEtag && clientEtag === cached.etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": cached.mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "ETag": cached.etag,
        "Content-Length": String(cached.buffer.length),
        "Content-Disposition": "inline",
      },
    });
  }

  try {
    const supa = getSupabaseClient();
    if (!supa) {
      return new NextResponse("Storage service unavailable", { status: 503 });
    }

    let buffer: Buffer | null = null;
    let mimeType = "image/png";

    // Attempt 1: Direct signatures/${userId}/signature.png
    const primaryPath = `signatures/${userId}/signature.png`;
    const { data: primaryData, error: primaryErr } = await supa.storage.from("data1").download(primaryPath);

    if (primaryData && !primaryErr) {
      const arr = await primaryData.arrayBuffer();
      buffer = Buffer.from(arr);
      mimeType = "image/png";
    }

    // Attempt 2: If primary not found, list folder to find any signature file (e.g. sig_<timestamp>.png or .svg)
    if (!buffer) {
      const { data: listFiles } = await supa.storage.from("data1").list(`signatures/${userId}`);
      if (listFiles && listFiles.length > 0) {
        // Sort to get latest file
        const sorted = listFiles.filter(f => f.name && !f.name.startsWith(".")).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        const latestFileName = sorted[0]?.name || listFiles[0].name;
        const targetPath = `signatures/${userId}/${latestFileName}`;

        const { data: fallbackData } = await supa.storage.from("data1").download(targetPath);
        if (fallbackData) {
          const arr = await fallbackData.arrayBuffer();
          buffer = Buffer.from(arr);
          mimeType = targetPath.endsWith(".svg") ? "image/svg+xml" : "image/png";
        }
      }
    }

    // Attempt 3: If still not found in storage, check database for inline Base64/SVG fallback
    if (!buffer) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { signatureUrl: true },
      });

      if (user && user.signatureUrl) {
        const raw = user.signatureUrl.trim();
        if (raw.startsWith("<svg") || raw.includes("<svg")) {
          buffer = Buffer.from(raw, "utf8");
          mimeType = "image/svg+xml";
        } else if (raw.startsWith("data:image/svg+xml")) {
          const content = decodeURIComponent(raw.replace(/^data:image\/svg\+xml;[^,]*,/, ""));
          buffer = Buffer.from(content, "utf8");
          mimeType = "image/svg+xml";
        } else if (raw.startsWith("data:image/")) {
          const parts = raw.split(",");
          const base64Str = parts[1] || parts[0];
          buffer = Buffer.from(base64Str, "base64");
          const match = raw.match(/^data:([^;]+);/);
          if (match) mimeType = match[1];
        }
      }
    }

    if (!buffer || buffer.length === 0) {
      return new NextResponse("Signature not found", { status: 404 });
    }

    const etag = `"${crypto.createHash("md5").update(buffer).digest("hex")}"`;

    // Save to fast in-memory cache
    signatureMemoryCache.set(cacheKey, {
      buffer,
      mimeType,
      etag,
      timestamp: Date.now(),
    });

    const clientEtag = request.headers.get("if-none-match");
    if (clientEtag && clientEtag === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "ETag": etag,
        "Content-Length": String(buffer.length),
        "Content-Disposition": "inline",
      },
    });
  } catch (err: any) {
    console.error("[SignatureAPI] Unexpected error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
