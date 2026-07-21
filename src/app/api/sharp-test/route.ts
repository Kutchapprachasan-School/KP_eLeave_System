import { NextResponse } from "next/server";
import sharp from "sharp";

export async function GET() {
  try {
    console.log("Testing sharp load on server...");
    // Create a 10x10 red pixel image buffer
    const buffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .webp()
    .toBuffer();

    return NextResponse.json({
      success: true,
      message: "Sharp loaded and compressed successfully!",
      bufferLength: buffer.byteLength
    });
  } catch (err: any) {
    console.error("Sharp test failed:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Unknown error",
      stack: err.stack
    }, { status: 500 });
  }
}
