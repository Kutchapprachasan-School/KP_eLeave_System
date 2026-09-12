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

  const destination = new URL("/verify/cert", request.url);
  if (token) {
    destination.searchParams.set("token", token);
  }
  if (!token || !isValidVerificationTokenFormat(token)) {
    destination.searchParams.set("error", "INVALID_TOKEN");
  }
  return NextResponse.redirect(destination, 307);
}
