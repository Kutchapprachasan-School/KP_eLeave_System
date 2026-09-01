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

// In-Memory Fast Cache for Batch Printing (Prevents timeout when rendering 50-100 PDF pages)
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
  // 1. Authenticate Session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new NextResponse("Unauthorized: Signatures are protected and require a valid session", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { userId } = await context.params;
  if (!userId) {
    return new NextResponse("Bad Request: Missing userId", { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedKey = searchParams.get("key");
  const versionParam = searchParams.get("v") || "";

  const cacheKey = `${userId}:${requestedKey || "default"}:${versionParam}`;

  // 2. Check Memory Cache (Ultra-fast < 1ms response for Batch PDF print)
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
        "Cache-Control": "private, no-transform, max-age=86400, stale-while-revalidate=604800",
        "ETag": cached.etag,
        "Content-Length": String(cached.buffer.length),
        "Content-Disposition": "inline",
      },
    });
  }

  try {
    let signatureUrlOrKey = requestedKey;

    // If key not explicitly provided, look up from User record
    if (!signatureUrlOrKey) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { signatureUrl: true },
      });

      if (!user || !user.signatureUrl) {
        return new NextResponse("Signature not found", { status: 404 });
      }

      signatureUrlOrKey = user.signatureUrl.trim();
    }

    let buffer: Buffer;
    let mimeType = "image/png";

    // Handle Inline SVG / Data URL / Storage URL / Storage Key
    if (signatureUrlOrKey.startsWith("<svg") || signatureUrlOrKey.includes("<svg")) {
      buffer = Buffer.from(signatureUrlOrKey, "utf8");
      mimeType = "image/svg+xml";
    } else if (signatureUrlOrKey.startsWith("data:image/svg+xml")) {
      const rawContent = decodeURIComponent(signatureUrlOrKey.replace(/^data:image\/svg\+xml;[^,]*,/, ""));
      buffer = Buffer.from(rawContent, "utf8");
      mimeType = "image/svg+xml";
    } else if (signatureUrlOrKey.startsWith("data:image/")) {
      const parts = signatureUrlOrKey.split(",");
      const base64Str = parts[1] || parts[0];
      buffer = Buffer.from(base64Str, "base64");
      const match = signatureUrlOrKey.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    } else {
      // Storage Key or Supabase URL
      let storagePath = signatureUrlOrKey;
      if (storagePath.includes("/storage/v1/object/")) {
        const parts = storagePath.split("/storage/v1/object/");
        const afterObject = parts[1] || "";
        const segments = afterObject.replace(/^(public|sign)\//, "").split("/");
        const bucket = segments[0] || "data1";
        storagePath = segments.slice(1).join("/").split("?")[0];
      }

      const supa = getSupabaseClient();
      if (!supa) {
        return new NextResponse("Storage service unavailable", { status: 503 });
      }

      const { data, error } = await supa.storage.from("data1").download(storagePath);
      if (error || !data) {
        console.error("[SignatureAPI] Download error for", storagePath, error);
        return new NextResponse("Signature file not found in storage", { status: 404 });
      }

      const arrayBuffer = await data.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = storagePath.endsWith(".svg") ? "image/svg+xml" : "image/png";
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
        "Cache-Control": "private, no-transform, max-age=86400, stale-while-revalidate=604800",
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
