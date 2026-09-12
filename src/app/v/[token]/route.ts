import { NextRequest, NextResponse } from "next/server";
import { isValidVerificationTokenFormat } from "@/features/document/application/services/certificate-verification.service";

/**
 * ⚡ Ultra-Short Public Certificate Verification Route
 * Maps `/v/[token]` directly to `/verify/cert?token=[token]` via HTTP 307.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  if (!token || !isValidVerificationTokenFormat(token)) {
    const url = new URL("/verify/cert", request.url);
    url.searchParams.set("error", "INVALID_TOKEN");
    return NextResponse.redirect(url, 307);
  }

  const destination = new URL("/verify/cert", request.url);
  destination.searchParams.set("token", token);
  return NextResponse.redirect(destination, 307);
}
